"""Feedback controller — FEEDBACK-02.

Two routes:
- POST /api/v1/activities/<activity_id>/feedback   — submit a rating + comment
- GET  /api/v1/activities/<activity_id>/feedback/me — check own submission

Both require an authenticated user.  The attendance gate and duplicate check
live in feedback_service, not here (same pattern as the registration/scan split
in registration_controller vs attendance_service).
"""

from flask import Blueprint, g, jsonify, request

from ..rbac import auth_required
from ..schemas import FeedbackSchema
from ..services import feedback_service

feedback_bp = Blueprint("feedback", __name__, url_prefix="/api/v1")


@feedback_bp.post("/activities/<activity_id>/feedback")
@auth_required
def submit_feedback(activity_id):
    """FEEDBACK-02 — submit a 1-5 star rating for an attended event."""
    data = FeedbackSchema().load(request.get_json() or {})
    result = feedback_service.submit(activity_id, data, g.current_user)
    return jsonify(result), 201


@feedback_bp.get("/activities/<activity_id>/feedback/me")
@auth_required
def my_feedback(activity_id):
    """Return the caller's existing feedback or {submitted: false}.

    Called on EventDetail mount so the form stays in success state across
    page reloads without requiring the user to re-submit (idempotent render)."""
    result = feedback_service.get_mine(activity_id, g.current_user)
    return jsonify(result), 200
