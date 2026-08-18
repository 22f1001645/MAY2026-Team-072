"""Campaign controller — CAMPAIGN-04 and CAMPAIGN-05 routes.

Route shape follows schedule_controller.py (plan 05-01):
  - Blueprint url_prefix="/api/v1"
  - URL parameter MUST be spelled <activity_id>: activity_scoped reads
    kwargs.get("activity_id"), so any other spelling silently 404s.
  - g.activity is already loaded and authorised; campaign_service takes
    the Activity object and never re-queries by id.
"""
from flask import Blueprint, g, jsonify, request

from ..errors import ApiError
from ..rbac import auth_required, can_manage_activity_required, meetup_head_required
from ..schemas import FormFieldPatchSchema, FormFieldSchema, MailSchema
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
# Poster upload (CAMPAIGN-03)                                                 #
# --------------------------------------------------------------------------- #

@campaign_bp.post("/activities/<activity_id>/campaign/poster")
@can_manage_activity_required
def upload_poster(activity_id):
    """Attach a poster to the campaign (AC-12, AC-13).

    Deliberately does NOT measure the upload here. ``MAX_CONTENT_LENGTH``
    refuses an oversize body with a 413 before Flask buffers it, whereas a
    length check in this view could only run after the whole body had already
    been read into memory — which is the exhaustion it would be pretending to
    prevent (T-05-51).

    There is no serve route in this module either: AC-14 is satisfied by
    Phase 4's ``GET /api/v1/uploads/<filename>``, which routes through
    ``send_from_directory`` and sets ``nosniff``. A second one here would be a
    second place for those two controls to be forgotten.
    """
    poster = request.files.get("poster")
    if poster is None:
        raise ApiError("Attach a poster image to upload.", "missing_file", 400)
    return jsonify(campaign_service.save_poster(g.activity, poster, g.current_user)), 200


# --------------------------------------------------------------------------- #
# Mail template (CAMPAIGN-01, CAMPAIGN-02)                                    #
# --------------------------------------------------------------------------- #

@campaign_bp.post("/activities/<activity_id>/campaign/generate-mail")
@can_manage_activity_required
def generate_mail(activity_id):
    """Draft the campaign mail (AC-08…AC-11).

    Always 200 when the campaign is editable, even with no AI configured at all:
    the service degrades to a static template and reports it with a ``degraded``
    flag rather than raising, so the campaign pipeline never blocks on the
    availability of a third party (T-05-59).

    ``can_manage_activity_required`` like every other campaign write — any crew
    member may build the package; only the Meetup Head may ship it.
    """
    return jsonify(campaign_service.generate_mail(g.activity, g.current_user)), 200


@campaign_bp.patch("/activities/<activity_id>/campaign/mail")
@can_manage_activity_required
def save_mail(activity_id):
    """Persist the organiser's edited subject and body."""
    data = MailSchema().load(request.get_json() or {})
    return jsonify(campaign_service.save_mail(g.activity, data, g.current_user)), 200


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
