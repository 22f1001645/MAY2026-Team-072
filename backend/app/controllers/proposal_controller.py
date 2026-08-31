from datetime import UTC, datetime

from flask import Blueprint, g, jsonify, request

from ..errors import ApiError
from ..models import ActivityCollaborator
from ..rbac import (
    admin_required,
    auth_required,
    can_manage_activity_required,
    can_manage_org,
    organiser_required,
)
from ..repositories.repos import ActivityRepository, OrgRepository
from ..schemas import (
    CollabRespondSchema,
    DecisionSchema,
    ProposalSchema,
    ReassignMeetupHeadSchema,
    ReportPatchSchema,
    ReportSchema,
)
from ..services import proposal_service

proposal_bp = Blueprint("proposals", __name__, url_prefix="/api/v1")


@proposal_bp.post("/activities")
@organiser_required
def submit():
    """FR-B1 — submit a proposal (+ line-item budget + team roster + collaborators)."""
    data = ProposalSchema().load(request.get_json() or {})
    activity = proposal_service.submit_proposal(data, g.current_user)
    return jsonify(activity.to_dict(detail=True)), 201


@proposal_bp.get("/activities/clashes")
@organiser_required
def clashes():
    """Approved events in a city around a date — the date-clash warning (FR-B1).

    Read-only and advisory. It never blocks a submission: a clash is sometimes
    deliberate (a techno track and a sports track on the same Saturday), so the
    call is the organiser's and the admin's to make. It only makes sure neither
    of them makes it without knowing.

    Organiser-gated rather than public because it exposes the approved calendar
    for a city, including events an anonymous visitor has no reason to enumerate.
    """
    city = request.args.get("city")
    starts_at_raw = request.args.get("starts_at")
    exclude_id = request.args.get("exclude_id")

    if not city or not starts_at_raw:
        raise ApiError("city and starts_at are required", "validation_error", 400)

    try:
        # Accept the ISO-8601 the client already sends, with or without a Z.
        starts_at = datetime.fromisoformat(starts_at_raw.replace("Z", "+00:00"))
    except ValueError:
        raise ApiError("starts_at must be an ISO-8601 datetime", "validation_error", 400)

    # SQLAlchemy compares against naive UTC columns throughout this codebase.
    if starts_at.tzinfo is not None:
        starts_at = starts_at.astimezone(UTC).replace(tzinfo=None)

    found = ActivityRepository.clashes_in_city(city, starts_at, exclude_id=exclude_id)
    return jsonify(
        [
            {
                "id": a.id,
                "title": a.title,
                "city": a.city,
                "scale": a.scale,
                "venue": a.venue,
                "starts_at": a.starts_at.isoformat() + "Z" if a.starts_at else None,
                "organiser": a.organiser.name if getattr(a, "organiser", None) else None,
            }
            for a in found
        ]
    ), 200


@proposal_bp.get("/proposals")
@admin_required
def queue():
    status = request.args.get("status", "pending")
    items = ActivityRepository.proposals_by_status(status)
    return jsonify([a.to_dict(detail=True) for a in items]), 200


@proposal_bp.get("/proposals/<activity_id>")
@admin_required
def detail(activity_id):
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Proposal not found", "not_found", 404)
    return jsonify(activity.to_dict(detail=True)), 200


@proposal_bp.post("/proposals/<activity_id>/decision")
@admin_required
def decision(activity_id):
    """FR-B3 — approve / request changes / reject, with audit trail."""
    data = DecisionSchema().load(request.get_json() or {})
    activity = proposal_service.decide(activity_id, data["decision"], data["note"], g.current_user)
    return jsonify(activity.to_dict(detail=True)), 200


@proposal_bp.get("/activities/<activity_id>/audit")
@admin_required
def audit(activity_id):
    return jsonify([a.to_dict() for a in proposal_service.audit_trail(activity_id)]), 200


@proposal_bp.get("/audit-log")
@admin_required
def global_audit_log():
    """FR-B4 — System-wide append-only audit log feed across all activities."""
    logs = proposal_service.global_audit_trail()
    return jsonify([a.to_dict() for a in logs]), 200


@proposal_bp.post("/activities/<activity_id>/report")
@organiser_required
def submit_report(activity_id):
    """FR-F2 — On completion, an organiser files a short post-event report."""
    data = ReportSchema().load(request.get_json() or {})
    report = proposal_service.submit_report(activity_id, data["summary"], g.current_user)
    return jsonify(report.to_dict()), 201


@proposal_bp.patch("/activities/<activity_id>/report")
@can_manage_activity_required
def patch_report(activity_id):
    """FEEDBACK-01 — save the post-event reflection draft, or submit it.

    Guard: can_manage_activity_required, not meetup_head_required. The broad
    question this route must answer for every call is "may this person touch
    this event's reflection?", and D-12 answers it with "any team member". The
    narrow Meetup Head rule applies only when the body carries
    `status: submitted`, which a route guard cannot see, so proposal_service
    asks it — the same split REIMB-01/02 uses on the Reimbursement panel.

    Sits beside the FR-F2 POST above rather than replacing it: that endpoint
    files a `summary` in one shot, this one is the two-stage reflection.
    """
    data = ReportPatchSchema().load(request.get_json() or {})
    report = proposal_service.patch_report(activity_id, data, g.current_user)
    return jsonify(report.to_dict()), 200


@proposal_bp.get("/activities/<activity_id>/report")
@auth_required
def get_report(activity_id):
    report = proposal_service.get_report(activity_id)
    return jsonify(report.to_dict()), 200


@proposal_bp.post("/activities/<activity_id>/collaborators/<collab_id>/respond")
@auth_required
def respond_collab(activity_id, collab_id):
    """PROPOSAL-06 — accept or decline a collaboration invite.

    Guard: the acting user must hold can_manage_org authority over the collaborating
    organisation. We do NOT use @can_manage_org_required here because the URL param
    is collab_id (the invite row's id), not org_id — org_scoped() reads from URL
    kwargs, so we load the collab row first and check inline."""
    collab = ActivityCollaborator.query.filter_by(
        id=collab_id, activity_id=activity_id
    ).first()
    if not collab:
        raise ApiError("Collaboration invite not found", "not_found", 404)

    collab_org = OrgRepository.by_id(collab.org_id)
    if not can_manage_org(g.current_user, collab_org):
        raise ApiError(
            "Authority over the collaborating organisation is required",
            "forbidden",
            403,
        )

    data = CollabRespondSchema().load(request.get_json() or {})
    updated = proposal_service.respond_collab(collab, data["status"])
    return jsonify(updated.to_dict()), 200


@proposal_bp.post("/activities/<activity_id>/reassign-meetup-head")
@can_manage_activity_required
def reassign_meetup_head(activity_id):
    """PROPOSAL-05: reassign Meetup Head to any user, by proposer or admin.

    Guard: can_manage_activity covers the proposer (organiser_id), all team members,
    org POR holders, and admin — the full set of people who legitimately manage the
    event. The campaign-live gate in the service is a Phase 5 stub."""
    data = ReassignMeetupHeadSchema().load(request.get_json() or {})
    result = proposal_service.reassign_meetup_head(
        g.activity, data["new_meetup_head_user_id"], g.current_user
    )
    return jsonify(result), 200
