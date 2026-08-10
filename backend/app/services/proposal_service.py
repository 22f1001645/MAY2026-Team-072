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

    from ..constants import ACTIVITY_FEE_INR
    if data.get("scale") in ("local_meetup", "regional_meetup"):
        requested_total = sum(line.get("planned", 0) for line in data.get("budget", []))
        capacity = data.get("capacity", 50)
        dynamic_cap = min(capacity * ACTIVITY_FEE_INR, 20000)
        if requested_total > dynamic_cap:
            raise ApiError(
                f"Total budget \u20b9{requested_total} exceeds the cap of \u20b9{dynamic_cap} "
                f"(capacity {capacity} \u00d7 \u20b9200, max \u20b920,000).",
                "budget_cap_exceeded",
                400
            )

    if data.get("scale") == "regional_fest":
        city = data.get("city")
        has_local = ActivityRepository.count_completed_by_scale(org.id, city, "local_meetup") >= 1
        has_regional = ActivityRepository.count_completed_by_scale(org.id, city, "regional_meetup") >= 1
        if not (has_local and has_regional):
            missing = []
            if not has_local: missing.append("local_meetup")
            if not has_regional: missing.append("regional_meetup")
            raise ApiError(
                f"Fest eligibility not met in {city}: complete \u22651 {' and \u22651 '.join(missing)} first.",
                "fest_eligibility_not_met",
                403
            )
        collab_count = len(data.get("collaborating_org_ids", []))
        if collab_count < 6:
            raise ApiError(
                f"A regional fest requires \u22656 collaborating organisations (got {collab_count}).",
                "insufficient_collaborators",
                403
            )
        from . import config_service
        config_service.set_flag(f"fest_unlocked:{org.id}:{city}", True)

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
        # PROPOSAL-02: team roster assembled at submission time
        team_roster=data.get("team_roster", []),
        # PROPOSAL-01: collaborating organisations
        collaborating_orgs=data.get("collaborating_orgs", []),
    )
    db.session.add(activity)
    db.session.flush()

    for line in data.get("budget", []):
        db.session.add(
            BudgetLine(activity_id=activity.id, label=line["label"], planned=line["planned"])
        )

    from ..models import ActivityCollaborator
    db.session.add(ActivityCollaborator(
        activity_id=activity.id,
        org_id=activity.org_id,
        is_primary=True,
        status="accepted"
    ))
    for c_org_id in data.get("collaborating_org_ids", []):
        if c_org_id != activity.org_id:
            db.session.add(ActivityCollaborator(
                activity_id=activity.id,
                org_id=c_org_id,
                is_primary=False,
                status="pending"
            ))

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
        from . import config_service
        points_config = config_service.get_points()
        db.session.add(
            ContributionPoint(
                user_id=activity.organiser_id,
                activity_id=activity.id,
                action="organised",
                points=points_config["organised"],
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


def reassign_head(activity_id: str, new_head_user_id: str, actor) -> Activity:
    """PROPOSAL-05 — Reassign the Meetup Head role to a different team member."""
    from ..models import User
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Activity not found", "not_found", 404)
    if not activity.proposal or activity.proposal.status == PROPOSAL_APPROVED:
        # Only allow reassignment while proposal is pending or changes_requested
        pass  # Admin can reassign at any time before campaign goes live

    new_head = User.query.get(new_head_user_id)
    if not new_head:
        raise ApiError("User not found", "not_found", 404)

    roster = list(activity.team_roster or [])
    # Remove any existing Meetup Head entries
    roster = [m for m in roster if m.get("role") != "Meetup Head"]
    # Add new Meetup Head
    roster.insert(0, {"role": "Meetup Head", "user_id": new_head_user_id, "name": new_head.name})
    activity.team_roster = roster

    AuditRepository.record(
        "proposal", activity.id,
        f"Meetup Head reassigned to {new_head.name}",
        actor
    )
    db.session.commit()
    return activity


def _notify(user_id, activity_id, ntype, title, body):
    db.session.add(
        Notification(user_id=user_id, activity_id=activity_id, type=ntype, title=title, body=body)
    )
