"""FR-D / CHAT-01 — the event channel's poll endpoints.

Split out of registration_controller.py because polls, and the queries that
follow in 08-02, are their own surface rather than more registration plumbing.

The guards are asymmetric on purpose: creating and closing a poll is the team's
authority over THIS event (`can_manage_activity_required`), while reading and
voting are open to any authenticated caller at the route and narrowed to actual
registrants inside `channel_service.cast_vote`, which is where the registration
row can be seen."""
from flask import Blueprint, g, jsonify, request

from ..rbac import auth_required, can_manage_activity_required
from ..schemas import PollCreateSchema, PollVoteSchema
from ..services import channel_service

channel_bp = Blueprint("channel", __name__, url_prefix="/api/v1")


@channel_bp.post("/events/<activity_id>/polls")
@can_manage_activity_required
def create_poll(activity_id):
    data = PollCreateSchema().load(request.get_json() or {})
    poll = channel_service.create_poll(
        activity_id,
        data["question"],
        data["options"],
        data.get("closes_at"),
        g.current_user,
    )
    return jsonify(poll.to_dict()), 201


@channel_bp.get("/events/<activity_id>/polls")
@auth_required
def list_polls(activity_id):
    polls = channel_service.list_polls(
        activity_id, g.current_user.id if g.current_user else None
    )
    return jsonify(polls), 200


@channel_bp.post("/events/<activity_id>/polls/<poll_id>/vote")
@auth_required
def cast_vote(activity_id, poll_id):
    data = PollVoteSchema().load(request.get_json() or {})
    vote = channel_service.cast_vote(
        activity_id, poll_id, data["option_index"], g.current_user
    )
    return jsonify(vote.to_dict()), 201


@channel_bp.patch("/events/<activity_id>/polls/<poll_id>/close")
@can_manage_activity_required
def close_poll(activity_id, poll_id):
    poll = channel_service.close_poll(activity_id, poll_id, g.current_user)
    return jsonify(poll.to_dict()), 200
