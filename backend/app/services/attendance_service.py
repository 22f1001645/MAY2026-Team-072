from ..constants import POINTS
from ..errors import ApiError
from ..extensions import db
from ..models import Attendance, ContributionPoint, Notification, User
from ..repositories.repos import ActivityRepository, RegistrationRepository


def _process_referral_gamification(reg, activity):
    if reg.referred_by_id and reg.referred_by_id != reg.student_id:
        referrer = User.query.get(reg.referred_by_id)
        if referrer:
            db.session.add(ContributionPoint(
                user_id=reg.referred_by_id,
                activity_id=activity.id,
                action="referred",
                points=50
            ))
            db.session.add(Notification(
                user_id=reg.referred_by_id,
                activity_id=activity.id,
                type="update",
                title="Referral Successful!",
                body=f"{reg.student.name} attended the event using your link. You earned 50 points!"
            ))

            db.session.add(ContributionPoint(
                user_id=reg.student_id,
                activity_id=activity.id,
                action="referred_welcome",
                points=20
            ))
            db.session.add(Notification(
                user_id=reg.student_id,
                activity_id=activity.id,
                type="update",
                title="Welcome Bonus!",
                body="You earned 20 points for attending via a referral link!"
            ))


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
        _process_referral_gamification(reg, activity)
        newly += 1

    db.session.commit()
    return {"checked_in": newly, "total_attended": activity.attended_count()}


def scan_qr(activity_id: str, qr_token: str, organiser) -> dict:
    """Scan a QR token. If valid and not checked in, check them in.
    If already checked in, return a duplicate status.
    If invalid or wrong event, raise ApiError."""
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "event_not_found", 404)

    reg = RegistrationRepository.by_qr_token(qr_token)
    if not reg or reg.activity_id != activity_id:
        raise ApiError("Invalid QR Code for this event", "invalid_qr", 400)

    if reg.attendance is not None:
        return {
            "status": "duplicate",
            "student_name": reg.student.name if reg.student else "Unknown",
            "student_id": reg.student_id,
            "message": "Student has already checked in."
        }

    # valid and new check-in
    db.session.add(Attendance(registration_id=reg.id, checked_in_by=organiser.id))
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
    _process_referral_gamification(reg, activity)
    db.session.commit()

    return {
        "status": "success",
        "student_name": reg.student.name if reg.student else "Unknown",
        "student_id": reg.student_id
    }


def award_volunteer_points(activity_id: str, user_id: str, role_name: str, organiser) -> dict:
    """FR-G3 — Award volunteer contribution points (20 points) for an assigned role."""
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "event_not_found", 404)

    point_entry = ContributionPoint(
        user_id=user_id,
        activity_id=activity_id,
        action="volunteered",
        points=POINTS["volunteered"],
    )
    db.session.add(point_entry)
    db.session.add(
        Notification(
            user_id=user_id,
            activity_id=activity_id,
            type="points",
            title=f"You earned {POINTS['volunteered']} volunteer points",
            body=f"For volunteering as {role_name} at '{activity.title}'.",
        )
    )
    db.session.commit()
    return {"user_id": user_id, "action": "volunteered", "points": POINTS["volunteered"]}
