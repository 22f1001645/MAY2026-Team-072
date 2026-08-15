from flask import Blueprint, g, jsonify, request

from ..errors import ApiError
from ..rbac import auth_required, can_manage_activity_required, public_or_auth
from ..repositories.repos import ActivityRepository
from ..schemas import EditEventSchema
from ..services import event_service

event_bp = Blueprint("events", __name__, url_prefix="/api/v1")


@event_bp.get("/events")
@auth_required
def feed():
    """FR-C2 — city-filtered feed of published events."""
    city = request.args.get("city")
    events = ActivityRepository.published_feed(city)
    return jsonify([e.to_dict() for e in events]), 200


@event_bp.get("/events/<activity_id>")
@public_or_auth
def detail(activity_id):
    """FR-C3 — event detail page.

    Authenticated callers receive the full detail payload (budget, collaborators,
    team_members). Anonymous callers receive the public preview: to_dict() plus
    description (OD-3). The slug is resolved via by_slug_or_id so shared
    registration links work without breaking existing id-based links.
    """
    activity = ActivityRepository.by_slug_or_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "not_found", 404)
    if g.current_user is not None:
        return jsonify(activity.to_dict(detail=True)), 200
    # Anonymous preview — to_dict() base + description
    data = activity.to_dict()
    data["description"] = activity.proposal.description if activity.proposal else None
    return jsonify(data), 200


@event_bp.put("/events/<activity_id>")
@can_manage_activity_required
def update(activity_id):
    """Organiser edits an event's title/description/time/venue."""
    data = EditEventSchema().load(request.get_json() or {})
    activity = event_service.edit_event(activity_id, data, g.current_user)
    return jsonify(activity.to_dict(detail=True)), 200


@event_bp.delete("/events/<activity_id>")
@can_manage_activity_required
def cancel(activity_id):
    """Organiser cancels an event; registrants are notified."""
    activity = event_service.cancel_event(activity_id, g.current_user)
    return jsonify(activity.to_dict(detail=True)), 200
