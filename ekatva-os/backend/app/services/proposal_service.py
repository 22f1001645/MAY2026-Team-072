from datetime import datetime

from ..constants import (
    EVENT_UPCOMING,
    EVENT_CANCELLED,
    MEETUPS_PER_CITY_PER_MONTH,
    POINTS,
    PROPOSAL_APPROVED,
    PROPOSAL_CHANGES,
    PROPOSAL_REJECTED,
    PROPOSAL_REVOKED,
    PROPOSAL_SUBMITTED,
)
from ..errors import ApiError
from ..extensions import db
from ..models import Activity, BudgetLine, ContributionPoint, Notification, Proposal, Report
from ..repositories.repos import ActivityRepository, AuditRepository, OrgRepository


def submit_proposal(data: dict, organiser) -> Activity:
    org = OrgRepository.by_id(data["org_id"])
    if not org:
        raise ApiError("Organisation not found", "org_not_found", 404)

    # Quota guardrail (FR-B2): one meetup per region per month
    if data["scale"] in ("local_meetup", "regional_meetup"):
        count = ActivityRepository.meetups_in_region_month(data["org_id"], data["starts_at"])
        if count >= MEETUPS_PER_CITY_PER_MONTH:
            raise ApiError(
                f"Quota guardrail: this region already has a meetup this month",
                "quota_exceeded",
                409,
            )

    activity = Activity(
        org_id=org.id,
        title=data["title"],
        description=data.get("description", ""),
        city=data["city"],
        scale=data["scale"],
        venue=data["venue"],
        starts_at=data["starts_at"],
        capacity=data["capacity"],
        status=EVENT_UPCOMING,
        organiser_id=organiser.id,
    )
    db.session.add(activity)
    db.session.flush()

    for line in data.get("budget", []):
        db.session.add(
            BudgetLine(activity_id=activity.id, label=line["label"], planned=line["planned"])
        )

    proposal = Proposal(activity_id=activity.id, submitted_by=organiser.id, status=PROPOSAL_SUBMITTED)
    db.session.add(proposal)

    AuditRepository.record("proposal", activity.id, "Submitted proposal", organiser)
    db.session.commit()
    return activity


def decide(activity_id: str, decision: str, note: str, admin) -> Activity:
    activity = ActivityRepository.by_id(activity_id)
    if not activity or not activity.proposal:
        raise ApiError("Proposal not found", "proposal_not_found", 404)

    proposal = activity.proposal
    if proposal.status in (PROPOSAL_REJECTED, PROPOSAL_REVOKED):
        raise ApiError("This proposal has already been decided", "already_decided", 409)
    if proposal.status == PROPOSAL_APPROVED and decision != "revoke":
        raise ApiError("This proposal has already been approved", "already_decided", 409)

    if decision == "approve":
        # FR-B2: Enforce the 1-meetup-per-month quota before allowing approval
        if activity.scale in ["local_meetup", "regional_meetup"]:
            count = ActivityRepository.approved_meetups_in_region_month(activity.org_id, activity.starts_at)
            if count >= 1:
                raise ApiError(
                    f"Quota exceeded: An approved meetup already exists in {activity.starts_at.strftime('%B %Y')} for this region.",
                    "quota_exceeded",
                    409,
                )

        proposal.status = PROPOSAL_APPROVED
        # On approval the Activity auto-publishes as a live event (FR-C1)
        activity.status = EVENT_UPCOMING
        AuditRepository.record("proposal", activity.id, "Approved & auto-published", admin, note)
        # Organiser earns points for a run/approved activity (FR-G2)
        db.session.add(
            ContributionPoint(
                user_id=activity.organiser_id,
                activity_id=activity.id,
                action="organised",
                points=POINTS["organised"],
            )
        )
        _notify(activity.organiser_id, activity.id, "approval",
                "Proposal approved", f"'{activity.title}' is live on the city feed.")
    elif decision == "changes":
        if not note:
            raise ApiError("A note is required when requesting changes", "note_required", 400)
        proposal.status = PROPOSAL_CHANGES
        AuditRepository.record("proposal", activity.id, "Requested changes", admin, note)
        _notify(activity.organiser_id, activity.id, "update", "Changes requested", note)
    elif decision == "reject":
        proposal.status = PROPOSAL_REJECTED
        AuditRepository.record("proposal", activity.id, "Rejected", admin, note)
        _notify(activity.organiser_id, activity.id, "update", "Proposal rejected", note or "")
    elif decision == "revoke":
        proposal.status = PROPOSAL_REVOKED
        activity.status = EVENT_CANCELLED
        AuditRepository.record("proposal", activity.id, "Revoked", admin, note)
        
        point = ContributionPoint.query.filter_by(
            user_id=activity.organiser_id, activity_id=activity.id, action="organised"
        ).first()
        if point:
            db.session.delete(point)
            
        _notify(activity.organiser_id, activity.id, "update", "Approval Revoked", note or "The admin has revoked the approval for this event.")

    db.session.commit()
    return activity


def audit_trail(activity_id: str):
    return AuditRepository.for_entity(activity_id)


def global_audit_trail(limit=50):
    return AuditRepository.all_logs(limit)


def submit_report(activity_id: str, summary: str, organiser) -> Report:
    """FR-F2 — On completion, an organiser files a short post-event report."""
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Activity not found", "not_found", 404)

    report = Report(activity_id=activity_id, summary=summary)
    activity.status = "completed"
    db.session.add(report)
    AuditRepository.record("report", activity_id, "Filed post-event report", organiser)
    db.session.commit()
    return report


def get_report(activity_id: str) -> Report:
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Activity not found", "not_found", 404)
    report = Report.query.filter_by(activity_id=activity_id).first()
    if not report:
        raise ApiError("Report not found", "not_found", 404)
    return report


def _notify(user_id, activity_id, ntype, title, body):
    db.session.add(
        Notification(user_id=user_id, activity_id=activity_id, type=ntype, title=title, body=body)
    )
