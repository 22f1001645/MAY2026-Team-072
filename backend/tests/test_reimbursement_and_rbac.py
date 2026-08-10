from app.models import Organisation, User, Registration, Attendance
from app.extensions import db


def _org_id():
    return Organisation.query.first().id


def _make_approved_activity(client, rc_headers, admin_headers):
    payload = {
        "title": "Reimbursement Test Meetup",
        "org_id": _org_id(),
        "city": "Hyderabad",
        "scale": "local_meetup",
        "venue": "Somewhere",
        "starts_at": "2026-10-05T17:30:00",
        "capacity": 30,
        "budget": [{"label": "Snacks", "planned": 5000}],
    }
    aid = client.post("/api/v1/activities", json=payload, headers=rc_headers).get_json()["id"]
    client.post(f"/api/v1/proposals/{aid}/decision",
                json={"decision": "approve", "note": ""}, headers=admin_headers)
    return aid


def test_reimbursement_pipeline_advances_in_order(client, rc_headers, admin_headers):
    aid = _make_approved_activity(client, rc_headers, admin_headers)
    
    # Register and check-in 25 attendees so max_allowed = 25 * 200 = 5000 (enough for 4200 expense)
    for i in range(25):
        uid = f"dummy_{aid}_{i}"
        if not User.query.get(uid):
            db.session.add(User(id=uid, email=f"{uid}@ds.study.iitm.ac.in", name=uid, role="student", password_hash="dummy"))
        r = Registration(activity_id=aid, student_id=uid)
        db.session.add(r)
        db.session.flush()
        db.session.add(Attendance(registration_id=r.id, checked_in_by="test"))
    db.session.commit()

    # Organiser submits an expense
    exp = client.post("/api/v1/expenses", json={
        "activity_id": aid, "label": "Snacks bill", "amount": 4200, "bill_name": "bill.pdf",
    }, headers=rc_headers)
    assert exp.status_code == 201
    eid = exp.get_json()["id"]
    assert exp.get_json()["status"] == "submitted"

    # Admin advances the pipeline: submitted → verified → approved → paid
    for expected in ["verified", "approved", "paid"]:
        res = client.patch(f"/api/v1/expenses/{eid}/verify", headers=admin_headers)
        if res.status_code != 200:
            print("ERROR response:", res.get_json())
        assert res.status_code == 200
        assert res.status_code == 200
        assert res.get_json()["status"] == expected

    # One more advance is a conflict (already paid)
    assert client.patch(f"/api/v1/expenses/{eid}/verify", headers=admin_headers).status_code == 409


def test_student_cannot_verify_reimbursement(client, rc_headers, admin_headers, student_headers):
    aid = _make_approved_activity(client, rc_headers, admin_headers)
    eid = client.post("/api/v1/expenses", json={
        "activity_id": aid, "label": "x", "amount": 100,
    }, headers=rc_headers).get_json()["id"]
    assert client.patch(f"/api/v1/expenses/{eid}/verify", headers=student_headers).status_code == 403


def test_student_cannot_reach_admin_analytics(client, student_headers):
    assert client.get("/api/v1/analytics", headers=student_headers).status_code == 403


def test_admin_analytics_reports_fee_utilisation(client, admin_headers):
    res = client.get("/api/v1/analytics", headers=admin_headers)
    assert res.status_code == 200
    body = res.get_json()
    assert "totals" in body and "fee_util_pct" in body["totals"]


def test_leaderboard_is_accessible_to_students(client, student_headers):
    res = client.get("/api/v1/leaderboard?city=Hyderabad", headers=student_headers)
    assert res.status_code == 200
    assert isinstance(res.get_json(), list)


def test_expense_with_social_post_link(client, rc_headers, admin_headers):
    aid = _make_approved_activity(client, rc_headers, admin_headers)
    payload = {
        "activity_id": aid,
        "label": "Marketing materials",
        "amount": 500,
        "social_post_link": "https://instagram.com/ekatva"
    }
    exp_res = client.post("/api/v1/expenses", json=payload, headers=rc_headers)
    assert exp_res.status_code == 201
    data = exp_res.get_json()
    assert data["social_post_link"] == "https://instagram.com/ekatva"
