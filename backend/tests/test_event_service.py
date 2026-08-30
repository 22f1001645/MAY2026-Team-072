import pytest
from datetime import datetime, timezone, timedelta
from app.services.event_service import edit_event, cancel_event
from app.errors import ApiError
from app.models import Activity, Registration, Notification, AuditLog, User
from app.constants import EVENT_UPCOMING, EVENT_CANCELLED
from app.extensions import db

def test_edit_event_success(app):
    with app.app_context():
        # Setup mock activity and user
        admin = User.query.filter_by(role='admin').first()
        
        # Create a new activity instead of relying on existing ones that might have changed
        activity = Activity(
            title="Old Event",
            org_id="test_org",
            organiser_id=admin.id,
            city="Chennai",
            scale="local_meetup",
            venue="Old Venue",
            starts_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=2),
            capacity=100,
            status=EVENT_UPCOMING
        )
        db.session.add(activity)
        db.session.commit()
        
        # Add a registration to test notifications
        reg = Registration(
            student_id=admin.id,
            activity_id=activity.id,
            status="confirmed"
        )
        db.session.add(reg)
        db.session.commit()
        
        activity_id = activity.id
        
        # Action: Edit event
        data = {
            "title": "New Event Title",
            "description": "Updated desc",
            "starts_at": (datetime.now(timezone.utc) + timedelta(days=3)).isoformat().replace("+00:00", "Z"),
            "venue": "New Venue",
            "update_message": "Custom update message"
        }
        edited = edit_event(activity_id, data, admin)
        
        # Assertions
        assert edited.title == "New Event Title"
        assert edited.description == "Updated desc"
        assert edited.venue == "New Venue"
        
        # Check notifications
        notification = Notification.query.filter_by(activity_id=activity_id, type="update").first()
        assert notification is not None
        assert notification.body == "Custom update message"
        
        # Check audit log
        audit = AuditLog.query.filter_by(entity_id=activity_id, action="Edited event").first()
        assert audit is not None
        
def test_edit_event_not_found(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        with pytest.raises(ApiError) as exc:
            edit_event("invalid_id", {}, admin)
        assert exc.value.code == "not_found"

def test_edit_event_forbidden(app):
    with app.app_context():
        student = User.query.filter_by(role='student').first()
        
        activity = Activity(
            title="Old Event",
            org_id="test_org",
            organiser_id="someone_else",
            city="Chennai",
            scale="local_meetup",
            venue="Old Venue",
            starts_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=2),
            capacity=100,
            status=EVENT_UPCOMING
        )
        db.session.add(activity)
        db.session.commit()
        
        with pytest.raises(ApiError) as exc:
            edit_event(activity.id, {}, student)
        assert exc.value.code == "forbidden"
        
def test_edit_event_cancelled(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        activity = Activity(
            title="Cancelled Event",
            org_id="test_org",
            organiser_id=admin.id,
            city="Chennai",
            scale="local_meetup",
            venue="Old Venue",
            starts_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=2),
            capacity=100,
            status=EVENT_CANCELLED
        )
        db.session.add(activity)
        db.session.commit()
        
        with pytest.raises(ApiError) as exc:
            edit_event(activity.id, {}, admin)
        assert exc.value.code == "bad_request"

def test_cancel_event_success(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        
        activity = Activity(
            title="Event to Cancel",
            org_id="test_org",
            organiser_id=admin.id,
            city="Chennai",
            scale="local_meetup",
            venue="Old Venue",
            starts_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=2),
            capacity=100,
            status=EVENT_UPCOMING
        )
        db.session.add(activity)
        db.session.commit()
        
        cancelled = cancel_event(activity.id, admin)
        assert cancelled.status == EVENT_CANCELLED
        
def test_cancel_event_already_cancelled(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        activity = Activity(
            title="Already Cancelled Event",
            org_id="test_org",
            organiser_id=admin.id,
            city="Chennai",
            scale="local_meetup",
            venue="Old Venue",
            starts_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=2),
            capacity=100,
            status=EVENT_CANCELLED
        )
        db.session.add(activity)
        db.session.commit()
        
        with pytest.raises(ApiError) as exc:
            cancel_event(activity.id, admin)
        assert exc.value.code == "bad_request"


def _meetup_head_id():
    return User.query.filter_by(email="head@ekatva.os").first().id


def _setup_approved_event(client, rc_headers, admin_headers, org_id):
    payload = {
        "title": "Editable Event",
        "scale": "local_meetup",
        "city": "Hyderabad",
        "org_id": org_id,
        "starts_at": "2026-08-15T10:00:00",
        "ends_at": "2026-08-15T12:00:00",
        "venue": "Original Venue",
        "capacity": 50,
        "description": "Testing event edit/cancel",
        "budget": [{"label": "Snacks", "planned": 500}],
        "team": [{"user_id": _meetup_head_id(), "role": "Meetup Head"}],
        "collaborating_org_ids": [],
    }
    res = client.post("/api/v1/activities", json=payload, headers=rc_headers)
    assert res.status_code == 201
    activity_id = res.get_json()["id"]

    res = client.post(
        f"/api/v1/proposals/{activity_id}/decision",
        json={"decision": "approve", "note": "LGTM"},
        headers=admin_headers,
    )
    assert res.status_code == 200
    return activity_id


def test_edit_changes_fields_notifies_on_venue_change_and_writes_audit(
    client, app, rc_headers, admin_headers, student_headers
):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)

    res = client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)
    assert res.status_code == 201

    with app.app_context():
        audit_before = AuditLog.query.count()

    res = client.put(
        f"/api/v1/events/{activity_id}",
        json={"venue": "New Venue"},
        headers=rc_headers,
    )
    assert res.status_code == 200
    assert res.get_json()["venue"] == "New Venue"

    with app.app_context():
        assert AuditLog.query.count() == audit_before + 1
        notif = Notification.query.filter_by(activity_id=activity_id, type="update").first()
        assert notif is not None
        assert "venue" in notif.body


def test_edit_without_time_or_venue_change_sends_no_notification(
    client, app, rc_headers, admin_headers, student_headers
):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)
    client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)

    res = client.put(
        f"/api/v1/events/{activity_id}",
        json={"description": "Just a wording tweak"},
        headers=rc_headers,
    )
    assert res.status_code == 200

    with app.app_context():
        assert Notification.query.filter_by(activity_id=activity_id, type="update").count() == 0


def test_student_cannot_edit_or_cancel_event(client, app, rc_headers, admin_headers, student_headers):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)

    res = client.put(f"/api/v1/events/{activity_id}", json={"venue": "Nope"}, headers=student_headers)
    assert res.status_code == 403

    res = client.delete(f"/api/v1/events/{activity_id}", headers=student_headers)
    assert res.status_code == 403


def test_cancel_sets_status_and_notifies_registrants(client, app, rc_headers, admin_headers, student_headers):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)
    client.post(f"/api/v1/events/{activity_id}/register", headers=student_headers)

    res = client.delete(f"/api/v1/events/{activity_id}", headers=rc_headers)
    assert res.status_code == 200
    assert res.get_json()["status"] == "cancelled"

    with app.app_context():
        activity = Activity.query.get(activity_id)
        assert activity.status == "cancelled"
        notif = Notification.query.filter_by(activity_id=activity_id, title=f"Event Cancelled: {activity.title}").first()
        assert notif is not None


def test_cannot_edit_or_cancel_an_already_cancelled_event(client, app, rc_headers, admin_headers):
    with app.app_context():
        from tests.conftest import org_id

        o_id = org_id()

    activity_id = _setup_approved_event(client, rc_headers, admin_headers, o_id)
    res = client.delete(f"/api/v1/events/{activity_id}", headers=rc_headers)
    assert res.status_code == 200

    res = client.put(f"/api/v1/events/{activity_id}", json={"venue": "Too late"}, headers=rc_headers)
    assert res.status_code == 400

    res = client.delete(f"/api/v1/events/{activity_id}", headers=rc_headers)
    assert res.status_code == 400
