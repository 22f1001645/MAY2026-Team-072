import json

from ..constants import PROPOSAL_APPROVED, EVENT_CANCELLED
from ..errors import ApiError
from ..extensions import db
from ..models import Notification, Registration, Announcement
from ..repositories.repos import ActivityRepository, AuditRepository, RegistrationRepository


def register(activity_id: str, student, referred_by_id: str = None) -> Registration:
    activity = ActivityRepository.by_id(activity_id)
    if not activity or not activity.proposal or activity.proposal.status != PROPOSAL_APPROVED:
        raise ApiError("Event not found or not published", "event_not_found", 404)

    if activity.status == EVENT_CANCELLED:
        raise ApiError("This event has been cancelled", "event_cancelled", 400)

    if RegistrationRepository.find(activity_id, student.id):
        raise ApiError("You are already registered for this event", "already_registered", 409)

    # Capacity is tracked; registration closes at capacity (FR-D2)
    # Waitlist support: if capacity is full, register as waitlisted.
    is_waitlisted = activity.registered_count() >= activity.capacity
    reg_status = "waitlisted" if is_waitlisted else "confirmed"

    reg = Registration(activity_id=activity_id, student_id=student.id, status=reg_status, referred_by_id=referred_by_id)
    db.session.add(reg)

    if is_waitlisted:
        title = "You're on the waitlist"
        body = f"You are on the waitlist for '{activity.title}'. We will notify you if a spot opens up."
    else:
        title = "Registration confirmed"
        body = f"You're in for '{activity.title}'. Reminders will follow."

    db.session.add(
        Notification(
            user_id=student.id,
            activity_id=activity_id,
            type="approval",
            title=title,
            body=body,
        )
    )

    # TIMELINE-02 — this service claimed to record an audit event and never did.
    # The row is scoped to `activity_id`, not to the Registration's own id,
    # because every reader of it (the activity audit trail, and the Phase 6
    # timeline projection) asks "what happened to this event?". A row keyed on
    # the registration id answers a question nobody asks and would be invisible
    # to both. The flush is what makes `reg.id` real — the UUID default is
    # applied at INSERT, so recording it before the flush would store null.
    db.session.flush()
    AuditRepository.record(
        "registration",
        activity_id,
        f"Student registered: {student.name}",
        student,
        note=json.dumps(
            {
                "registration_id": reg.id,
                "student": student.name,
                "status": reg_status,
            }
        ),
    )
    db.session.commit()
    return reg


def unregister(activity_id: str, student) -> None:
    reg = RegistrationRepository.find(activity_id, student.id)
    if not reg:
        raise ApiError("You are not registered", "not_registered", 404)

    activity_title = reg.activity.title
    was_confirmed = (reg.status == "confirmed")
    db.session.delete(reg)
    db.session.flush()

    if was_confirmed:
        # Auto-promote the next waitlisted student
        next_waitlisted = (
            Registration.query.filter_by(activity_id=activity_id, status="waitlisted")
            .order_by(Registration.created_at.asc())
            .first()
        )
        if next_waitlisted:
            next_waitlisted.status = "confirmed"
            db.session.add(
                Notification(
                    user_id=next_waitlisted.student_id,
                    activity_id=activity_id,
                    type="approval",
                    title="You're in!",
                    body=f"A spot opened up! You are now confirmed for '{next_waitlisted.activity.title}'.",
                )
            )

    db.session.add(
        Notification(
            user_id=student.id,
            activity_id=activity_id,
            type="update",
            title="Registration Cancelled",
            body=f"Your registration for '{activity_title}' has been successfully cancelled.",
        )
    )

    db.session.commit()


def roster(activity_id: str):
    return RegistrationRepository.for_activity(activity_id)


def my_registrations(student):
    return RegistrationRepository.for_student(student.id)


def broadcast(activity_id: str, title: str, body: str, organiser) -> int:
    """Send a time-critical update to every registrant (FR-D3)."""
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "event_not_found", 404)
    
    # Save the announcement for the event feed
    announcement = Announcement(
        activity_id=activity_id,
        sender_id=organiser.id,
        title=title,
        body=body,
    )
    db.session.add(announcement)
    
    regs = RegistrationRepository.for_activity(activity_id)
    for r in regs:
        db.session.add(
            Notification(
                user_id=r.student_id,
                activity_id=activity_id,
                type="update",
                title=title,
                body=body,
            )
        )
    db.session.commit()
    return len(regs)


def announcements(activity_id: str):
    """Retrieve the broadcast history for an activity."""
    return Announcement.query.filter_by(activity_id=activity_id).order_by(Announcement.created_at.desc()).all()
