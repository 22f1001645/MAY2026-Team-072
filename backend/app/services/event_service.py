from ..constants import EVENT_CANCELLED
from ..errors import ApiError
from ..extensions import db
from ..models import Notification
from ..repositories.repos import ActivityRepository, AuditRepository, RegistrationRepository


def _notify_registrants(activity_id, title, body):
    for reg in RegistrationRepository.for_activity(activity_id):
        db.session.add(
            Notification(
                user_id=reg.student_id,
                activity_id=activity_id,
                type="update",
                title=title,
                body=body,
            )
        )


def edit_event(activity_id: str, data: dict, current_user):
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "not_found", 404)
    if activity.status == EVENT_CANCELLED:
        raise ApiError("Cannot edit a cancelled event", "bad_request", 400)

    old_starts_at = activity.starts_at
    old_venue = activity.venue

    if data.get("title"):
        activity.title = data["title"]
    if data.get("description") is not None:
        activity.description = data["description"]
    if data.get("starts_at"):
        activity.starts_at = data["starts_at"]
    if data.get("venue"):
        activity.venue = data["venue"]

    time_changed = data.get("starts_at") and data["starts_at"] != old_starts_at
    venue_changed = data.get("venue") and data["venue"] != old_venue

    if time_changed or venue_changed:
        changes = []
        if time_changed:
            changes.append(f"time from {old_starts_at:%d %b, %I:%M %p} to {activity.starts_at:%d %b, %I:%M %p}")
        if venue_changed:
            changes.append(f"venue from '{old_venue}' to '{activity.venue}'")
        default_body = f"The {' and '.join(changes)}. Please check the event details."
        title = f"Event Updated: {activity.title}"
        body = data.get("update_message") or default_body
        _notify_registrants(activity.id, title, body)

    AuditRepository.record("activity", activity.id, "Edited event", current_user)
    db.session.commit()
    return activity


def cancel_event(activity_id: str, current_user):
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "not_found", 404)
    if activity.status == EVENT_CANCELLED:
        raise ApiError("Event is already cancelled", "bad_request", 400)

    activity.status = EVENT_CANCELLED
    _notify_registrants(
        activity.id,
        f"Event Cancelled: {activity.title}",
        "This event has been cancelled by the organiser. Your registration is no longer active.",
    )
    AuditRepository.record("activity", activity.id, "Cancelled event", current_user)
    db.session.commit()
    return activity
