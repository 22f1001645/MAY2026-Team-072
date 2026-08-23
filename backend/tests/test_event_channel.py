"""Phase 8: the event channel — polls and Q&A (CHAT-01, CHAT-02, CHAT-03, CHAT-04).

Plans 08-01 and 08-02 each proved their endpoints with a throwaway smoke file and
deleted it, recording that the permanent suite belongs to 08-06. This is that
suite.

What it pins, and why these and not more:

* The registration-window guard (`_assert_channel_open`). ROADMAP Phase 8
  success criterion 3 is that posting to a closed event is refused *server-side*
  with an explicit closed state, not merely hidden in the UI — so the assertion
  is on the 409 and its `registration_window_closed` code, which the frontend
  reads out of the error envelope.
* That the guard gates on a status the application can reach at all. It once
  required `status == "live"`, which nothing ever assigns, so every write path
  was a 409 in production while this suite passed against hand-seeded rows.
  `test_the_channel_is_open_on_the_status_approval_produces` is the test that
  would have caught it, and `_seed_activity` now defaults to that status.
* The asymmetry that makes the guard correct rather than merely strict:
  `create_poll`, `cast_vote` and `submit_query` are scoped to the open window,
  while `close_poll` and `respond_query` deliberately are NOT (08-CONTEXT D-17).
  A future "tidy-up" that gated all five uniformly would leave a team unable to
  close a poll or answer a late question after their own event ended, and it is
  the kind of change that looks like a consistency fix. The test below is what
  says otherwise.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app.constants import (
    EVENT_ARCHIVED,
    EVENT_CANCELLED,
    EVENT_COMPLETED,
    EVENT_UPCOMING,
    POLL_CLOSED,
    QUERY_ANSWERED,
    REGISTRATION_CONFIRMED,
)
from app.extensions import db
from app.models import (
    Activity,
    ActivityTeamMember,
    AuditLog,
    EventPoll,
    EventQuery,
    Organisation,
    Registration,
    User,
)


# --------------------------------------------------------------------------- #
# Fixtures                                                                     #
# --------------------------------------------------------------------------- #

def _token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.get_json()["access_token"]


def _auth(client, email, password):
    return {"Authorization": f"Bearer {_token(client, email, password)}"}


def _organiser(client):
    """crew@ekatva.os — holds NO POR, and is the seeded activity's organiser_id.

    Deliberately the POR-less user rather than rc@ekatva.os: it makes every pass
    below attributable to per-activity authority (`can_manage_activity`) and
    never to an org-wide organiser POR, which is the RBAC-01 distinction Phase 1
    established."""
    return _auth(client, "crew@ekatva.os", "crew12345")


def _registrant(client):
    return _auth(client, "arav@ekatva.os", "student123")


def _seed_activity(status=EVENT_UPCOMING, with_registration=True):
    """One activity, its organiser, and (by default) one confirmed registrant.

    The default status is `upcoming` because that is the only status an approved
    proposal ever produces (`proposal_service` lines 160/330) — seeding anything
    else by hand would let these tests pass against a row the product cannot
    make, which is exactly how the original `live`-only guard survived review.

    Users are fetched by email and the org by type, matching the rest of the
    suite — never by insertion position, so a later addition to _seed_minimal
    cannot silently repoint the lookup."""
    org = Organisation.query.filter_by(type="region").first()
    crew = User.query.filter_by(email="crew@ekatva.os").first()
    student = User.query.filter_by(email="arav@ekatva.os").first()

    activity = Activity(
        title="Hyderabad Community Meetup",
        city="Hyderabad",
        scale="local_meetup",
        capacity=50,
        starts_at=datetime.now(timezone.utc) + timedelta(days=30),
        venue="IITM Research Park",
        org_id=org.id,
        organiser_id=crew.id,
        status=status,
    )
    db.session.add(activity)
    db.session.flush()
    db.session.add(
        ActivityTeamMember(
            activity_id=activity.id, user_id=crew.id, role="Co-Head", added_by=crew.id
        )
    )
    if with_registration:
        db.session.add(
            Registration(
                activity_id=activity.id,
                student_id=student.id,
                status=REGISTRATION_CONFIRMED,
            )
        )
    db.session.commit()
    return activity


def _seed_poll(activity, question="Which slot suits you?"):
    poll = EventPoll(
        activity_id=activity.id,
        question=question,
        options=["Saturday morning", "Sunday evening"],
    )
    db.session.add(poll)
    db.session.commit()
    return poll


def _seed_query(activity, body="Is the venue wheelchair accessible?"):
    student = User.query.filter_by(email="arav@ekatva.os").first()
    query = EventQuery(activity_id=activity.id, user_id=student.id, body=body)
    db.session.add(query)
    db.session.commit()
    return query


# --------------------------------------------------------------------------- #
# The registration-window guard (ROADMAP Phase 8 criterion 3)                  #
# --------------------------------------------------------------------------- #

CLOSED_STATUSES = [EVENT_COMPLETED, EVENT_ARCHIVED, EVENT_CANCELLED]


def test_the_channel_is_open_on_the_status_approval_produces(client):
    """The guard must gate on a status the application can actually reach.

    `upcoming` is what an approved proposal yields and the only status a real
    event ever has, so if it is refused here every write path in the phase is
    dead in production regardless of what the parametrised tests below prove."""
    activity = _seed_activity()
    res = client.post(
        f"/api/v1/events/{activity.id}/polls",
        json={"question": "Which slot suits you?", "options": ["Sat", "Sun"]},
        headers=_organiser(client),
    )
    assert res.status_code == 201, res.get_json()

    res = client.post(
        f"/api/v1/events/{activity.id}/queries",
        json={"body": "Is the venue wheelchair accessible?"},
        headers=_registrant(client),
    )
    assert res.status_code == 201, res.get_json()


@pytest.mark.parametrize("status", CLOSED_STATUSES)
def test_create_poll_refused_once_the_channel_closes(client, status):
    """CHAT-01 scopes poll creation to the registration window."""
    activity = _seed_activity(status=status)
    res = client.post(
        f"/api/v1/events/{activity.id}/polls",
        json={"question": "Which slot suits you?", "options": ["Sat", "Sun"]},
        headers=_organiser(client),
    )
    assert res.status_code == 409, res.get_json()
    assert res.get_json()["code"] == "registration_window_closed"


@pytest.mark.parametrize("status", CLOSED_STATUSES)
def test_vote_refused_once_the_channel_closes(client, status):
    activity = _seed_activity(status=status)
    poll = _seed_poll(activity)
    res = client.post(
        f"/api/v1/events/{activity.id}/polls/{poll.id}/vote",
        json={"option_index": 0},
        headers=_registrant(client),
    )
    assert res.status_code == 409, res.get_json()
    assert res.get_json()["code"] == "registration_window_closed"


@pytest.mark.parametrize("status", CLOSED_STATUSES)
def test_submit_query_refused_once_the_channel_closes(client, status):
    activity = _seed_activity(status=status)
    res = client.post(
        f"/api/v1/events/{activity.id}/queries",
        json={"body": "Is the venue wheelchair accessible?"},
        headers=_registrant(client),
    )
    assert res.status_code == 409, res.get_json()
    assert res.get_json()["code"] == "registration_window_closed"


def test_window_guard_precedes_the_registration_check(client):
    """A closed event answers 409, not 403, even to a total stranger.

    Ordering matters for what the caller is told: the event being over is a fact
    about the event, and reporting it as "you must be registered" would send a
    user off to find a registration button that no longer exists."""
    activity = _seed_activity(status=EVENT_COMPLETED, with_registration=False)
    res = client.post(
        f"/api/v1/events/{activity.id}/queries",
        json={"body": "Is the venue wheelchair accessible?"},
        headers=_auth(client, "head@ekatva.os", "head12345"),
    )
    assert res.status_code == 409, res.get_json()
    assert res.get_json()["code"] == "registration_window_closed"


# --------------------------------------------------------------------------- #
# The other half of the guard: wrap-up stays open (08-CONTEXT D-17)            #
# --------------------------------------------------------------------------- #

def test_close_poll_still_permitted_after_the_event_ends(client):
    """`close_poll` is ungated on purpose — see the module docstring."""
    activity = _seed_activity()
    poll = _seed_poll(activity)

    activity.status = EVENT_COMPLETED
    db.session.commit()

    res = client.patch(
        f"/api/v1/events/{activity.id}/polls/{poll.id}/close",
        headers=_organiser(client),
    )
    assert res.status_code == 200, res.get_json()
    assert res.get_json()["status"] == POLL_CLOSED


def test_respond_query_still_permitted_after_the_event_ends(client):
    """A question asked in the last ten minutes is answered after the event."""
    activity = _seed_activity()
    query = _seed_query(activity)

    activity.status = EVENT_COMPLETED
    db.session.commit()

    res = client.post(
        f"/api/v1/events/{activity.id}/queries/{query.id}/respond",
        json={"response_body": "Yes — step-free entry via the north gate."},
        headers=_organiser(client),
    )
    assert res.status_code == 200, res.get_json()
    body = res.get_json()
    assert body["status"] == QUERY_ANSWERED
    assert body["response_body"] == "Yes — step-free entry via the north gate."


# --------------------------------------------------------------------------- #
# The phase end to end (ROADMAP Phase 8 criteria 1, 2 and 4)                   #
# --------------------------------------------------------------------------- #

def test_channel_end_to_end(client):
    """The whole phase in one pass, over the real HTTP stack.

    Organiser creates a poll, the registrant votes once and cannot vote twice,
    the registrant asks the team a question, the team answers it once. Written
    as one test rather than four because it is the ordering that is being
    checked — each step consumes the id the previous one minted, which is what
    the frontend does and what four isolated tests would not catch."""
    activity = _seed_activity()
    aid = activity.id
    org_h = _organiser(client)
    student_h = _registrant(client)

    # 1. The team creates a poll (CHAT-01).
    res = client.post(
        f"/api/v1/events/{aid}/polls",
        json={
            "question": "Which slot suits you?",
            "options": ["Saturday morning", "Sunday evening"],
        },
        headers=org_h,
    )
    assert res.status_code == 201, res.get_json()
    poll_id = res.get_json()["id"]

    # 2. The registrant votes exactly once.
    res = client.post(
        f"/api/v1/events/{aid}/polls/{poll_id}/vote",
        json={"option_index": 1},
        headers=student_h,
    )
    assert res.status_code == 201, res.get_json()

    res = client.post(
        f"/api/v1/events/{aid}/polls/{poll_id}/vote",
        json={"option_index": 0},
        headers=student_h,
    )
    assert res.status_code == 409, res.get_json()
    assert res.get_json()["code"] == "already_voted"

    # The tally is a lens over the votes, and `my_vote` is per-caller: the voter
    # sees their own choice, the organiser (who did not vote) sees None.
    polls = client.get(f"/api/v1/events/{aid}/polls", headers=student_h).get_json()
    assert polls[0]["vote_counts"] == [0, 1]
    assert polls[0]["my_vote"] == 1
    assert client.get(
        f"/api/v1/events/{aid}/polls", headers=org_h
    ).get_json()[0]["my_vote"] is None

    # 3. The registrant asks the team a question (CHAT-02).
    res = client.post(
        f"/api/v1/events/{aid}/queries",
        json={"body": "Is the venue wheelchair accessible?"},
        headers=student_h,
    )
    assert res.status_code == 201, res.get_json()
    query_id = res.get_json()["id"]

    # 4. The team answers it, once (CHAT-03).
    answer = "Yes — step-free entry via the north gate."
    res = client.post(
        f"/api/v1/events/{aid}/queries/{query_id}/respond",
        json={"response_body": answer},
        headers=org_h,
    )
    assert res.status_code == 200, res.get_json()
    assert res.get_json()["status"] == QUERY_ANSWERED

    res = client.post(
        f"/api/v1/events/{aid}/queries/{query_id}/respond",
        json={"response_body": "Second thoughts."},
        headers=org_h,
    )
    assert res.status_code == 409, res.get_json()
    assert res.get_json()["code"] == "already_answered"

    # The asker sees their own question with the answer attached.
    mine = client.get(f"/api/v1/events/{aid}/queries/mine", headers=student_h).get_json()
    assert len(mine) == 1
    assert mine[0]["response_body"] == answer


def test_a_poll_past_closes_at_refuses_votes_and_reads_as_closed(client):
    """`closes_at` is on the wire, so it has to mean something.

    A field a client can read and cannot trust is worse than no field: without
    this, a poll whose close time passed an hour ago still reported "open" and
    still accepted votes."""
    activity = _seed_activity()
    poll = _seed_poll(activity)
    poll.closes_at = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(hours=1)
    db.session.commit()

    res = client.post(
        f"/api/v1/events/{activity.id}/polls/{poll.id}/vote",
        json={"option_index": 0},
        headers=_registrant(client),
    )
    assert res.status_code == 409, res.get_json()
    assert res.get_json()["code"] == "poll_closed"

    listed = client.get(
        f"/api/v1/events/{activity.id}/polls", headers=_registrant(client)
    ).get_json()
    assert listed[0]["status"] == POLL_CLOSED


def test_a_stranger_cannot_read_an_events_polls(client):
    """Poll questions and tallies are the registrants' surface, not the web's.

    Activity ids are enumerable from the public city feed, so a route on
    `auth_required` alone hands every logged-in student every event's polls and
    per-option counts. `/queries` is team-gated against the same leak; this is
    the read half of the pair. A nonexistent event 404s for the same reason."""
    activity = _seed_activity(with_registration=False)
    _seed_poll(activity)
    stranger = _auth(client, "head@ekatva.os", "head12345")

    res = client.get(f"/api/v1/events/{activity.id}/polls", headers=stranger)
    assert res.status_code == 403, res.get_json()

    assert client.get("/api/v1/events/no-such-event/polls", headers=stranger).status_code == 404


def test_a_registrant_never_sees_another_registrants_query(client):
    """CHAT-02's support-ticket model, enforced server-side.

    `/queries` is the team's view and `/queries/mine` is scoped to the caller —
    so the second registrant's request for the team view is a 403, and their own
    view is empty rather than a window onto the first registrant's question."""
    activity = _seed_activity()
    aid = activity.id
    other = User.query.filter_by(email="head@ekatva.os").first()
    db.session.add(
        Registration(
            activity_id=aid, student_id=other.id, status=REGISTRATION_CONFIRMED
        )
    )
    db.session.commit()

    client.post(
        f"/api/v1/events/{aid}/queries",
        json={"body": "Is the venue wheelchair accessible?"},
        headers=_registrant(client),
    )

    other_h = _auth(client, "head@ekatva.os", "head12345")
    assert client.get(f"/api/v1/events/{aid}/queries", headers=other_h).status_code == 403
    assert client.get(f"/api/v1/events/{aid}/queries/mine", headers=other_h).get_json() == []


def test_only_the_teams_moderation_actions_are_audited(client):
    """CHAT-03 ships the audit trail with the feature (08-CONTEXT D-16).

    Create, close and respond are the team acting on the community's behalf and
    are logged. A vote and a question are routine attendee activity and are not
    — an audit row per vote would bury the moderation trail it exists to show."""
    activity = _seed_activity()
    aid = activity.id
    org_h = _organiser(client)
    student_h = _registrant(client)

    poll_id = client.post(
        f"/api/v1/events/{aid}/polls",
        json={"question": "Which slot suits you?", "options": ["Sat", "Sun"]},
        headers=org_h,
    ).get_json()["id"]
    client.post(
        f"/api/v1/events/{aid}/polls/{poll_id}/vote",
        json={"option_index": 0},
        headers=student_h,
    )
    client.patch(f"/api/v1/events/{aid}/polls/{poll_id}/close", headers=org_h)

    query_id = client.post(
        f"/api/v1/events/{aid}/queries",
        json={"body": "Is the venue wheelchair accessible?"},
        headers=student_h,
    ).get_json()["id"]
    client.post(
        f"/api/v1/events/{aid}/queries/{query_id}/respond",
        json={"response_body": "Yes."},
        headers=org_h,
    )

    poll_actions = [
        a.action for a in AuditLog.query.filter_by(entity="poll", entity_id=poll_id).all()
    ]
    assert sorted(poll_actions) == ["Poll closed", "Poll created"]

    query_actions = [
        a.action for a in AuditLog.query.filter_by(entity="query", entity_id=query_id).all()
    ]
    assert query_actions == ["Query answered"]
