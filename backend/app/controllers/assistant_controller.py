from flask import Blueprint, g, jsonify, request

from ..errors import ApiError
from ..rbac import auth_required, can_manage_activity, has_organiser_por
from ..repositories.repos import ActivityRepository
from ..services import assistant_service

assistant_bp = Blueprint("assistant", __name__, url_prefix="/api/v1")


@assistant_bp.post("/assistant/ask")
@auth_required
def ask():
    """Answer "where do I go to do X?" for the signed-in user.

    Auth-gated rather than public because the answer is shaped by what this
    person can reach: the route catalogue is filtered by role and POR *before*
    the question is composed, so an assistant talking to a student is never
    holding the admin pages in the first place.

    Without an activity_id it reads no domain record at all — it maps a question
    onto a list of pages, which is why signed-in is the only check it needs. With
    one, it becomes the copilot for that event and does read its records, so the
    stricter can_manage_activity gate applies below.
    """
    payload = request.get_json(silent=True) or {}

    # An activity_id switches the assistant into copilot mode for that event.
    # The permission check happens HERE, before any of its records are read:
    # the service is only ever handed an activity this user may manage, which is
    # what makes "cannot discuss another Head's event" structural rather than a
    # rule the model is asked to follow.
    activity = None
    activity_id = payload.get("activity_id")
    if activity_id:
        activity = ActivityRepository.by_id(activity_id)
        if not activity:
            raise ApiError("Event not found", "not_found", 404)
        if not can_manage_activity(g.current_user, activity):
            raise ApiError("You do not run this event.", "forbidden", 403)

    result = assistant_service.answer(
        payload.get("question"),
        role=g.current_user.role,
        # A student holding an active Regional Coordinator POR is an organiser
        # for navigation purposes, which is the same predicate the view switcher
        # and the dashboards use.
        is_organiser=has_organiser_por(g.current_user),
        activity=activity,
    )
    return jsonify(result), 200
