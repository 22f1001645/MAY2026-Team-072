"""ORG-01 — an organisation's public profile.

Readable by anyone signed in; editable only by someone holding authority over
that specific organisation. This is the first route in the codebase to sit
behind `can_manage_org_required`, so the URL parameter spelling matters more
than usual: `org_scoped` reads it out of the view's kwargs by name, and any
other spelling yields a 404 for every caller, admins included, while the RBAC
suite stays green.
"""
from flask import Blueprint, g, jsonify, request

from ..errors import ApiError
from ..rbac import auth_required, can_manage_org_required
from ..repositories.repos import OrgRepository
from ..schemas import OrgProfileSchema
from ..services import org_profile_service

org_profile_bp = Blueprint("org_profile", __name__, url_prefix="/api/v1")


@org_profile_bp.get("/orgs/<org_id>/profile")
@auth_required
def get_profile(org_id):
    """Any authenticated reader. The profile is public within the app and no
    field it returns is sensitive (T-04-03, accepted); the payload deliberately
    carries no editability hint, so a reader without authority sees an ordinary
    profile rather than a locked one (P-06)."""
    org = OrgRepository.by_id(org_id)
    if not org:
        raise ApiError("Organisation not found", "not_found", 404)
    return jsonify(org_profile_service.public_profile(org)), 200


@org_profile_bp.patch("/orgs/<org_id>/profile")
@can_manage_org_required
def update_profile(org_id):
    """The guard has already loaded the organisation onto `g.org`, 404'd a
    missing one and 403'd a cross-org edit, so this view neither re-queries nor
    re-authorizes — it validates the body and hands the object to the service."""
    data = OrgProfileSchema().load(request.get_json() or {})
    org = org_profile_service.update_profile(g.org, data, g.current_user)
    return jsonify(org_profile_service.public_profile(org)), 200
