"""The Ekatva assistant — navigation mode, event copilot mode, and the draft rule.

These tests run with no GEMINI_API_KEY, which is deliberate rather than a
limitation: the deterministic path is the one that has to hold on a grader's
laptop and in CI, and it is where the guarantees actually live. What a model
writes is not assertable; what the service is *willing to tell whom* is, and
that is what is pinned here.
"""

from datetime import datetime, timedelta

import pytest

from app.extensions import db
from app.models import Activity, Attendance, BudgetLine, Expense, Organisation, Proposal, Registration, User
from app.services import assistant_service


@pytest.fixture(autouse=True)
def _no_gemini_key(app):
    """Force the deterministic fallback regardless of the developer's own
    environment — the docstring above promises "no GEMINI_API_KEY", but
    TestConfig inherits it from the real one via os.getenv, so a machine with
    a key configured for manual testing would otherwise hit the live API here,
    same guard as test_org_profile_brand_kit.py and test_campaign_package.py."""
    app.config["GEMINI_API_KEY"] = None


def _ask(client, headers, question, activity_id=None):
    body = {"question": question}
    if activity_id:
        body["activity_id"] = activity_id
    return client.post("/api/v1/assistant/ask", json=body, headers=headers)


# --------------------------------------------------------------- navigation
def test_navigation_answers_a_student(app, client, student_headers):
    res = _ask(client, student_headers, "where is my QR pass?")

    assert res.status_code == 200
    body = res.get_json()
    assert body["mode"] == "navigation"
    assert "/me" in [link["path"] for link in body["links"]]


def test_a_student_is_never_offered_an_admin_page(app, client, student_headers):
    """The catalogue is filtered before the question is composed.

    A page that was never in the prompt cannot be recommended, which is why this
    is a containment property and not a matter of instructing the model politely.
    """
    res = _ask(client, student_headers, "how do I approve a proposal and pay reimbursements?")

    paths = [link["path"] for link in res.get_json()["links"]]
    assert not any(p.startswith("/admin") for p in paths)


def test_an_admin_is_offered_the_admin_page(app, client, admin_headers):
    res = _ask(client, admin_headers, "where do I approve a proposal?")

    paths = [link["path"] for link in res.get_json()["links"]]
    assert "/admin/approvals" in paths


def test_an_unmatched_question_says_so_rather_than_guessing(app, client, student_headers):
    res = _ask(client, student_headers, "what is the airspeed velocity of an unladen swallow")

    body = res.get_json()
    assert body["links"] == []
    assert "matches" in body["answer"].lower() or "nothing" in body["answer"].lower()


def test_a_question_is_required(app, client, student_headers):
    assert _ask(client, student_headers, "   ").status_code == 400


def test_an_overlong_question_is_refused(app, client, student_headers):
    assert _ask(client, student_headers, "a" * 501).status_code == 400


def test_the_assistant_needs_a_session(app, client):
    assert client.post("/api/v1/assistant/ask", json={"question": "hello"}).status_code == 401


# ------------------------------------------------------------------ copilot
@pytest.fixture
def event_with_money(app):
    """An approved activity owned by rc@ekatva.os with a budget and one bill."""
    org = Organisation.query.first()
    organiser = User.query.filter_by(email="rc@ekatva.os").first()
    activity = Activity(
        title="Hyderabad Coffee & Code",
        city="Hyderabad",
        scale="local_meetup",
        venue="Roastery",
        starts_at=datetime(2026, 9, 16, 14, 0),
        capacity=40,
        status="upcoming",
        org_id=org.id,
        organiser_id=organiser.id,
    )
    db.session.add(activity)
    db.session.flush()
    db.session.add(Proposal(activity_id=activity.id, status="approved"))

    line = BudgetLine(activity_id=activity.id, label="Venue", planned=10_000)
    db.session.add(line)
    db.session.flush()
    db.session.add(
        Expense(
            activity_id=activity.id,
            budget_line_id=line.id,
            label="Room hire",
            amount=4_000,
            status="verified",
        )
    )
    db.session.commit()
    return activity


def test_the_copilot_does_the_budget_arithmetic(app, client, rc_headers, event_with_money):
    res = _ask(client, rc_headers, "how much budget is remaining?", event_with_money.id)

    body = res.get_json()
    assert body["mode"] == "event"
    # 10,000 planned less 4,000 spent. The number is the whole point of the answer.
    assert "6,000" in body["answer"]


def test_the_copilot_knows_the_meetup_cap(app, client, rc_headers, event_with_money):
    """PROPOSAL-02: capacity x 200, capped at 20,000, for meetup scales.

    40 x 200 = 8,000, so this event's ceiling is 8,000 and not the headline
    20,000 — exactly the distinction a Meetup Head gets wrong.
    """
    res = _ask(client, rc_headers, "what happens if we exceed 20000?", event_with_money.id)

    assert "8,000" in res.get_json()["answer"]


def test_a_fest_is_reported_as_uncapped(app, client, rc_headers, event_with_money):
    event_with_money.scale = "regional_fest"
    db.session.commit()

    res = _ask(client, rc_headers, "is there a budget cap?", event_with_money.id)

    assert "no automatic cap" in res.get_json()["answer"].lower()


def test_the_copilot_counts_heads_from_the_records(app, client, rc_headers, event_with_money):
    student = User.query.filter_by(email="arav@ekatva.os").first()
    reg = Registration(activity_id=event_with_money.id, student_id=student.id, status="confirmed")
    db.session.add(reg)
    db.session.flush()
    # Attendance is its own row — the thing the door scan writes.
    db.session.add(Attendance(registration_id=reg.id))
    db.session.commit()

    res = _ask(client, rc_headers, "how many people have checked in?", event_with_money.id)

    answer = res.get_json()["answer"]
    assert "1 of 40" in answer and "1 have checked in" in answer


def test_an_empty_task_board_explains_itself(app, client, rc_headers, event_with_money):
    """"No tasks" and "the board has not opened" are different facts.

    Reporting the first when the second is true tells a Meetup Head everything is
    done when nothing has started.
    """
    res = _ask(client, rc_headers, "who hasn't completed their tasks?", event_with_money.id)

    assert "workspace opens" in res.get_json()["answer"]


# ------------------------------------------------------- the containment line
def test_a_student_cannot_open_a_copilot_on_someone_elses_event(
    app, client, student_headers, event_with_money
):
    """The refusal happens before a single record is read."""
    res = _ask(client, student_headers, "how much budget is remaining?", event_with_money.id)

    assert res.status_code == 403


def test_an_unknown_event_is_a_404_not_a_leak(app, client, rc_headers):
    res = _ask(client, rc_headers, "how much budget is remaining?", "nope")
    assert res.status_code == 404


# --------------------------------------------------------------- the drafting
def test_a_send_request_produces_a_draft_and_sends_nothing(
    app, client, rc_headers, event_with_money
):
    """The copilot has no path to the broadcast endpoint.

    Asked to remind the team it returns words for a person to send. If this ever
    starts sending, a misread sentence reaches every registered student with no
    undo — so the absence of a notification here is the assertion.
    """
    from app.models import Notification

    before = Notification.query.count()

    res = _ask(client, rc_headers, "send a reminder to the logistics team", event_with_money.id)

    body = res.get_json()
    assert body["draft"], "a send request must come back as a draft"
    assert event_with_money.title in body["draft"]
    assert "send it yourself" in body["answer"].lower()
    assert Notification.query.count() == before


@pytest.mark.parametrize(
    "phrase",
    ["remind the team", "send an update", "announce the venue change", "notify everyone"],
)
def test_send_intent_is_recognised(phrase):
    assert assistant_service.wants_to_send(phrase)


@pytest.mark.parametrize("phrase", ["how much budget is left", "who is coming", "what is pending"])
def test_a_question_is_not_a_send_request(phrase):
    assert not assistant_service.wants_to_send(phrase)
