"""Attendee feedback service — FEEDBACK-02.

One rating per attendee per event, gated on having an Attendance record.
The DB-level unique constraint (uq_event_feedback) is the final guard;
the service pre-checks the constraint via an existence query so the caller
gets a meaningful 409 rather than a raw IntegrityError from a 500.
"""

from sqlalchemy.exc import IntegrityError

from ..errors import ApiError
from ..extensions import db
from ..models import EventFeedback, Registration


def submit(activity_id: str, data: dict, user) -> dict:
    """FEEDBACK-02: submit a 1-5 star rating + optional comment.

    Guard: the caller must have an Attendance record on this event.  Sending
    a rating without having attended would let anyone influence the event's
    reputation — the service enforces the gate rather than trusting the client.
    """
    reg = Registration.query.filter_by(
        activity_id=activity_id, student_id=user.id
    ).first()
    if not reg or reg.attendance is None:
        raise ApiError(
            "Only attendees who checked in can submit feedback",
            "not_attendee",
            403,
        )

    # Pre-check: give a friendly 409 rather than an opaque 500 from the DB.
    existing = EventFeedback.query.filter_by(
        activity_id=activity_id, user_id=user.id
    ).first()
    if existing:
        raise ApiError("Feedback already submitted for this event", "duplicate_feedback", 409)

    feedback = EventFeedback(
        activity_id=activity_id,
        user_id=user.id,
        rating=data["rating"],
        comment=data.get("comment"),
    )
    db.session.add(feedback)
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        raise ApiError("Feedback already submitted for this event", "duplicate_feedback", 409)

    return {**feedback.to_dict(), "submitted": True}


def get_mine(activity_id: str, user) -> dict:
    """Return the caller's existing feedback, or {submitted: false} if none."""
    fb = EventFeedback.query.filter_by(
        activity_id=activity_id, user_id=user.id
    ).first()
    if fb:
        return {**fb.to_dict(), "submitted": True}
    return {"submitted": False}
