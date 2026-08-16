"""Campaign controller — CAMPAIGN-04 and CAMPAIGN-05 routes.

Route shape follows schedule_controller.py (plan 05-01):
  - Blueprint url_prefix="/api/v1"
  - URL parameter MUST be spelled <activity_id>: activity_scoped reads
    kwargs.get("activity_id"), so any other spelling silently 404s.
  - g.activity is already loaded and authorised; campaign_service takes
    the Activity object and never re-queries by id.
"""
from flask import Blueprint, g, jsonify, request

from ..rbac import auth_required, can_manage_activity_required, meetup_head_required
from ..schemas import FormFieldPatchSchema, FormFieldSchema
from ..services import campaign_service

campaign_bp = Blueprint("campaign", __name__, url_prefix="/api/v1")


# --------------------------------------------------------------------------- #
# Campaign package read + slug minting (CAMPAIGN-04)                          #
# --------------------------------------------------------------------------- #

@campaign_bp.get("/activities/<activity_id>/campaign")
@can_manage_activity_required
def get_campaign(activity_id):
    """Return the campaign state without creating a row.

    Passes the acting user so the payload can carry a server-computed
    ``is_meetup_head`` — the flag D-07's disabled push-live button renders from.
    """
    return jsonify(campaign_service.campaign_state(g.activity, g.current_user)), 200


@campaign_bp.post("/activities/<activity_id>/campaign/generate-slug")
@can_manage_activity_required
def generate_slug(activity_id):
    """Mint a unique registration slug and return it with the full URL (AC-15)."""
    result = campaign_service.generate_slug(g.activity, g.current_user)
    return jsonify(result), 200


# --------------------------------------------------------------------------- #
# Push live (CAMPAIGN-06)                                                     #
# --------------------------------------------------------------------------- #

@campaign_bp.post("/activities/<activity_id>/campaign/push-live")
@meetup_head_required
def push_live(activity_id):
    """Publish the campaign — the only route in Phase 5 behind this guard (AC-24).

    ``meetup_head_required`` is ``activity_scoped(is_meetup_head)``. It carries
    no admin short-circuit and no ``can_manage_activity`` fallback, and neither
    should ever be added here as a convenience: an admin's power is to REASSIGN
    the Meetup Head (PROPOSAL-05), which is a different power from acting as one.
    Every other campaign route in this module is deliberately the looser
    ``can_manage_activity_required`` — any crew member may build the package;
    only the one accountable person may ship it.
    """
    result = campaign_service.push_live(g.activity, g.current_user)
    return jsonify(result), 200


# --------------------------------------------------------------------------- #
# Custom registration form fields (CAMPAIGN-05)                               #
# --------------------------------------------------------------------------- #

@campaign_bp.get("/activities/<activity_id>/form-fields")
@can_manage_activity_required
def list_form_fields(activity_id):
    return jsonify(campaign_service.list_form_fields(g.activity)), 200


@campaign_bp.post("/activities/<activity_id>/form-fields")
@can_manage_activity_required
def create_form_field(activity_id):
    data = FormFieldSchema().load(request.get_json() or {})
    field = campaign_service.create_form_field(g.activity, data, g.current_user)
    return jsonify(field), 201


@campaign_bp.patch("/activities/<activity_id>/form-fields/<field_id>")
@can_manage_activity_required
def update_form_field(activity_id, field_id):
    data = FormFieldPatchSchema().load(request.get_json() or {})
    field = campaign_service.update_form_field(g.activity, field_id, data, g.current_user)
    return jsonify(field), 200


@campaign_bp.delete("/activities/<activity_id>/form-fields/<field_id>")
@can_manage_activity_required
def delete_form_field(activity_id, field_id):
    campaign_service.delete_form_field(g.activity, field_id, g.current_user)
    return "", 204


# --------------------------------------------------------------------------- #
# Registration form shape (AC-23)                                             #
# --------------------------------------------------------------------------- #

@campaign_bp.get("/activities/<activity_id>/register")
@auth_required
def register_form(activity_id):
    """Return the form shape (core + custom fields) for any logged-in user."""
    from ..repositories.repos import ActivityRepository
    from ..errors import ApiError
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "not_found", 404)
    return jsonify(campaign_service.registration_form(activity)), 200
