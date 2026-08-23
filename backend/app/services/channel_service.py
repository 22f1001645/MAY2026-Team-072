"""Event channel — polls (CHAT-01) and queries (CHAT-02/CHAT-03).

The channel is the organising team broadcasting into an event and registrants
answering: the team asks a poll, registrants vote once each, the team closes it;
a registrant asks the team a question, one team member answers it once.

Three rules shape everything here:

* `_assert_channel_open` gates the surfaces that belong to the event's open
  window — creating a poll, voting on one, and submitting a query. The window is
  the same one `registration_service.register` honours: an event is open from
  approval (`upcoming`) until it is completed, archived or cancelled. Gating on
  `status == "live"` instead would close the channel on every event that exists,
  because nothing in the application ever assigns that status. `close_poll` and
  `respond_query` are deliberately NOT gated, because wrapping up a poll or
  answering a lingering question after the event has ended is exactly when a
  team needs to (D-17).
* Voting once per poll is enforced by `uq_poll_vote` in the database, never by a
  check-then-insert here. A service-layer duplicate check can be raced; the
  constraint cannot (D-05), so `cast_vote` inserts and translates the
  IntegrityError into a 409.
* Only the team's moderation actions write audit rows — `create_poll`,
  `close_poll` and `respond_query`. `cast_vote` and `submit_query` are routine
  attendee activity and stay unlogged (D-16).
"""
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from ..constants import (
    EVENT_ARCHIVED,
    EVENT_CANCELLED,
    EVENT_COMPLETED,
    POLL_CLOSED,
    POLL_OPEN,
    QUERY_ANSWERED,
    QUERY_OPEN,
)
from ..errors import ApiError
from ..extensions import db
from ..models import EventPoll, EventPollVote, EventQuery
from ..rbac import can_participate_in_activity
from ..repositories.repos import ActivityRepository, AuditRepository


def _activity_or_404(activity_id: str):
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "not_found", 404)
    return activity


# The statuses that close the channel. Stated as the closed set rather than the
# open one so a status added later defaults to open, and so the set can be read
# beside `registration_service.register` — which opens registration for exactly
# the complement of this.
CHANNEL_CLOSED_STATUSES = (EVENT_COMPLETED, EVENT_ARCHIVED, EVENT_CANCELLED)


def _assert_channel_open(activity):
    if activity.status in CHANNEL_CLOSED_STATUSES:
        raise ApiError(
            "Posting to this event is no longer available.",
            "registration_window_closed",
            409,
        )


def _poll_or_404(activity_id: str, poll_id: str) -> EventPoll:
    """Fetch a poll and confirm it belongs to THIS activity.

    The activity id is checked rather than trusted: without it, a poll id from
    one event would be votable and closable through any other event's URL, and
    the route guard authorises against the activity in the path."""
    poll = EventPoll.query.get(poll_id)
    if poll is None or poll.activity_id != activity_id:
        raise ApiError("Poll not found", "not_found", 404)
    return poll


def _poll_expired(poll: EventPoll) -> bool:
    """Has `closes_at` passed? A poll past it is closed however its row reads.

    The column is naive and marshmallow hands back whatever the client sent, so
    an aware value is normalised rather than compared across kinds (which raises
    in Python). Effective state is computed rather than written back because
    nothing runs on a schedule to do the writing."""
    if not poll.closes_at:
        return False
    closes_at = poll.closes_at
    if closes_at.tzinfo is not None:
        closes_at = closes_at.astimezone(timezone.utc).replace(tzinfo=None)
    return closes_at <= datetime.now(timezone.utc).replace(tzinfo=None)


def create_poll(activity_id, question, options, closes_at, current_user) -> EventPoll:
    activity = _activity_or_404(activity_id)
    _assert_channel_open(activity)

    poll = EventPoll(
        activity_id=activity_id,
        question=question,
        options=options,
        closes_at=closes_at,
        created_by=current_user.id,
        status=POLL_OPEN,
    )
    db.session.add(poll)
    db.session.flush()  # the audit row needs the poll's id
    AuditRepository.record("poll", poll.id, "Poll created", current_user, note=question)
    db.session.commit()
    return poll


def list_polls(activity_id, viewer_id) -> list:
    """Every poll on the event, newest first, with counts and the caller's vote.

    The caller is always known: the route is `can_participate_in_activity_required`,
    which 404s an unknown event and 403s a non-registrant before this runs, so
    there is no anonymous branch to defend.

    `joinedload` is not an optimisation here so much as the difference between
    one query and one-per-poll: the counts are computed in Python over the
    already-loaded votes (meetup scale, well under a thousand rows)."""
    polls = (
        EventPoll.query.filter_by(activity_id=activity_id)
        .options(joinedload(EventPoll.votes))
        .order_by(EventPoll.created_at.desc())
        .all()
    )
    result = []
    for poll in polls:
        payload = poll.to_dict()
        # Report the effective state, so a poll past `closes_at` renders as
        # closed instead of offering a ballot the vote route will refuse.
        if _poll_expired(poll):
            payload["status"] = POLL_CLOSED
        payload["vote_counts"] = [
            sum(1 for v in poll.votes if v.option_index == i)
            for i in range(len(poll.options or []))
        ]
        payload["my_vote"] = next(
            (v.option_index for v in poll.votes if v.user_id == viewer_id), None
        )
        result.append(payload)
    return result


def cast_vote(activity_id, poll_id, option_index, current_user) -> EventPollVote:
    activity = _activity_or_404(activity_id)
    _assert_channel_open(activity)

    if not can_participate_in_activity(current_user, activity):
        raise ApiError(
            "You must be registered for this event to vote", "forbidden", 403
        )

    poll = _poll_or_404(activity_id, poll_id)
    if poll.status != POLL_OPEN or _poll_expired(poll):
        raise ApiError("This poll is closed", "poll_closed", 409)
    if not 0 <= option_index < len(poll.options or []):
        raise ApiError("That option does not exist on this poll", "invalid_option", 400)

    vote = EventPollVote(
        poll_id=poll_id, user_id=current_user.id, option_index=option_index
    )
    db.session.add(vote)
    try:
        db.session.commit()
    except IntegrityError:
        # uq_poll_vote. A vote is routine attendee activity, so it writes no
        # audit row — only the team's moderation actions do (D-16).
        db.session.rollback()
        raise ApiError("You have already voted on this poll", "already_voted", 409)
    return vote


def close_poll(activity_id, poll_id, current_user) -> EventPoll:
    """Ungated by `_assert_channel_open` on purpose — see the module docstring."""
    poll = _poll_or_404(activity_id, poll_id)
    poll.status = POLL_CLOSED
    AuditRepository.record("poll", poll.id, "Poll closed", current_user)
    db.session.commit()
    return poll


def _query_or_404(activity_id: str, query_id: str) -> EventQuery:
    """Same activity-scoping as `_poll_or_404`, for the same reason: the route
    guard authorises against the activity in the path, so a bare query id would
    be answerable through any other event's URL."""
    query = EventQuery.query.get(query_id)
    if query is None or query.activity_id != activity_id:
        raise ApiError("Query not found", "not_found", 404)
    return query


def submit_query(activity_id, body, current_user) -> EventQuery:
    activity = _activity_or_404(activity_id)
    _assert_channel_open(activity)

    if not can_participate_in_activity(current_user, activity):
        raise ApiError(
            "You must be registered for this event to ask a question",
            "forbidden",
            403,
        )

    query = EventQuery(
        activity_id=activity_id,
        user_id=current_user.id,
        body=body,
        status=QUERY_OPEN,
    )
    db.session.add(query)
    db.session.commit()
    return query


def list_queries(activity_id) -> list:
    """Every query on the event, newest first — the team's view (D-09)."""
    return (
        EventQuery.query.filter_by(activity_id=activity_id)
        .order_by(EventQuery.created_at.desc())
        .all()
    )


def my_queries(activity_id, current_user) -> list:
    """Only the caller's own questions and their answers — a registrant never
    sees another registrant's query (D-11)."""
    return (
        EventQuery.query.filter_by(activity_id=activity_id, user_id=current_user.id)
        .order_by(EventQuery.created_at.desc())
        .all()
    )


def respond_query(activity_id, query_id, response_body, current_user) -> EventQuery:
    """Ungated by `_assert_channel_open` on purpose — see the module docstring.

    One response per query (D-10): a second attempt is a 409, not an overwrite
    of the answer the registrant has already read."""
    query = _query_or_404(activity_id, query_id)
    if query.status != QUERY_OPEN:
        raise ApiError("Query is already answered", "already_answered", 409)

    query.response_body = response_body
    query.responded_by = current_user.id
    query.responded_at = datetime.now(timezone.utc)
    query.status = QUERY_ANSWERED
    AuditRepository.record("query", query.id, "Query answered", current_user)
    db.session.commit()
    return query
