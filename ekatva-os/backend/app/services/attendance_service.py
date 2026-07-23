from ..constants import POINTS
from ..errors import ApiError
from ..extensions import db
from ..models import Attendance, ContributionPoint, Notification
from ..repositories.repos import ActivityRepository, RegistrationRepository


def check_in(activity_id: str, registration_ids: list, organiser) -> dict:
    """Mark registered students as attended (FR-D6). Each new attendance
    creates the record that powers points (FR-G1) and fee utilisation (FR-H5)."""
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "event_not_found", 404)

    regs = RegistrationRepository.by_ids(registration_ids)
    newly = 0
    for reg in regs:
        if reg.activity_id != activity_id:
            continue
        if reg.attendance is not None:
            continue  # idempotent — already checked in
        db.session.add(Attendance(registration_id=reg.id, checked_in_by=organiser.id))
        # Student earns attendance points
        db.session.add(
            ContributionPoint(
                user_id=reg.student_id,
                activity_id=activity_id,
                action="attended",
                points=POINTS["attended"],
            )
        )
        db.session.add(
            Notification(
                user_id=reg.student_id,
                activity_id=activity_id,
                type="points",
                title=f"You earned {POINTS['attended']} points",
                body=f"For attending '{activity.title}'.",
            )
        )
        newly += 1

    db.session.commit()
    return {"checked_in": newly, "total_attended": activity.attended_count()}
