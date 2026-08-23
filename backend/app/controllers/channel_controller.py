"""FR-D / CHAT-01, CHAT-02, CHAT-03 — the event channel's poll and query endpoints.

Split out of registration_controller.py because polls and queries are their own
surface rather than more registration plumbing.

The guards are asymmetric on purpose: creating and closing a poll, and reading
or answering queries, is the team's authority over THIS event
(`can_manage_activity_required`), while reading polls, voting, and submitting a
query are open to any authenticated caller at the route and narrowed to actual
registrants inside `channel_service`, which is where the registration row can be
seen. `/queries/mine` is auth_required rather than team-gated because it is
scoped to `g.current_user` in the service and can only ever return the caller's
own questions (D-11)."""
from flask import Blueprint, g, jsonify, request

from ..rbac import auth_required, can_manage_activity_required
from ..schemas import (
    PollCreateSchema,
    PollVoteSchema,
    QueryRespondSchema,
    QuerySubmitSchema,
)
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


@channel_bp.post("/events/<activity_id>/queries")
@auth_required
def submit_query(activity_id):
    data = QuerySubmitSchema().load(request.get_json() or {})
    query = channel_service.submit_query(activity_id, data["body"], g.current_user)
    return jsonify(query.to_dict()), 201


@channel_bp.get("/events/<activity_id>/queries")
@can_manage_activity_required
def list_queries(activity_id):
    queries = channel_service.list_queries(activity_id)
    return jsonify([q.to_dict() for q in queries]), 200


@channel_bp.get("/events/<activity_id>/queries/mine")
@auth_required
def my_queries(activity_id):
    queries = channel_service.my_queries(activity_id, g.current_user)
    return jsonify([q.to_dict() for q in queries]), 200


@channel_bp.post("/events/<activity_id>/queries/<query_id>/respond")
@can_manage_activity_required
def respond_query(activity_id, query_id):
    data = QueryRespondSchema().load(request.get_json() or {})
    query = channel_service.respond_query(
        activity_id, query_id, data["response_body"], g.current_user
    )
    return jsonify(query.to_dict()), 200
