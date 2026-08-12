from ..constants import PROPOSAL_APPROVED
from ..errors import ApiError
from ..extensions import db
from ..models import Notification, Registration, Announcement, ContributionPoint, User
from ..repositories.repos import ActivityRepository, RegistrationRepository

def register(activity_id: str, student, referred_by_id: str = None) -> Registration:
    activity = ActivityRepository.by_id(activity_id)
    if not activity or not activity.proposal or activity.proposal.status != PROPOSAL_APPROVED:
        raise ApiError("Event not found or not published", "event_not_found", 404)

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

    db.session.commit()
    return reg


def unregister(activity_id: str, student) -> None:
    reg = RegistrationRepository.find(activity_id, student.id)
    if not reg:
        raise ApiError("You are not registered", "not_registered", 404)
    
    # Delete student's chat history for this event
    Announcement.query.filter_by(activity_id=activity_id, sender_id=student.id).delete()
    
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
            body=f"Your registration for '{reg.activity.title}' has been successfully cancelled.",
        )
    )

    db.session.commit()


def roster(activity_id: str):
    return RegistrationRepository.for_activity(activity_id)


def my_registrations(student):
    return RegistrationRepository.for_student(student.id)


def broadcast(activity_id: str, title: str, body: str, current_user) -> int:
    """Send an update or chat message."""
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "event_not_found", 404)
    
    # Check permissions
    is_organiser = current_user.role == "admin" or current_user.id == activity.organiser_id
    is_attendee = RegistrationRepository.find(activity_id, current_user.id) is not None
    
    if not (is_organiser or is_attendee):
        raise ApiError("Only organisers and registered attendees can post in the discussion.", "forbidden", 403)
    
    # Save the announcement for the event feed
    announcement = Announcement(
        activity_id=activity_id,
        sender_id=current_user.id,
        title=title,
        body=body,
    )
    db.session.add(announcement)
    
    regs = RegistrationRepository.for_activity(activity_id)
    sent_count = 0
    
    # Only push notifications if it's a Push Alert (has a title)
    if title:
        for r in regs:
            # Don't notify the sender themselves
            if r.student_id == current_user.id:
                continue
            db.session.add(
                Notification(
                    user_id=r.student_id,
                    activity_id=activity_id,
                    type="update",
                    title=title,
                    body=body,
                )
            )
        sent_count = len(regs)
        
    db.session.commit()
    return sent_count


def announcements(activity_id: str):
    """Retrieve the broadcast history for an activity."""
    return Announcement.query.filter_by(activity_id=activity_id).order_by(Announcement.created_at.desc()).all()
