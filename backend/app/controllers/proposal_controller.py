from flask import Blueprint, g, jsonify, request

from ..errors import ApiError
from ..rbac import admin_required, auth_required, organiser_required
from ..repositories.repos import ActivityRepository
from ..schemas import DecisionSchema, ProposalSchema, ReportSchema
from ..services import proposal_service

proposal_bp = Blueprint("proposals", __name__, url_prefix="/api/v1")


@proposal_bp.post("/activities")
@organiser_required
def submit():
    """FR-B1 — submit a proposal (+ line-item budget)."""
    data = ProposalSchema().load(request.get_json() or {})
    activity = proposal_service.submit_proposal(data, g.current_user)
    return jsonify(activity.to_dict(detail=True)), 201


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


@proposal_bp.patch("/activities/<activity_id>/reassign-head")
@admin_required
def reassign_head(activity_id):
    """PROPOSAL-05 — Admin reassigns the Meetup Head on an activity's team roster."""
    data = request.get_json() or {}
    new_head_user_id = data.get("new_head_user_id", "").strip()
    if not new_head_user_id:
        from ..errors import ApiError
        raise ApiError("new_head_user_id is required", "missing_field", 400)
    activity = proposal_service.reassign_head(activity_id, new_head_user_id, g.current_user)
    return jsonify(activity.to_dict(detail=True)), 200


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


@proposal_bp.get("/activities/<activity_id>/report")
@auth_required
def get_report(activity_id):
    report = proposal_service.get_report(activity_id)
    return jsonify(report.to_dict()), 200
