import pytest
from app.services.attendance_service import check_in, scan_qr, award_volunteer_points
from app.errors import ApiError
from app.models import Activity, Registration, User, Attendance, ContributionPoint
from app.constants import EVENT_UPCOMING, POINTS
from app.extensions import db

def test_check_in_success(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        student = User.query.filter_by(role='student').first()
        
        activity = Activity(
            title="Check In Event",
            org_id="test_org",
            organiser_id=admin.id,
            city="Chennai",
            scale="local_meetup",
            venue="Old Venue",
            capacity=100,
            status=EVENT_UPCOMING
        )
        db.session.add(activity)
        db.session.commit()
        
        reg = Registration(
            student_id=student.id,
            activity_id=activity.id,
            status="confirmed"
        )
        db.session.add(reg)
        db.session.commit()
        
        # Action: Check in
        result = check_in(activity.id, [reg.id], admin)
        assert result["checked_in"] == 1
        
        # Verify idempotency
        result2 = check_in(activity.id, [reg.id], admin)
        assert result2["checked_in"] == 0
        
        # Verify points awarded
        pt = ContributionPoint.query.filter_by(user_id=student.id, activity_id=activity.id, action="attended").first()
        assert pt is not None
        assert pt.points == POINTS["attended"]

def test_check_in_event_not_found(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        with pytest.raises(ApiError) as exc:
            check_in("invalid", [], admin)
        assert exc.value.code == "event_not_found"

def test_scan_qr_success(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        student = User.query.filter_by(role='student').first()
        
        activity = Activity(
            title="QR Event",
            org_id="test_org",
            organiser_id=admin.id,
            city="Chennai",
            scale="local_meetup",
            venue="Old Venue",
            capacity=100,
            status=EVENT_UPCOMING
        )
        db.session.add(activity)
        db.session.commit()
        
        reg = Registration(
            student_id=student.id,
            activity_id=activity.id,
            status="confirmed",
            qr_token="valid_qr_token_123"
        )
        db.session.add(reg)
        db.session.commit()
        
        # Action: Scan QR
        result = scan_qr(activity.id, "valid_qr_token_123", admin)
        assert result["status"] == "success"
        
        # Duplicate scan
        result_dup = scan_qr(activity.id, "valid_qr_token_123", admin)
        assert result_dup["status"] == "duplicate"
        
def test_scan_qr_invalid(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        activity = Activity(
            title="QR Event 2",
            org_id="test_org",
            organiser_id=admin.id,
            city="Chennai",
            scale="local_meetup",
            venue="Old Venue",
            capacity=100,
            status=EVENT_UPCOMING
        )
        db.session.add(activity)
        db.session.commit()
        
        with pytest.raises(ApiError) as exc:
            scan_qr(activity.id, "bad_token", admin)
        assert exc.value.code == "invalid_qr"

def test_award_volunteer_points(app):
    with app.app_context():
        admin = User.query.filter_by(role='admin').first()
        student = User.query.filter_by(role='student').first()
        
        activity = Activity(
            title="Vol Event",
            org_id="test_org",
            organiser_id=admin.id,
            city="Chennai",
            scale="local_meetup",
            venue="Old Venue",
            capacity=100,
            status=EVENT_UPCOMING
        )
        db.session.add(activity)
        db.session.flush()

        from app.models import ActivityTeamMember
        crew = ActivityTeamMember(activity_id=activity.id, user_id=student.id, role="Speaker")
        db.session.add(crew)
        db.session.commit()
        
        res = award_volunteer_points(activity.id, student.id, "Speaker", admin)
        assert res["points"] == 20
        
        pt = ContributionPoint.query.filter_by(user_id=student.id, activity_id=activity.id, action="volunteered").first()
        assert pt is not None
        assert pt.points == 20
