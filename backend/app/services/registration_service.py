from ..constants import PROPOSAL_APPROVED
from ..errors import ApiError
from ..extensions import db
from ..models import Notification, Registration
from ..repositories.repos import ActivityRepository, RegistrationRepository


def register(activity_id: str, student) -> Registration:
    activity = ActivityRepository.by_id(activity_id)
    if not activity or not activity.proposal or activity.proposal.status != PROPOSAL_APPROVED:
        raise ApiError("Event not found or not published", "event_not_found", 404)

    if RegistrationRepository.find(activity_id, student.id):
        raise ApiError("You are already registered for this event", "already_registered", 409)

    # Capacity is tracked; registration closes at capacity (FR-D2)
    if activity.registered_count() >= activity.capacity:
        raise ApiError("This event is full", "at_capacity", 409)

    reg = Registration(activity_id=activity_id, student_id=student.id)
    db.session.add(reg)
    db.session.add(
        Notification(
            user_id=student.id,
            activity_id=activity_id,
            type="approval",
            title="Registration confirmed",
            body=f"You're in for '{activity.title}'. Reminders will follow.",
        )
    )
    db.session.commit()
    return reg


def unregister(activity_id: str, student) -> None:
    reg = RegistrationRepository.find(activity_id, student.id)
    if not reg:
        raise ApiError("You are not registered", "not_registered", 404)
    db.session.delete(reg)
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
