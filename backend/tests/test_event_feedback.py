"""Unit & integration tests for Phase 6 FEEDBACK-01 and FEEDBACK-02.

FEEDBACK-01:
- Organiser / team member can PATCH report draft (challenges, learnings)
- Non-Meetup Head cannot set report status to submitted (RBAC-03)
- Meetup Head can submit report

FEEDBACK-02:
- Attendee who checked in can POST feedback (1-5 star rating + comment)
- Non-attendee gets 403
- Rating out of bounds gets 422
- Duplicate submission returns 409
- GET /activities/<id>/feedback/me returns own feedback or {submitted: false}
"""
import pytest
from app.extensions import db
from app.models import Activity, Attendance, EventFeedback, Organisation, Proposal, Registration, User, ActivityTeamMember
from app.constants import TEAM_ROLE_MEETUP_HEAD, REPORT_SUBMITTED
from tests.conftest import meetup_head_user, student_user, crew_user


@pytest.fixture
def feedback_event(app):
    """Create a completed activity with a Meetup Head, attended student, and registered-only crew member."""
    with app.app_context():
        org = Organisation.query.first()
        head = meetup_head_user()
        attendee = student_user()
        outsider = crew_user()

        act = Activity(
            title="Feedback Test Event",
            org_id=org.id,
            city="Hyderabad",
            scale="local_meetup",
            venue="T-Hub",
            capacity=50,
            status="completed",
            organiser_id=head.id,
        )
        db.session.add(act)
        db.session.flush()

        db.session.add(Proposal(activity_id=act.id, submitted_by=head.id, status="approved"))
        db.session.add(ActivityTeamMember(activity_id=act.id, user_id=head.id, role=TEAM_ROLE_MEETUP_HEAD, added_by=head.id))

        # Attendee with attendance record
        reg = Registration(activity_id=act.id, student_id=attendee.id)
        db.session.add(reg)
        db.session.flush()
        db.session.add(Attendance(registration_id=reg.id, checked_in_by=head.id))

        # Outsider with registration but no check-in
        reg_outsider = Registration(activity_id=act.id, student_id=outsider.id)
        db.session.add(reg_outsider)

        db.session.commit()

        return {
            "activity_id": act.id,
            "head_id": head.id,
            "attendee_id": attendee.id,
            "outsider_id": outsider.id,
        }


def test_report_draft_patch(client, meetup_head_headers, feedback_event):
    """FEEDBACK-01: Any team member can auto-save report drafts."""
    res = client.patch(
        f"/api/v1/activities/{feedback_event['activity_id']}/report",
        json={"challenges": "Rain caused slight delay", "learnings": "Arrange indoor venue next time"},
        headers=meetup_head_headers,
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["challenges"] == "Rain caused slight delay"
    assert data["learnings"] == "Arrange indoor venue next time"


def test_report_submit_gate(client, student_headers, meetup_head_headers, feedback_event):
    """FEEDBACK-01: Meetup Head can submit report, non-head cannot."""
    res = client.patch(
        f"/api/v1/activities/{feedback_event['activity_id']}/report",
        json={"status": REPORT_SUBMITTED},
        headers=student_headers,
    )
    assert res.status_code == 403

    res_head = client.patch(
        f"/api/v1/activities/{feedback_event['activity_id']}/report",
        json={"status": REPORT_SUBMITTED},
        headers=meetup_head_headers,
    )
    assert res_head.status_code == 200
    assert res_head.get_json()["status"] == REPORT_SUBMITTED


def test_attendee_feedback_submission(client, student_headers, feedback_event):
    """FEEDBACK-02: Checked-in attendee can submit 1-5 star rating."""
    res = client.post(
        f"/api/v1/activities/{feedback_event['activity_id']}/feedback",
        json={"rating": 5, "comment": "Amazing event!"},
        headers=student_headers,
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data["rating"] == 5
    assert data["comment"] == "Amazing event!"
    assert data["submitted"] is True


def test_non_attendee_cannot_submit_feedback(client, crew_headers, feedback_event):
    """FEEDBACK-02: Registered student who did not check in gets 403."""
    res = client.post(
        f"/api/v1/activities/{feedback_event['activity_id']}/feedback",
        json={"rating": 4, "comment": "I missed it"},
        headers=crew_headers,
    )
    assert res.status_code == 403


def test_feedback_rating_validation(client, student_headers, feedback_event):
    """FEEDBACK-02: Ratings outside 1-5 get 422."""
    res_zero = client.post(
        f"/api/v1/activities/{feedback_event['activity_id']}/feedback",
        json={"rating": 0},
        headers=student_headers,
    )
    assert res_zero.status_code == 422

    res_six = client.post(
        f"/api/v1/activities/{feedback_event['activity_id']}/feedback",
        json={"rating": 6},
        headers=student_headers,
    )
    assert res_six.status_code == 422


def test_feedback_duplicate_prevention(client, student_headers, feedback_event):
    """FEEDBACK-02: Duplicate feedback submission returns 409."""
    res1 = client.post(
        f"/api/v1/activities/{feedback_event['activity_id']}/feedback",
        json={"rating": 4},
        headers=student_headers,
    )
    assert res1.status_code == 201

    res2 = client.post(
        f"/api/v1/activities/{feedback_event['activity_id']}/feedback",
        json={"rating": 5},
        headers=student_headers,
    )
    assert res2.status_code == 409


def test_my_feedback_endpoint(client, student_headers, feedback_event):
    """FEEDBACK-02: GET /feedback/me returns {submitted: false} before and rating after."""
    res_before = client.get(
        f"/api/v1/activities/{feedback_event['activity_id']}/feedback/me",
        headers=student_headers,
    )
    assert res_before.status_code == 200
    assert res_before.get_json()["submitted"] is False

    client.post(
        f"/api/v1/activities/{feedback_event['activity_id']}/feedback",
        json={"rating": 5, "comment": "Great"},
        headers=student_headers,
    )

    res_after = client.get(
        f"/api/v1/activities/{feedback_event['activity_id']}/feedback/me",
        headers=student_headers,
    )
    assert res_after.status_code == 200
    data = res_after.get_json()
    assert data["submitted"] is True
    assert data["rating"] == 5
