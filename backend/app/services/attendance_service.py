from .settings_service import get_recognition_points
from ..errors import ApiError
from ..extensions import db
from ..models import ActivityTeamMember, Attendance, ContributionPoint, Notification, Registration, User
from ..repositories.repos import ActivityRepository, RegistrationRepository


def _process_referral_gamification(reg, activity):
    """Reward the referrer and the referred student once the referred
    registration actually shows up (not on registration — on attendance)."""
    if not reg.referred_by_id or reg.referred_by_id == reg.student_id:
        return

    points = get_recognition_points()

    db.session.add(
        ContributionPoint(
            user_id=reg.referred_by_id,
            activity_id=activity.id,
            action="referred",
            points=points.get("referrer", 10),
        )
    )
    db.session.add(
        Notification(
            user_id=reg.referred_by_id,
            activity_id=activity.id,
            type="update",
            title="Referral successful!",
            body=f"{reg.student.name if reg.student else 'A friend'} attended using your link. You earned {points.get('referrer', 10)} points!",
        )
    )
    db.session.add(
        ContributionPoint(
            user_id=reg.student_id,
            activity_id=activity.id,
            action="referred_welcome",
            points=points.get("referee", 5),
        )
    )
    db.session.add(
        Notification(
            user_id=reg.student_id,
            activity_id=activity.id,
            type="update",
            title="Welcome bonus!",
            body=f"You earned {points.get('referee', 5)} points for attending via a referral link!",
        )
    )


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
                points=get_recognition_points()["attended"],
            )
        )
        db.session.add(
            Notification(
                user_id=reg.student_id,
                activity_id=activity_id,
                type="points",
                title=f"You earned {get_recognition_points()['attended']} points",
                body=f"For attending '{activity.title}'.",
            )
        )
        _process_referral_gamification(reg, activity)
        newly += 1

    db.session.commit()
    return {"checked_in": newly, "total_attended": activity.attended_count()}


def scan_qr(activity_id: str, qr_token: str, organiser) -> dict:
    """Resolve a scanned QR code to a registration and check it in. Delegates
    to check_in() so there is exactly one place that creates an Attendance
    row and awards points, whether the organiser scanned or tapped a name."""
    reg = Registration.query.filter(
        (Registration.qr_token == qr_token) | (Registration.id == qr_token)
    ).first()
    if not reg or reg.activity_id != activity_id:
        raise ApiError("Invalid QR code for this event", "invalid_qr", 400)

    if reg.attendance is not None:
        return {
            "status": "duplicate",
            "student_name": reg.student.name if reg.student else "Unknown",
            "message": "Student has already checked in.",
        }

    check_in(activity_id, [reg.id], organiser)
    return {
        "status": "success",
        "student_name": reg.student.name if reg.student else "Unknown",
    }


def award_volunteer_points(activity_id: str, user_id: str, role_name: str, organiser) -> dict:
    """FR-G3 — Award volunteer contribution points (20 points) for an assigned role.

    TEAM-04: the recipient must hold an ActivityTeamMember row on THIS activity.
    The check belongs here rather than in the route, and should stay here. The
    route's `organiser_required` decorator authorises the *caller* and cannot
    look at the target `user_id` at all, so without this every organiser POR
    holder in the country could mint points for any user id in the system. That
    route is also one of the six frozen LEGACY_COARSE_ROUTES entries, which
    Phase 1 deliberately declined to retrofit — so "simplifying" this upward
    into a decorator is not available even in principle.

    The lookup runs before the first `db.session.add`, which is what makes "a
    refused award writes no ledger row" true by construction rather than by
    relying on a caller to roll back."""
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "event_not_found", 404)

    crew = ActivityTeamMember.query.filter_by(
        activity_id=activity_id, user_id=user_id
    ).first()
    if crew is None:
        raise ApiError(
            "Volunteer points can only be awarded to a member of this event's crew.",
            "not_crew_member",
            403,
        )

    db.session.add(
        ContributionPoint(
            user_id=user_id,
            activity_id=activity_id,
            action="volunteered",
            points=get_recognition_points()["volunteered"],
        )
    )
    db.session.add(
        Notification(
            user_id=user_id,
            activity_id=activity_id,
            type="points",
            title=f"You earned {get_recognition_points()['volunteered']} volunteer points",
            body=f"For volunteering as {role_name} at '{activity.title}'.",
        )
    )
    db.session.commit()
    return {"user_id": user_id, "action": "volunteered", "points": get_recognition_points()["volunteered"]}
