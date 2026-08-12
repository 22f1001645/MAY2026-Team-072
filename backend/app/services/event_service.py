from datetime import datetime, timezone

from ..constants import EVENT_CANCELLED
from ..errors import ApiError
from ..extensions import db
from ..models import Activity, Notification, Registration
from ..repositories.repos import ActivityRepository, AuditRepository

def _notify_registrants(activity_id, title, body):
    registrations = Registration.query.filter_by(activity_id=activity_id).all()
    for reg in registrations:
        db.session.add(
            Notification(
                user_id=reg.student_id,
                activity_id=activity_id,
                type="update",
                title=title,
                body=body
            )
        )

def edit_event(activity_id: str, data: dict, current_user) -> Activity:
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "not_found", 404)
        
    if current_user.role != "admin" and activity.organiser_id != current_user.id:
        raise ApiError("Forbidden", "forbidden", 403)
        
    if activity.status == EVENT_CANCELLED:
        raise ApiError("Cannot edit a cancelled event", "bad_request", 400)
        
    time_changed = False
    venue_changed = False
    
    old_starts_at = activity.starts_at
    old_venue = activity.venue
    
    if "title" in data and data["title"]:
        activity.title = data["title"]
    if "description" in data:
        activity.description = data["description"]
    if "starts_at" in data and data["starts_at"]:
        new_starts = datetime.fromisoformat(data["starts_at"].replace("Z", "+00:00"))
        # ensure naive or aware match
        if new_starts.tzinfo is None:
            new_starts = new_starts.replace(tzinfo=timezone.utc)
            
        # old_starts_at from DB is usually naive UTC in SQLite
        old_compare = old_starts_at.replace(tzinfo=timezone.utc) if old_starts_at.tzinfo is None else old_starts_at
        
        if new_starts != old_compare:
            activity.starts_at = new_starts.replace(tzinfo=None)  # store naive UTC
            time_changed = True
    if "venue" in data and data["venue"]:
        if data["venue"] != old_venue:
            activity.venue = data["venue"]
            venue_changed = True
            
    if time_changed or venue_changed:
        changes = []
        if time_changed:
            from datetime import timedelta
            ist_tz = timezone(timedelta(hours=5, minutes=30))
            
            old_dt_utc = old_starts_at.replace(tzinfo=timezone.utc) if old_starts_at.tzinfo is None else old_starts_at
            new_dt_utc = activity.starts_at.replace(tzinfo=timezone.utc) if activity.starts_at.tzinfo is None else activity.starts_at
            
            old_ist = old_dt_utc.astimezone(ist_tz)
            new_ist = new_dt_utc.astimezone(ist_tz)
            
            changes.append(f"time from {old_ist.strftime('%I:%M %p')} to {new_ist.strftime('%I:%M %p')}")
        if venue_changed:
            changes.append(f"venue from '{old_venue}' to '{activity.venue}'")
            
        change_text = " and ".join(changes)
        title = f"Event Updated: {activity.title}"
        
        custom_message = data.get("update_message", "").strip()
        if custom_message:
            body = custom_message
        else:
            body = f"The venue or time has been updated: {change_text}. Please check the event details."
            
        _notify_registrants(activity.id, title, body)
        
    AuditRepository.record("activity", activity.id, "Edited event", current_user)
    db.session.commit()
    return activity

def cancel_event(activity_id: str, current_user):
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "not_found", 404)
        
    if current_user.role != "admin" and activity.organiser_id != current_user.id:
        raise ApiError("Forbidden", "forbidden", 403)
        
    if activity.status == EVENT_CANCELLED:
        raise ApiError("Event is already cancelled", "bad_request", 400)
        
    activity.status = EVENT_CANCELLED
    
    title = f"Event Cancelled: {activity.title}"
    body = f"This event has been cancelled by the organiser. Your registration is no longer active."
    _notify_registrants(activity.id, title, body)
    
    AuditRepository.record("activity", activity.id, "Cancelled event", current_user)
    db.session.commit()
    return activity
