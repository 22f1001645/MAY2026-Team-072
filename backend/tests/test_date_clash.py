"""Date-clash detection — the advisory warning behind two meetups on one weekend.

Two events in one city on one Saturday split a turnout neither can afford to
halve, and nothing in the system noticed until someone recognised the date by
eye. `/activities/clashes` is the read behind that warning.

The endpoint is deliberately advisory: these tests pin *what it reports*, and
one of them pins that it stays a report. Nothing here asserts that a submission
is ever blocked, because a clash is sometimes the plan — a fest weekend is made
of overlapping things.
"""

from datetime import datetime, timedelta

import pytest

from app.extensions import db
from app.models import Activity, Organisation, Proposal, User


BASE = datetime(2026, 9, 16, 14, 0, 0)


def _approved_activity(title, city, starts_at, status="upcoming"):
    """An approved, published activity — the only kind that can clash."""
    org = Organisation.query.first()
    organiser = User.query.filter_by(email="rc@ekatva.os").first()
    activity = Activity(
        title=title,
        city=city,
        scale="local_meetup",
        venue="Somewhere",
        starts_at=starts_at,
        capacity=40,
        status=status,
        org_id=org.id,
        organiser_id=organiser.id if organiser else None,
    )
    db.session.add(activity)
    db.session.flush()
    db.session.add(Proposal(activity_id=activity.id, status="approved"))
    db.session.commit()
    return activity


def _get(client, headers, city, starts_at, exclude_id=None):
    url = f"/api/v1/activities/clashes?city={city}&starts_at={starts_at.isoformat()}Z"
    if exclude_id:
        url += f"&exclude_id={exclude_id}"
    return client.get(url, headers=headers)


def test_reports_an_approved_event_on_the_same_day(app, client, rc_headers):
    _approved_activity("Regional Fest", "Hyderabad", BASE)

    res = _get(client, rc_headers, "Hyderabad", BASE + timedelta(hours=3))

    assert res.status_code == 200
    titles = [c["title"] for c in res.get_json()]
    assert "Regional Fest" in titles


def test_a_different_city_is_not_a_clash(app, client, rc_headers):
    """The whole premise is a split *local* crowd. Two cities do not compete."""
    _approved_activity("Regional Fest", "Hyderabad", BASE)

    res = _get(client, rc_headers, "Bengaluru", BASE)

    assert res.get_json() == []


def test_a_distant_date_is_not_a_clash(app, client, rc_headers):
    _approved_activity("Regional Fest", "Hyderabad", BASE)

    res = _get(client, rc_headers, "Hyderabad", BASE + timedelta(days=10))

    assert res.get_json() == []


def test_an_unapproved_proposal_never_clashes(app, client, rc_headers):
    """A pending draft is not a commitment.

    If it counted, any organiser could park a proposal on a date and have it
    warn every later one off that weekend.
    """
    org = Organisation.query.first()
    activity = Activity(
        title="Merely Proposed",
        city="Hyderabad",
        scale="local_meetup",
        venue="Somewhere",
        starts_at=BASE,
        capacity=40,
        status="upcoming",
        org_id=org.id,
    )
    db.session.add(activity)
    db.session.flush()
    db.session.add(Proposal(activity_id=activity.id, status="submitted"))
    db.session.commit()

    res = _get(client, rc_headers, "Hyderabad", BASE)

    assert res.get_json() == []


def test_a_cancelled_event_never_clashes(app, client, rc_headers):
    _approved_activity("Called Off", "Hyderabad", BASE, status="cancelled")

    res = _get(client, rc_headers, "Hyderabad", BASE)

    assert res.get_json() == []


def test_exclude_id_stops_an_event_clashing_with_itself(app, client, rc_headers):
    """Without this, every approved event warns about itself in the admin drawer."""
    activity = _approved_activity("Regional Fest", "Hyderabad", BASE)

    res = _get(client, rc_headers, "Hyderabad", BASE, exclude_id=activity.id)

    assert res.get_json() == []


def test_requires_city_and_date(app, client, rc_headers):
    assert client.get("/api/v1/activities/clashes?city=Hyderabad", headers=rc_headers).status_code == 400
    assert client.get(
        f"/api/v1/activities/clashes?starts_at={BASE.isoformat()}Z", headers=rc_headers
    ).status_code == 400


def test_rejects_an_unparseable_date(app, client, rc_headers):
    res = client.get(
        "/api/v1/activities/clashes?city=Hyderabad&starts_at=not-a-date", headers=rc_headers
    )
    assert res.status_code == 400


def test_a_student_cannot_enumerate_the_city_calendar(app, client, student_headers):
    """Organiser-gated: this exposes the approved calendar for a city."""
    res = _get(client, student_headers, "Hyderabad", BASE)
    assert res.status_code == 403
