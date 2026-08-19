"""TIMELINE-01 — the event timeline endpoint.

Read-only by construction: the blueprint exposes one GET and the service it
calls never writes, so there is no state this route can move.
"""
from flask import Blueprint, jsonify

from ..errors import ApiError
from ..rbac import auth_required
from ..repositories.repos import ActivityRepository
from ..services import timeline_service

timeline_bp = Blueprint("timeline", __name__, url_prefix="/api/v1")


@timeline_bp.get("/activities/<activity_id>/timeline")
@auth_required
def get_timeline(activity_id):
    """The chronological history of one activity, oldest first.

    404s on an unknown activity rather than returning `[]`. Both an event with
    no history and an event that does not exist would otherwise answer with the
    same empty list, and "nothing has happened yet" is a different fact from
    "there is no such event" — the timeline panel needs to tell them apart.
    """
    if ActivityRepository.by_id(activity_id) is None:
        raise ApiError("Event not found", "event_not_found", 404)

    return jsonify(timeline_service.build_timeline(activity_id)), 200
