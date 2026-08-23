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
* The asymmetry that makes the guard correct rather than merely strict:
  `create_poll`, `cast_vote` and `submit_query` are scoped to the live window,
  while `close_poll` and `respond_query` deliberately are NOT (08-CONTEXT D-17).
  A future "tidy-up" that gated all five uniformly would leave a team unable to
  close a poll or answer a late question after their own event ended, and it is
  the kind of change that looks like a consistency fix. The test below is what
  says otherwise.
"""
from datetime import datetime, timedelta, timezone

import pytest

from app.constants import (
    EVENT_CANCELLED,
    EVENT_COMPLETED,
    EVENT_LIVE,
    EVENT_UPCOMING,
    POLL_CLOSED,
    QUERY_ANSWERED,
    REGISTRATION_CONFIRMED,
)
from app.extensions import db
from app.models import (
    Activity,
    ActivityTeamMember,
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


def _seed_activity(status=EVENT_LIVE, with_registration=True):
    """One activity, its organiser, and (by default) one confirmed registrant.

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

CLOSED_STATUSES = [EVENT_COMPLETED, EVENT_CANCELLED, EVENT_UPCOMING]


@pytest.mark.parametrize("status", CLOSED_STATUSES)
def test_create_poll_refused_when_event_not_live(client, status):
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
def test_vote_refused_when_event_not_live(client, status):
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
def test_submit_query_refused_when_event_not_live(client, status):
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
    activity = _seed_activity(status=EVENT_LIVE)
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
    activity = _seed_activity(status=EVENT_LIVE)
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
