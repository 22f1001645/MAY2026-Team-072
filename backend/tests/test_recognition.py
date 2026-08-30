from app.extensions import db
from app.models import Activity, Registration, User


def _meetup_head_id():
    return User.query.filter_by(email="head@ekatva.os").first().id


def test_leaderboard_and_points(client, app, student_headers, rc_headers, admin_headers):
    # Fetch initial points before doing anything
    initial_res = client.get("/api/v1/me/points", headers=student_headers)
    initial_total = initial_res.get_json()["total"]

    # Setup event
    with app.app_context():
        from tests.conftest import org_id
        o_id = org_id()

    payload = {
        "title": "Points Test Event",
        "scale": "local_meetup",
        "city": "Hyderabad",
        "org_id": o_id,
        "starts_at": "2026-08-15T10:00:00",
        "ends_at": "2026-08-15T12:00:00",
        "venue": "Test Venue",
        "capacity": 50,
        "description": "Testing points logic",
        "budget": [{"label": "Snacks", "planned": 500}],
        # The student sits on the crew roster because this test later awards them
        # volunteer points, and TEAM-04 (plan 05-05) refuses an award to anyone
        # without an ActivityTeamMember row on this activity.
        "team": [
            {"user_id": _meetup_head_id(), "role": "Meetup Head"},
            {"user_id": User.query.filter_by(email="arav@ekatva.os").first().id,
             "role": "Logistics"},
        ],
        "collaborating_org_ids": [],
    }

    res = client.post("/api/v1/activities", json=payload, headers=rc_headers)
    activity_id = res.get_json()["id"]

    res = client.post(f"/api/v1/proposals/{activity_id}/decision",
                      json={"decision": "approve", "note": "LGTM"}, headers=admin_headers)

    # Student registers
    res = client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    assert res.status_code == 201

    # RC checks in the student
    with app.app_context():
        reg = Registration.query.filter_by(activity_id=activity_id).first()
        reg_id = reg.id

    res = client.post(f"/api/v1/events/{activity_id}/attendance", 
                      json={"registration_ids": [reg_id]}, headers=rc_headers)
    assert res.status_code == 200

    # RC awards volunteer points to student
    with app.app_context():
        # No local `from app.models import User` here: the module already imports
        # it, and a function-local import makes the name local to the whole
        # function, so the payload above could not use it.
        student_id = User.query.filter_by(email="arav@ekatva.os").first().id

    res = client.post(f"/api/v1/events/{activity_id}/volunteer",
                      json={"user_id": student_id, "role_name": "Event Photographer"}, headers=rc_headers)
    assert res.status_code == 200

    # Check student points ledger
    res = client.get("/api/v1/me/points", headers=student_headers)
    assert res.status_code == 200
    ledger = res.get_json()
    assert ledger["total"] == initial_total + 50  # 30 for attend, 20 for volunteer
    assert len(ledger["entries"]) >= 2

    # Check leaderboard overall
    res = client.get("/api/v1/leaderboard", headers=student_headers)
    assert res.status_code == 200
    lb = res.get_json()
    assert len(lb) > 0
    # Arav should have 50 additional points
    arav_entry = [r for r in lb if r["name"] == "Arav"][0]
    assert arav_entry["points"] == initial_total + 50
    assert arav_entry["attended"] == 1
    
    # Check leaderboard scoped by city
    res = client.get("/api/v1/leaderboard?city=Chennai", headers=student_headers)
    assert res.status_code == 200
    lb_chennai = res.get_json()
    # Arav is in Hyderabad, shouldn't appear in Chennai leaderboard
    assert len([r for r in lb_chennai if r["name"] == "Arav"]) == 0
