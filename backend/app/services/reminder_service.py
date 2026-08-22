from datetime import datetime, timedelta, UTC
from ..extensions import db
from ..repositories.repos import ActivityRepository
from ..models import Notification, Registration

def send_24h_reminders():
    """Find activities starting in exactly 24-25 hours and notify confirmed students."""
    now = datetime.now(UTC)
    start_window = now + timedelta(hours=24)
    end_window = now + timedelta(hours=25)
    
    activities = ActivityRepository.get_starting_in_window(start_window, end_window)
    
    for activity in activities:
        # Get confirmed registrations
        registrations = Registration.query.filter_by(
            activity_id=activity.id, 
            status="confirmed"
        ).all()
        
        for reg in registrations:
            # Check if reminder already sent
            existing = Notification.query.filter_by(
                user_id=reg.student_id,
                activity_id=activity.id,
                type="reminder"
            ).first()
            
            if not existing:
                db.session.add(
                    Notification(
                        user_id=reg.student_id,
                        activity_id=activity.id,
                        type="reminder",
                        title=f"Reminder: {activity.title}",
                        body=f"Your event starts in 24 hours at {activity.venue}.",
                        target_role="student"
                    )
                )
    
    db.session.commit()
