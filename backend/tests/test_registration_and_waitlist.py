from app.extensions import db
from app.models import Activity, Proposal, User, Registration

def _setup_approved_event(client, rc_headers, admin_headers, org_id):
    # Organiser proposes an event
    payload = {
        "title": "Waitlist Test Event",
        "scale": "local_meetup",
        "city": "Hyderabad",
        "org_id": org_id,
        "starts_at": "2026-08-15T10:00:00",
        "venue": "Test Venue",
        "capacity": 1,
        "description": "Testing waitlist logic",
        "budget": [{"label": "Snacks", "planned": 500}],
    }
    res = client.post("/api/v1/activities", json=payload, headers=rc_headers)
    assert res.status_code == 201
    activity_id = res.get_json()["id"]

    # Admin approves it
    res = client.post(f"/api/v1/proposals/{activity_id}/decision",
                      json={"decision": "approve", "note": "LGTM"}, headers=admin_headers)
    assert res.status_code == 200
    
    return activity_id


def test_registration_and_waitlist_flow(client, app, student_headers, rc_headers, admin_headers):
    # Get org_id
    with app.app_context():
        from tests.conftest import org_id
        o_id = org_id()

        # Create another student for waitlist
        from werkzeug.security import generate_password_hash
        student2 = User(name="Bob", email="bob@ekatva.os",
                       password_hash=generate_password_hash("bob123"), role="student",
                       city="Hyderabad", region_id=o_id)
        db.session.add(student2)
        db.session.commit()
        
    res = client.post("/api/v1/auth/login", json={"email": "bob@ekatva.os", "password": "bob123"})
    student2_headers = {"Authorization": f"Bearer {res.get_json()['access_token']}"}

    # 1. Setup event with capacity 1
    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)

    # 2. Student 1 registers (should be confirmed)
    res = client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    assert res.status_code == 201
    assert res.get_json()["status"] == "confirmed"

    # 3. Student 2 registers (should be waitlisted because capacity is 1)
    res = client.post(f"/api/v1/events/{activity_id}/register", headers=student2_headers)
    assert res.status_code == 201
    assert res.get_json()["status"] == "waitlisted"

    # 4. Check roster
    res = client.get(f"/api/v1/events/{activity_id}/registrations", headers=rc_headers)
    roster = res.get_json()
    assert len(roster) == 2
    statuses = {r["student"]: r["status"] for r in roster}
    assert statuses["Arav"] == "confirmed"
    assert statuses["Bob"] == "waitlisted"

    # 5. Broadcast message (should be received by both or at least the event creates an announcement)
    res = client.post(f"/api/v1/events/{activity_id}/broadcast", 
                      json={"title": "Update", "body": "Hello"}, headers=rc_headers)
    assert res.status_code == 200

    res = client.get(f"/api/v1/events/{activity_id}/announcements", headers=student_headers)
    assert len(res.get_json()) == 1

    # 6. Student 1 unregisters (auto-promotes Student 2)
    res = client.delete(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    assert res.status_code == 200

    res = client.get(f"/api/v1/events/{activity_id}/registrations", headers=rc_headers)
    roster = res.get_json()
    assert len(roster) == 1
    assert roster[0]["student"] == "Bob"
    assert roster[0]["status"] == "confirmed"

    # 7. Check Student 2 notifications for auto-promotion
    res = client.get("/api/v1/notifications", headers=student2_headers)
    notifications = res.get_json()
    # Student 2 should have "You're on the waitlist", "Update" (broadcast), and "You're in!"
    titles = [n["title"] for n in notifications]
    assert "You're in!" in titles


def test_event_tags_fetching(client, app, rc_headers, admin_headers):
    # Setup event
    with app.app_context():
        from tests.conftest import org_id
        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)

    # In database, add tags manually (since API doesn't support setting them via proposal yet)
    with app.app_context():
        act = Activity.query.get(activity_id)
        act.tags = ["Testing", "Tagging"]
        db.session.commit()

    # Fetch feed
    res = client.get("/api/v1/events", headers=rc_headers)
    assert res.status_code == 200
    events = res.get_json()
    assert len(events) > 0
    event = [e for e in events if e["id"] == activity_id][0]
    assert "Testing" in event["tags"]
    assert "Tagging" in event["tags"]
