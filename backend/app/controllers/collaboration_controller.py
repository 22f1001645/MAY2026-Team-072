from flask import Blueprint, request, jsonify, g
from ..rbac import admin_required, auth_required, organiser_required
from ..models import Activity, ActivityCollaborator, Organisation, PORAssignment, Membership
from ..extensions import db
from ..errors import ApiError
from ..repositories.repos import AuditRepository

collaboration_bp = Blueprint("collaboration", __name__, url_prefix="/api/v1")


@collaboration_bp.route("/activities/<activity_id>/collaborators", methods=["GET"])
@auth_required
def list_collaborators(activity_id):
    activity = Activity.query.get_or_404(activity_id)
    return jsonify([c.to_dict() for c in activity.collaborator_entries]), 200


@collaboration_bp.route("/activities/<activity_id>/collaborators/<org_id>/respond", methods=["POST"])
@organiser_required
def respond_to_collaboration(activity_id, org_id):
    """PROPOSAL-06: org lead accepts or declines collaboration invite."""
    user = g.current_user
    data = request.get_json(force=True)
    action = data.get("action")
    if action not in ("accept", "decline"):
        raise ApiError("action must be 'accept' or 'decline'", "invalid_action", 400)

    collab = ActivityCollaborator.query.filter_by(activity_id=activity_id, org_id=org_id).first()
    if not collab:
        raise ApiError("Collaboration invite not found", "not_found", 404)

    # Check caller holds a leadership POR for this org
    membership = Membership.query.filter_by(user_id=user.id, org_id=org_id).first()
    if not membership:
        raise ApiError("You are not a member of this organisation", "forbidden", 403)
    has_leadership = PORAssignment.query.filter(
        PORAssignment.membership_id == membership.id,
        PORAssignment.active == True,
        PORAssignment.por_type.in_(["Society Secretary", "House Secretary", "Deputy House Secretary",
                                      "Society Deputy Secretary", "Regional Coordinator"])
    ).first()
    if not has_leadership:
        raise ApiError("Only Secretary/Deputy/RC can respond to collaboration invites", "forbidden", 403)

    collab.status = "accepted" if action == "accept" else "declined"
    AuditRepository.record("activity", activity_id, f"Collaboration {action}ed by {collab.org.name}", user)
    db.session.commit()
    return jsonify(collab.to_dict()), 200
