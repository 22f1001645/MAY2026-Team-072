from flask import Blueprint, jsonify, request, g

from ..errors import ApiError
from ..rbac import auth_required
from ..repositories.repos import ActivityRepository
from ..services import event_service

event_bp = Blueprint("events", __name__, url_prefix="/api/v1")


@event_bp.get("/events")
@auth_required
def feed():
    """FR-C2 — city-filtered feed of published events."""
    ActivityRepository.sync_past_events()
    city = request.args.get("city")
    scale = request.args.get("scale")
    date_range = request.args.get("dateRange")
    events = ActivityRepository.published_feed(city, scale, date_range)
    return jsonify([e.to_dict() for e in events]), 200


@event_bp.get("/events/<activity_id>")
@auth_required
def detail(activity_id):
    """FR-C3 — event detail page."""
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "not_found", 404)
    return jsonify(activity.to_dict(detail=True)), 200

@event_bp.put("/events/<activity_id>")
@auth_required
def edit_event(activity_id):
    data = request.get_json() or {}
    activity = event_service.edit_event(activity_id, data, g.current_user)
    return jsonify(activity.to_dict(detail=True)), 200

@event_bp.delete("/events/<activity_id>")
@auth_required
def cancel_event(activity_id):
    activity = event_service.cancel_event(activity_id, g.current_user)
    return jsonify(activity.to_dict(detail=True)), 200

