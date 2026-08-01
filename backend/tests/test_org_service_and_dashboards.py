"""Additional test coverage for Org management, POR assignments, role-based dashboards,
and registration edge cases (capacity, unregistering, broadcasting)."""
from app.models import User, Organisation, Activity, Registration, PORAssignment


def test_create_org_by_admin(client, admin_headers):
    res = client.post(
        "/api/v1/orgs",
        json={"name": "Coding Club", "type": "society", "city": "Chennai"},
        headers=admin_headers,
    )
    assert res.status_code == 201
    body = res.get_json()
    assert body["name"] == "Coding Club"
    assert body["type"] == "society"


def test_create_org_by_student_forbidden(client, student_headers):
    res = client.post(
        "/api/v1/orgs",
        json={"name": "Illegal Org", "type": "society", "city": "Chennai"},
        headers=student_headers,
    )
    assert res.status_code == 403


def test_assign_por_to_member(client, admin_headers):
    student = User.query.filter_by(email="arav@ekatva.os").first()
    org = Organisation.query.first()
    
    res = client.post(
        f"/api/v1/orgs/{org.id}/pors",
        json={"user_id": student.id, "por_type": "Event Lead", "term": "May 2026"},
        headers=admin_headers,
    )
    assert res.status_code == 201
    body = res.get_json()
    assert body["por_type"] == "Event Lead"
    assert body["member"] == "Arav"


def test_assign_por_invalid_org_or_user(client, admin_headers):
    student = User.query.filter_by(email="arav@ekatva.os").first()
    res = client.post(
        "/api/v1/orgs/nonexistent_id/pors",
        json={"user_id": student.id, "por_type": "Event Lead"},
        headers=admin_headers,
    )
    assert res.status_code == 404

    org = Organisation.query.first()
    res = client.post(
        f"/api/v1/orgs/{org.id}/pors",
        json={"user_id": "nonexistent_user", "por_type": "Event Lead"},
        headers=admin_headers,
    )
    assert res.status_code == 404


def test_list_pors(client, admin_headers):
    res = client.get("/api/v1/pors", headers=admin_headers)
    assert res.status_code == 200
    assert isinstance(res.get_json(), list)


def test_dashboard_surfaces(client, student_headers, rc_headers, admin_headers):
    # Student Dashboard
    s_res = client.get("/api/v1/dashboard", headers=student_headers)
    assert s_res.status_code == 200
    assert s_res.get_json()["role"] == "student"

    # Organiser Dashboard
    o_res = client.get("/api/v1/dashboard", headers=rc_headers)
    assert o_res.status_code == 200
    assert o_res.get_json()["role"] == "organiser"

    # Admin Dashboard
    a_res = client.get("/api/v1/dashboard", headers=admin_headers)
    assert a_res.status_code == 200
    assert a_res.get_json()["role"] == "admin"


def test_unregister_flow(client, student_headers, rc_headers, admin_headers):
    # Create and approve an event
    payload = {
        "title": "Unregister Test Event",
        "org_id": Organisation.query.first().id,
        "city": "Hyderabad",
        "scale": "local_meetup",
        "venue": "Test Venue",
        "starts_at": "2026-11-01T10:00:00",
        "capacity": 10,
    }
    aid = client.post("/api/v1/activities", json=payload, headers=rc_headers).get_json()["id"]
    client.post(f"/api/v1/proposals/{aid}/decision", json={"decision": "approve", "note": ""}, headers=admin_headers)

    # Register
    client.post(f"/api/v1/events/{aid}/register", headers=student_headers)
    
    # Unregister
    unreg = client.delete(f"/api/v1/events/{aid}/register", headers=student_headers)
    assert unreg.status_code == 200
    assert unreg.get_json()["ok"] is True

    # Unregistering again fails with 404
    again = client.delete(f"/api/v1/events/{aid}/register", headers=student_headers)
    assert again.status_code == 404


def test_broadcast_notifications(client, rc_headers, admin_headers, student_headers):
    payload = {
        "title": "Broadcast Test Event",
        "org_id": Organisation.query.first().id,
        "city": "Hyderabad",
        "scale": "local_meetup",
        "venue": "Test Venue",
        "starts_at": "2026-11-05T10:00:00",
        "capacity": 10,
    }
    aid = client.post("/api/v1/activities", json=payload, headers=rc_headers).get_json()["id"]
    client.post(f"/api/v1/proposals/{aid}/decision", json={"decision": "approve", "note": ""}, headers=admin_headers)
    client.post(f"/api/v1/events/{aid}/register", headers=student_headers)

    # Broadcast as Organiser
    bc = client.post(
        f"/api/v1/events/{aid}/broadcast",
        json={"title": "Venue Change", "body": "We moved to Hall B"},
        headers=rc_headers,
    )
    assert bc.status_code == 200
    assert bc.get_json()["sent"] == 1

    # Student checks notification inbox
    nots = client.get("/api/v1/notifications", headers=student_headers)
    assert nots.status_code == 200
    assert any(n["title"] == "Venue Change" for n in nots.get_json())


def test_registration_capacity_limit(client, rc_headers, admin_headers, student_headers):
    payload = {
        "title": "Tiny Event",
        "org_id": Organisation.query.first().id,
        "city": "Hyderabad",
        "scale": "local_meetup",
        "venue": "Small Room",
        "starts_at": "2026-12-01T10:00:00",
        "capacity": 1,
    }
    aid = client.post("/api/v1/activities", json=payload, headers=rc_headers).get_json()["id"]
    client.post(f"/api/v1/proposals/{aid}/decision", json={"decision": "approve", "note": ""}, headers=admin_headers)

    # First registration succeeds
    reg1 = client.post(f"/api/v1/events/{aid}/register", headers=student_headers)
    assert reg1.status_code == 201

    # Register second user (RC also acts as student for this test)
    reg2 = client.post(f"/api/v1/events/{aid}/register", headers=rc_headers)
    assert reg2.status_code == 409
    assert reg2.get_json()["code"] == "at_capacity"


def test_post_event_report_flow(client, rc_headers, admin_headers, student_headers):
    payload = {
        "title": "Report Test Event",
        "org_id": Organisation.query.first().id,
        "city": "Hyderabad",
        "scale": "local_meetup",
        "venue": "Venue",
        "starts_at": "2026-11-10T10:00:00",
        "capacity": 10,
    }
    aid = client.post("/api/v1/activities", json=payload, headers=rc_headers).get_json()["id"]
    client.post(f"/api/v1/proposals/{aid}/decision", json={"decision": "approve", "note": ""}, headers=admin_headers)

    # Organiser files report
    rep = client.post(
        f"/api/v1/activities/{aid}/report",
        json={"summary": "Event went smoothly with 25 attendees."},
        headers=rc_headers,
    )
    assert rep.status_code == 201
    assert rep.get_json()["summary"] == "Event went smoothly with 25 attendees."

    # Fetch report
    get_rep = client.get(f"/api/v1/activities/{aid}/report", headers=student_headers)
    assert get_rep.status_code == 200
    assert get_rep.get_json()["summary"] == "Event went smoothly with 25 attendees."


def test_award_volunteer_points_flow(client, rc_headers, admin_headers, student_headers):
    payload = {
        "title": "Volunteer Test Event",
        "org_id": Organisation.query.first().id,
        "city": "Hyderabad",
        "scale": "local_meetup",
        "venue": "Venue",
        "starts_at": "2026-11-15T10:00:00",
        "capacity": 10,
    }
    aid = client.post("/api/v1/activities", json=payload, headers=rc_headers).get_json()["id"]
    client.post(f"/api/v1/proposals/{aid}/decision", json={"decision": "approve", "note": ""}, headers=admin_headers)
    student = User.query.filter_by(email="arav@ekatva.os").first()

    # Award volunteer points
    v_res = client.post(
        f"/api/v1/events/{aid}/volunteer",
        json={"user_id": student.id, "role_name": "Stage Manager"},
        headers=rc_headers,
    )
    assert v_res.status_code == 200
    assert v_res.get_json()["points"] == 20

    # Student checks ledger
    pts = client.get("/api/v1/me/points", headers=student_headers).get_json()
    assert any(e["action"] == "volunteered" for e in pts["entries"])


def test_global_audit_log(client, admin_headers):
    res = client.get("/api/v1/audit-log", headers=admin_headers)
    assert res.status_code == 200
    assert isinstance(res.get_json(), list)


def test_deactivate_por(client, admin_headers):
    por = PORAssignment.query.first()
    res = client.patch(f"/api/v1/pors/{por.id}/deactivate", headers=admin_headers)
    assert res.status_code == 200
    assert res.get_json()["active"] is False


def test_bulk_verify_expenses(client, rc_headers, admin_headers):
    payload = {
        "title": "Bulk Verify Event",
        "org_id": Organisation.query.first().id,
        "city": "Hyderabad",
        "scale": "local_meetup",
        "venue": "Venue",
        "starts_at": "2026-11-20T10:00:00",
        "capacity": 10,
    }
    aid = client.post("/api/v1/activities", json=payload, headers=rc_headers).get_json()["id"]
    client.post(f"/api/v1/proposals/{aid}/decision", json={"decision": "approve", "note": ""}, headers=admin_headers)

    # Submit 2 expenses
    exp1 = client.post("/api/v1/expenses", json={"activity_id": aid, "label": "E1", "amount": 500}, headers=rc_headers).get_json()["id"]
    exp2 = client.post("/api/v1/expenses", json={"activity_id": aid, "label": "E2", "amount": 800}, headers=rc_headers).get_json()["id"]

    # Bulk verify
    res = client.patch("/api/v1/expenses/bulk-verify", json={"expense_ids": [exp1, exp2]}, headers=admin_headers)
    assert res.status_code == 200
    assert len(res.get_json()) == 2
    assert all(e["status"] == "verified" for e in res.get_json())


def test_duplicate_secretary_assignment_blocked(client, admin_headers):
    house = Organisation.query.filter_by(type="house").first()
    student = User.query.filter_by(role="student").first()

    # First assignment
    res1 = client.post(
        f"/api/v1/orgs/{house.id}/pors",
        json={"user_id": student.id, "por_type": "House Secretary", "term": "May 2026"},
        headers=admin_headers,
    )
    assert res1.status_code in [201, 409]

    # Duplicate assignment attempt for same house
    res2 = client.post(
        f"/api/v1/orgs/{house.id}/pors",
        json={"user_id": student.id, "por_type": "House Secretary", "term": "May 2026"},
        headers=admin_headers,
    )
    assert res2.status_code == 409
    assert res2.get_json()["code"] == "slot_already_filled"


def test_duplicate_rc_assignment_blocked(client, admin_headers):
    house = Organisation.query.filter_by(type="house").first()
    region = Organisation.query.filter_by(type="region").first()
    student = User.query.filter_by(role="student").first()

    # First RC assignment
    res1 = client.post(
        f"/api/v1/orgs/{house.id}/pors",
        json={"user_id": student.id, "por_type": "Regional Coordinator", "term": "May 2026", "region_id": region.id},
        headers=admin_headers,
    )
    assert res1.status_code in [201, 409]

    # Duplicate RC assignment attempt for same house + region
    res2 = client.post(
        f"/api/v1/orgs/{house.id}/pors",
        json={"user_id": student.id, "por_type": "Regional Coordinator", "term": "May 2026", "region_id": region.id},
        headers=admin_headers,
    )
    assert res2.status_code == 409
    assert res2.get_json()["code"] == "rc_slot_already_filled"
