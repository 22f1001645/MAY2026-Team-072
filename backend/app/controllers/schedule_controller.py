"""Schedule controller — DESIGN-01 CRUD for EventScheduleItem rows.

Route shape follows proposal_controller.py:
  - Blueprint url_prefix="/api/v1"
  - Guard decorator first, then schema.load(), then service call, then jsonify + status

Key wiring rules (from 05-01 key_links):
  - URL parameter MUST be spelled <activity_id>: activity_scoped reads
    kwargs.get("activity_id"), so any other spelling silently 404s.
  - g.activity is already loaded and authorised; schedule_service takes
    the Activity object and never re-queries by id.
  - The unlock route carries no <activity_id> in its URL segment, so the
    RBAC route-walk test does not demand a scoped guard; but auth_required
    is the correct minimum (threat T-05-06).
"""
from flask import Blueprint, g, jsonify, request

from ..rbac import auth_required, can_manage_activity_required
from ..schemas import ScheduleItemPatchSchema, ScheduleItemSchema
from ..services import schedule_service

schedule_bp = Blueprint("schedule", __name__, url_prefix="/api/v1")


# --------------------------------------------------------------------------- #
# Schedule item CRUD
# --------------------------------------------------------------------------- #

@schedule_bp.get("/activities/<activity_id>/schedule")
@can_manage_activity_required
def list_items(activity_id):
    return jsonify(schedule_service.list_items(g.activity)), 200


@schedule_bp.post("/activities/<activity_id>/schedule")
@can_manage_activity_required
def create_item(activity_id):
    data = ScheduleItemSchema().load(request.get_json() or {})
    item = schedule_service.create_item(g.activity, data, g.current_user)
    return jsonify(item), 201


@schedule_bp.patch("/activities/<activity_id>/schedule/<item_id>")
@can_manage_activity_required
def update_item(activity_id, item_id):
    data = ScheduleItemPatchSchema().load(request.get_json() or {})
    item = schedule_service.update_item(g.activity, item_id, data, g.current_user)
    return jsonify(item), 200


@schedule_bp.delete("/activities/<activity_id>/schedule/<item_id>")
@can_manage_activity_required
def delete_item(activity_id, item_id):
    schedule_service.delete_item(g.activity, item_id, g.current_user)
    return "", 204


# --------------------------------------------------------------------------- #
# Unlock check (AC-04)
# --------------------------------------------------------------------------- #

@schedule_bp.get("/activities/<activity_id>/schedule/unlock")
@can_manage_activity_required
def unlock_check(activity_id):
    """Return 200/{unlocked:True} when the schedule is non-empty; 400/schedule_empty otherwise."""
    schedule_service.assert_schedule_non_empty(g.activity)
    return jsonify({"unlocked": True}), 200


# --------------------------------------------------------------------------- #
# Scale presets (AC-07)
# --------------------------------------------------------------------------- #

@schedule_bp.get("/schedule-presets")
@auth_required
def presets():
    """Return presets for the given scale, or [] for unknown scales.

    This path carries no <activity_id> segment, so the RBAC route-walk test
    does not require a scoped guard; auth_required is the correct minimum
    (threat T-05-06 — prevents anonymous preset harvesting)."""
    scale = request.args.get("scale", "")
    return jsonify(schedule_service.presets_for_scale(scale)), 200
