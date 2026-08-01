from flask import Blueprint, jsonify, request

from ..errors import ApiError
from ..rbac import auth_required
from ..repositories.repos import ActivityRepository

event_bp = Blueprint("events", __name__, url_prefix="/api/v1")


@event_bp.get("/events")
@auth_required
def feed():
    """FR-C2 — city-filtered feed of published events."""
    city = request.args.get("city")
    events = ActivityRepository.published_feed(city)
    return jsonify([e.to_dict() for e in events]), 200


@event_bp.get("/events/<activity_id>")
@auth_required
def detail(activity_id):
    """FR-C3 — event detail page."""
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "not_found", 404)
    return jsonify(activity.to_dict(detail=True)), 200
