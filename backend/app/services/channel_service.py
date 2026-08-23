"""Event channel — polls (CHAT-01).

The channel is the organising team broadcasting into an event and registrants
answering: the team asks a poll, registrants vote once each, the team closes it.

Two rules shape everything here:

* `_assert_channel_open` gates the surfaces that belong to the event's live
  window — creating a poll and voting on one. `close_poll` is deliberately NOT
  gated, because wrapping up a poll after the event has ended is exactly when a
  team needs to (D-17).
* Voting once per poll is enforced by `uq_poll_vote` in the database, never by a
  check-then-insert here. A service-layer duplicate check can be raced; the
  constraint cannot (D-05), so `cast_vote` inserts and translates the
  IntegrityError into a 409.
"""
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from ..constants import EVENT_LIVE, POLL_CLOSED, POLL_OPEN
from ..errors import ApiError
from ..extensions import db
from ..models import EventPoll, EventPollVote
from ..rbac import can_participate_in_activity
from ..repositories.repos import ActivityRepository, AuditRepository


def _activity_or_404(activity_id: str):
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "not_found", 404)
    return activity


def _assert_channel_open(activity):
    if activity.status != EVENT_LIVE:
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


def list_polls(activity_id, viewer_id=None) -> list:
    """Every poll on the event, newest first, with counts and the caller's vote.

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
        payload["vote_counts"] = [
            sum(1 for v in poll.votes if v.option_index == i)
            for i in range(len(poll.options or []))
        ]
        payload["my_vote"] = next(
            (v.option_index for v in poll.votes if v.user_id == viewer_id), None
        ) if viewer_id else None
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
    if poll.status != POLL_OPEN:
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
