from app.extensions import db
from app.models import Activity, Proposal, User, Registration, Organisation


def _meetup_head_id():
    return User.query.filter_by(email="head@ekatva.os").first().id


def _setup_approved_event(client, rc_headers, admin_headers, org_id):
    # Organiser proposes an event
    payload = {
        "title": "Waitlist Test Event",
        "scale": "local_meetup",
        "city": "Hyderabad",
        "org_id": org_id,
        "starts_at": "2026-09-15T10:00:00",
        "venue": "Test Venue",
        "capacity": 1,
        "description": "Testing waitlist logic",
        "budget": [{"label": "Snacks", "planned": 200}],
        "team": [{"user_id": _meetup_head_id(), "role": "Meetup Head"}],
        "collaborating_org_ids": [],
    }

    res = client.post("/api/v1/activities", json=payload, headers=rc_headers)
    if res.status_code != 201:
        print("ERROR CODE:", res.get_json().get("code"))
        print("ERROR MSG:", str(res.get_json().get("message")).encode('utf-8'))
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


def test_unregister_sends_cancellation_notification(client, app, student_headers, rc_headers, admin_headers):
    with app.app_context():
        from tests.conftest import org_id
        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)

    res = client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    assert res.status_code == 201

    res = client.delete(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    assert res.status_code == 200

    res = client.get("/api/v1/notifications", headers=student_headers)
    titles = [n["title"] for n in res.get_json()]
    assert "Registration Cancelled" in titles


def test_register_rejects_cancelled_event(client, app, student_headers, rc_headers, admin_headers):
    with app.app_context():
        from tests.conftest import org_id
        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)

    res = client.delete(f"/api/v1/events/{activity_id}", headers=rc_headers)
    assert res.status_code == 200

    res = client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    assert res.status_code == 400
    assert res.get_json()["code"] == "event_cancelled"


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

def test_invite_friend(client, app, student_headers, admin_headers, rc_headers):
    # Setup an event
    with app.app_context():
        from app.models import User, Organisation
        o_id = Organisation.query.filter_by(name="Hyderabad Regional Chapter").first().id
        s_id = User.query.filter_by(email="arav@ekatva.os").first().id
        s2 = User.query.filter_by(email="crew@ekatva.os").first()
        s2_id = s2.id

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)

    # Student 1 invites Student 2
    res = client.post(f"/api/v1/events/{activity_id}/invite", json={"user_id": s2_id}, headers=student_headers)
    assert res.status_code == 201
    assert res.get_json()["type"] == "invite"

    # Verify notification was created for Student 2
    with app.app_context():
        from app.models import Notification
        notifs = Notification.query.filter_by(user_id=s2_id).all()
        assert len(notifs) >= 1
        invite_notifs = [n for n in notifs if n.type == "invite"]
        assert len(invite_notifs) == 1
        notif = invite_notifs[0]
        assert "invited you to" in notif.title
        assert activity_id in notif.action_url
