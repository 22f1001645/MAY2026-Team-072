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
