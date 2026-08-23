"""Phase 7 tests: Progression Gating (fest tier).

Covers: PROG-01 (server-computed eligibility), PROG-02 (collaborator
threshold), PROG-04 (the submit-side 403 gate), and threat T-07-01
(a forged org_progression_unlocks row grants nothing).

Test fixture design follows conftest.py conventions: user lookup by email,
org lookup by type, helper functions to obtain auth headers. Helpers are
duplicated from test_proposal_collaboration.py rather than imported — this
project keeps per-module helper blocks.
"""
from datetime import datetime, timedelta

from app.constants import (
    FEST_COLLAB_THRESHOLD,
    TEAM_ROLE_MEETUP_HEAD,
)
from app.extensions import db as _db
from app.models import (
    Activity,
    Organisation,
    Proposal,
    User,
)


# --------------------------------------------------------------------------- #
# Helpers — login and seeding
# --------------------------------------------------------------------------- #

def _token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.get_json()["access_token"]


def _auth(client, email, password):
    return {"Authorization": f"Bearer {_token(client, email, password)}"}


def _seed_org(name, typ="society", city="Chennai"):
    o = Organisation(name=name, type=typ, city=city)
    _db.session.add(o)
    _db.session.commit()
    return o


def _seed_completed_meetup(org, city, scale, days_ago=30, proposal_status="approved"):
    """Seed one past-dated Activity in `city` plus its Proposal row.

    `Activity.status` is deliberately left at "upcoming". Eligibility must pass
    on the (approved proposal + past start date) formula alone — the status
    column is not the completion test, because sync_past_events() flips it on
    any past-dated activity with no reference to proposal status.

    days_ago may be negative to seed a future-dated activity.
    """
    a = Activity(
        org_id=org.id,
        title=f"{scale} in {city}",
        city=city,
        scale=scale,
        venue="Somewhere",
        starts_at=datetime.now() - timedelta(days=days_ago),
        capacity=50,
        status="upcoming",
    )
    _db.session.add(a)
    _db.session.flush()
    _db.session.add(Proposal(activity_id=a.id, status=proposal_status))
    _db.session.commit()
    return a


def _seed_track_record(org, city):
    """The completed local + regional pair that unlocks fest tier in `city`."""
    _seed_completed_meetup(org, city, "local_meetup")
    _seed_completed_meetup(org, city, "regional_meetup", days_ago=20)


def _seed_secondary_orgs(count):
    """`count` distinct organisations, returned as a list of ids."""
    return [_seed_org(f"Partner Society {i}", "society", "Hyderabad").id
            for i in range(count)]


def _fest_payload(org_id, team_user_id, city="Hyderabad", collaborating_org_ids=None):
    """A regional_fest proposal that is valid in every respect except progression.

    It names exactly one Meetup Head so the PROPOSAL-02 guard never fires first
    and turns a progression assertion into a 400 about the team roster.
    """
    return {
        "title": "Hyderabad Regional Fest",
        "org_id": org_id,
        "city": city,
        "scale": "regional_fest",
        "venue": "Hitex Exhibition Centre",
        "starts_at": "2027-03-15T10:00:00",
        "capacity": 500,
        "description": "The regional fest for IITM BS students",
        "budget": [{"label": "Venue", "planned": 3000}],
        "team": [{"user_id": team_user_id, "role": TEAM_ROLE_MEETUP_HEAD}],
        "collaborating_org_ids": collaborating_org_ids or [],
    }


def _region_and_head(app):
    """(region org id, a user id usable as Meetup Head) from the seeded fixtures."""
    with app.app_context():
        return (
            Organisation.query.filter_by(type="region").first().id,
            User.query.filter_by(email="arav@ekatva.os").first().id,
        )


# --------------------------------------------------------------------------- #
# PROG-01 / PROG-04: the fest lock, end to end over HTTP
# --------------------------------------------------------------------------- #

class TestFestLock:
    def test_fest_locked_with_no_track_record(self, app, client):
        """PROG-01: an org with nothing completed cannot propose a fest."""
        org_id, head_id = _region_and_head(app)
        res = client.post(
            "/api/v1/activities",
            json=_fest_payload(org_id, head_id),
            headers=_auth(client, "rc@ekatva.os", "rc12345"),
        )
        assert res.status_code == 403, res.get_json()
        assert res.get_json()["code"] == "fest_locked"
        assert "0 of 2" in res.get_json()["error"]

    def test_fest_locked_with_only_local(self, app, client):
        """PROG-01: one half of the pair is not enough; the refusal says so."""
        org_id, head_id = _region_and_head(app)
        with app.app_context():
            org = Organisation.query.filter_by(type="region").first()
            _seed_completed_meetup(org, "Hyderabad", "local_meetup")
        res = client.post(
            "/api/v1/activities",
            json=_fest_payload(org_id, head_id),
            headers=_auth(client, "rc@ekatva.os", "rc12345"),
        )
        assert res.status_code == 403, res.get_json()
        assert res.get_json()["code"] == "fest_locked"
        message = res.get_json()["error"]
        assert "Hyderabad" in message
        assert "1 of 2" in message

    def test_fest_unlocks_with_both(self, app, client):
        """PROG-01: an approved past-dated local + regional pair unlocks fest."""
        org_id, head_id = _region_and_head(app)
        with app.app_context():
            org = Organisation.query.filter_by(type="region").first()
            _seed_track_record(org, "Hyderabad")
            collab_ids = _seed_secondary_orgs(FEST_COLLAB_THRESHOLD - 1)
        res = client.post(
            "/api/v1/activities",
            json=_fest_payload(org_id, head_id, collaborating_org_ids=collab_ids),
            headers=_auth(client, "rc@ekatva.os", "rc12345"),
        )
        assert res.status_code == 201, res.get_json()

    def test_direct_submit_of_locked_scale_is_403(self, app, client):
        """T-07-02/T-07-03: the gate is server-side and has no admin bypass.

        The UI lock is presentation. A direct API call from a POR holder AND
        from an admin — who bypasses the PROPOSAL-00 POR check at submit — are
        both refused identically, because PROG-04 carves out nobody.
        """
        org_id, head_id = _region_and_head(app)
        payload = _fest_payload(org_id, head_id)
        for email, password in (("rc@ekatva.os", "rc12345"), ("admin@ekatva.os", "admin123")):
            res = client.post(
                "/api/v1/activities", json=payload, headers=_auth(client, email, password)
            )
            assert res.status_code == 403, (email, res.get_json())
            assert res.get_json()["code"] == "fest_locked", email
        with app.app_context():
            assert Activity.query.filter_by(scale="regional_fest").count() == 0
