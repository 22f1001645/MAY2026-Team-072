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
    ActivityCollaborator,
    ContributionPoint,
    Organisation,
    OrgProgressionUnlock,
    Proposal,
    User,
)
from app.repositories.repos import ActivityRepository
from app.services import proposal_service


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


def _seed_completed_meetup(org, city, scale, days_ago=30, proposal_status="approved",
                           organiser_id=None):
    """Seed one past-dated Activity in `city` plus its Proposal row.

    `Activity.status` is deliberately left at "upcoming". Eligibility must pass
    on the (approved proposal + past start date) formula alone — the status
    column is not the completion test, because sync_past_events() flips it on
    any past-dated activity with no reference to proposal status.

    days_ago may be negative to seed a future-dated activity.

    `organiser_id` is required only when the row will later be pushed through
    decide(): both the approve and the revoke branch notify the organiser, and
    Notification.user_id is NOT NULL.
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
        organiser_id=organiser_id,
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


# --------------------------------------------------------------------------- #
# PROG-02: the named-collaborator threshold at submit (D-01, named half)
# --------------------------------------------------------------------------- #

class TestFestCollaboratorThreshold:
    def test_fest_named_shortfall_refused(self, app, client):
        """PROG-02: short of the threshold, with the shortfall named numerically."""
        org_id, head_id = _region_and_head(app)
        short_by_one = FEST_COLLAB_THRESHOLD - 2  # + the primary = threshold - 1
        with app.app_context():
            org = Organisation.query.filter_by(type="region").first()
            _seed_track_record(org, "Hyderabad")
            collab_ids = _seed_secondary_orgs(short_by_one)
        res = client.post(
            "/api/v1/activities",
            json=_fest_payload(org_id, head_id, collaborating_org_ids=collab_ids),
            headers=_auth(client, "rc@ekatva.os", "rc12345"),
        )
        assert res.status_code == 403, res.get_json()
        assert res.get_json()["code"] == "fest_collaborators_required"
        assert (f"{short_by_one + 1} of {FEST_COLLAB_THRESHOLD}"
                in res.get_json()["error"])

    def test_fest_named_threshold_boundary(self, app, client):
        """PROG-02: threshold - 1 secondaries is enough, because primary counts."""
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

    def test_duplicate_collaborator_ids_do_not_satisfy_threshold(self, app, client):
        """T-07-04: the count reads the deduped list, never the raw request list."""
        org_id, head_id = _region_and_head(app)
        with app.app_context():
            org = Organisation.query.filter_by(type="region").first()
            _seed_track_record(org, "Hyderabad")
            partner_id = _seed_secondary_orgs(1)[0]
        res = client.post(
            "/api/v1/activities",
            json=_fest_payload(
                org_id, head_id,
                collaborating_org_ids=[partner_id] * FEST_COLLAB_THRESHOLD,
            ),
            headers=_auth(client, "rc@ekatva.os", "rc12345"),
        )
        assert res.status_code == 403, res.get_json()
        assert res.get_json()["code"] == "fest_collaborators_required"
        assert f"2 of {FEST_COLLAB_THRESHOLD}" in res.get_json()["error"]


# --------------------------------------------------------------------------- #
# PROG-01 exclusions: what does NOT count toward eligibility
# --------------------------------------------------------------------------- #

class TestEligibilityExclusions:
    def _locked(self, app, client, seed, city="Hyderabad"):
        """Seed something that must not count, then assert the fest is still locked."""
        org_id, head_id = _region_and_head(app)
        with app.app_context():
            seed(Organisation.query.filter_by(type="region").first())
        res = client.post(
            "/api/v1/activities",
            json=_fest_payload(org_id, head_id, city=city),
            headers=_auth(client, "rc@ekatva.os", "rc12345"),
        )
        assert res.status_code == 403, res.get_json()
        assert res.get_json()["code"] == "fest_locked"
        assert "0 of 2" in res.get_json()["error"]

    def test_eligibility_is_per_city(self, app, client):
        """D-03: a completed pair in Chennai does not unlock a fest in Hyderabad."""
        self._locked(app, client, lambda org: _seed_track_record(org, "Chennai"))

    def test_unapproved_past_meetups_do_not_count(self, app, client):
        """PROG-01: rejected and revoked proposals are not a track record."""
        def seed(org):
            _seed_completed_meetup(org, "Hyderabad", "local_meetup",
                                   proposal_status="rejected")
            _seed_completed_meetup(org, "Hyderabad", "regional_meetup",
                                   proposal_status="revoked")
        self._locked(app, client, seed)

    def test_future_meetups_do_not_count(self, app, client):
        """PROG-01: the formula is approved AND starts_at < now()."""
        def seed(org):
            _seed_completed_meetup(org, "Hyderabad", "local_meetup", days_ago=-30)
            _seed_completed_meetup(org, "Hyderabad", "regional_meetup", days_ago=-20)
        self._locked(app, client, seed)

    def test_status_completed_is_not_the_eligibility_source(self, app, client):
        """Regression pin: Activity.status == "completed" must not unlock.

        sync_past_events() flips that column on any past-dated activity with no
        reference to proposal status, so reading it would count a proposal that
        was never approved.
        """
        def seed(org):
            _seed_completed_meetup(org, "Hyderabad", "local_meetup",
                                   proposal_status="submitted")
            _seed_completed_meetup(org, "Hyderabad", "regional_meetup",
                                   proposal_status="submitted")
            ActivityRepository.sync_past_events()
            assert Activity.query.filter_by(status="completed").count() == 2
        self._locked(app, client, seed)


# --------------------------------------------------------------------------- #
# PROG-04 / T-07-01: refusals write nothing, forged unlock rows grant nothing
# --------------------------------------------------------------------------- #

class TestRefusalIntegrity:
    def test_refused_submit_writes_nothing(self, app, client):
        """T-07-05: both guards sit above the write marker."""
        org_id, head_id = _region_and_head(app)
        with app.app_context():
            before = (Activity.query.count(), Proposal.query.count())

        locked = client.post(
            "/api/v1/activities",
            json=_fest_payload(org_id, head_id),
            headers=_auth(client, "rc@ekatva.os", "rc12345"),
        )
        assert locked.get_json()["code"] == "fest_locked"

        with app.app_context():
            org = Organisation.query.filter_by(type="region").first()
            _seed_track_record(org, "Hyderabad")
            after_seed = (Activity.query.count(), Proposal.query.count())
        # the fest_locked refusal wrote nothing; the only delta is the seeded pair
        assert after_seed == (before[0] + 2, before[1] + 2)

        short = client.post(
            "/api/v1/activities",
            json=_fest_payload(org_id, head_id, collaborating_org_ids=[]),
            headers=_auth(client, "rc@ekatva.os", "rc12345"),
        )
        assert short.get_json()["code"] == "fest_collaborators_required"

        with app.app_context():
            assert (Activity.query.count(), Proposal.query.count()) == after_seed
            assert Activity.query.filter_by(title="Hyderabad Regional Fest").count() == 0

    def test_forged_unlock_row_does_not_grant_eligibility(self, app, client):
        """T-07-01: org_progression_unlocks is a record, never an input."""
        org_id, head_id = _region_and_head(app)
        with app.app_context():
            _db.session.add(OrgProgressionUnlock(org_id=org_id, city="Hyderabad"))
            _db.session.commit()
            assert OrgProgressionUnlock.query.count() == 1
        res = client.post(
            "/api/v1/activities",
            json=_fest_payload(org_id, head_id),
            headers=_auth(client, "rc@ekatva.os", "rc12345"),
        )
        assert res.status_code == 403, res.get_json()
        assert res.get_json()["code"] == "fest_locked"


# --------------------------------------------------------------------------- #
# Approve-time helpers (checkpoint 2 of 2)
# --------------------------------------------------------------------------- #

ADMIN = ("admin@ekatva.os", "admin123")
RC = ("rc@ekatva.os", "rc12345")


def _approve(client, activity_id):
    return client.post(
        f"/api/v1/proposals/{activity_id}/decision",
        json={"decision": "approve", "note": ""},
        headers=_auth(client, *ADMIN),
    )


def _submit_fest(app, client, city="Hyderabad", partners=FEST_COLLAB_THRESHOLD - 1):
    """Seed the track record + partner orgs and submit a fest that passes submit."""
    org_id, head_id = _region_and_head(app)
    with app.app_context():
        _seed_track_record(Organisation.query.filter_by(type="region").first(), city)
        collab_ids = _seed_secondary_orgs(partners)
    res = client.post(
        "/api/v1/activities",
        json=_fest_payload(org_id, head_id, city=city, collaborating_org_ids=collab_ids),
        headers=_auth(client, *RC),
    )
    assert res.status_code == 201, res.get_json()
    return res.get_json()["id"]


def _respond_to_invites(app, client, activity_id, accept=0, decline=0):
    """Answer pending invites through the real consent endpoint, never by
    mutating rows — an accepted count is only meaningful if it was produced by
    the path a partner organisation actually walks (D-02)."""
    with app.app_context():
        pending = [
            c.id
            for c in ActivityCollaborator.query.filter_by(
                activity_id=activity_id, is_primary=False
            ).all()
        ]
    for collab_id, status in zip(pending, ["accepted"] * accept + ["declined"] * decline):
        res = client.post(
            f"/api/v1/activities/{activity_id}/collaborators/{collab_id}/respond",
            json={"status": status},
            headers=_auth(client, *ADMIN),
        )
        assert res.status_code == 200, res.get_json()


def _revoke_qualifying_regional(app):
    """Take away the regional half of the track record AFTER a valid submit.

    Revocation runs through proposal_service.decide, the real revoke path.
    DecisionSchema exposes only approve/changes/reject over HTTP, so there is no
    endpoint to drive this one through.
    """
    with app.app_context():
        regional = Activity.query.filter_by(scale="regional_meetup").first()
        regional.organiser_id = User.query.filter_by(email="rc@ekatva.os").first().id
        _db.session.commit()
        proposal_service.decide(
            regional.id, "revoke", "", User.query.filter_by(email=ADMIN[0]).first()
        )


# --------------------------------------------------------------------------- #
# PROG-02 (D-01, accepted half) + PROG-04: the approve-time checkpoint
# --------------------------------------------------------------------------- #

class TestApproveCheckpoint:
    def test_approve_blocked_until_six_accepted(self, app, client):
        """T-07-08: named is not accepted. 6 named, 3 accepted -> refused."""
        aid = _submit_fest(app, client)
        _respond_to_invites(app, client, aid, accept=2)  # + the primary = 3
        res = _approve(client, aid)
        assert res.status_code == 403, res.get_json()
        assert res.get_json()["code"] == "fest_collaborators_required"
        assert f"3 of {FEST_COLLAB_THRESHOLD}" in res.get_json()["error"]

    def test_declined_collaborator_does_not_count(self, app, client):
        """PROG-02: a decline is not a silent yes — it holds the count short."""
        aid = _submit_fest(app, client)
        _respond_to_invites(app, client, aid, accept=FEST_COLLAB_THRESHOLD - 2, decline=1)
        res = _approve(client, aid)
        assert res.status_code == 403, res.get_json()
        assert res.get_json()["code"] == "fest_collaborators_required"
        assert (f"{FEST_COLLAB_THRESHOLD - 1} of {FEST_COLLAB_THRESHOLD}"
                in res.get_json()["error"])

    def test_approve_succeeds_when_all_accept(self, app, client):
        """PROG-02: once every named org has accepted, the fest approves."""
        aid = _submit_fest(app, client)
        _respond_to_invites(app, client, aid, accept=FEST_COLLAB_THRESHOLD - 1)
        res = _approve(client, aid)
        assert res.status_code == 200, res.get_json()
        with app.app_context():
            assert Proposal.query.filter_by(activity_id=aid).first().status == "approved"

    def test_direct_approve_of_locked_scale_is_403(self, app, client):
        """T-07-07: eligibility is re-checked at approve, not trusted from submit."""
        aid = _submit_fest(app, client)
        _respond_to_invites(app, client, aid, accept=FEST_COLLAB_THRESHOLD - 1)
        _revoke_qualifying_regional(app)
        res = _approve(client, aid)
        assert res.status_code == 403, res.get_json()
        assert res.get_json()["code"] == "fest_locked"

    def test_refused_approve_writes_nothing(self, app, client):
        """T-07-05: both guards sit above the first write in the approve branch."""
        aid = _submit_fest(app, client)
        _respond_to_invites(app, client, aid, accept=2)
        assert _approve(client, aid).status_code == 403
        with app.app_context():
            assert Proposal.query.filter_by(activity_id=aid).first().status == "submitted"
            assert ContributionPoint.query.filter_by(
                action="organised", activity_id=aid
            ).count() == 0

    def test_both_checkpoints_share_one_rule(self, app, client):
        """ROADMAP criterion #2: one function, two checkpoints, one code.

        The two codes are compared to each other rather than to a hardcoded
        string, so renaming the code cannot make the checkpoints disagree
        silently.
        """
        org_id, head_id = _region_and_head(app)
        submit_res = client.post(
            "/api/v1/activities",
            json=_fest_payload(org_id, head_id),
            headers=_auth(client, *RC),
        )
        assert submit_res.status_code == 403, submit_res.get_json()

        aid = _submit_fest(app, client)
        _respond_to_invites(app, client, aid, accept=FEST_COLLAB_THRESHOLD - 1)
        _revoke_qualifying_regional(app)
        approve_res = _approve(client, aid)
        assert approve_res.status_code == 403, approve_res.get_json()

        assert approve_res.get_json()["code"] == submit_res.get_json()["code"]


# --------------------------------------------------------------------------- #
# PROG-03: the unlock marker, written inside the approval's own transaction
# --------------------------------------------------------------------------- #

class TestUnlockMarker:
    CITY = "Hyderabad"

    def _seed_pending_regionals(self, app, days_ago_list):
        """One approved local (long past) + a submitted regional per entry.

        The dates are months apart so the FR-B2 approve-time quota (which counts
        approved meetups from the start of the target month onward) never fires.
        """
        with app.app_context():
            org = Organisation.query.filter_by(type="region").first()
            rc_id = User.query.filter_by(email=RC[0]).first().id
            _seed_completed_meetup(org, self.CITY, "local_meetup", days_ago=400,
                                   organiser_id=rc_id)
            ids = [
                _seed_completed_meetup(
                    org, self.CITY, "regional_meetup", days_ago=d,
                    proposal_status="submitted", organiser_id=rc_id,
                ).id
                for d in days_ago_list
            ]
            return org.id, ids

    def _unlocks(self, app, org_id):
        with app.app_context():
            return OrgProgressionUnlock.query.filter_by(
                org_id=org_id, city=self.CITY
            ).count()

    def test_unlock_row_recorded_on_approval(self, app, client):
        """PROG-03: the approval that completes the pair writes the marker."""
        org_id, (rid,) = self._seed_pending_regionals(app, [200])
        assert self._unlocks(app, org_id) == 0
        assert _approve(client, rid).status_code == 200
        assert self._unlocks(app, org_id) == 1

    def test_unlock_row_is_idempotent(self, app, client):
        """T-07-09: a second qualifying approval is a no-op, not a duplicate."""
        org_id, (first, second) = self._seed_pending_regionals(app, [200, 100])
        assert _approve(client, first).status_code == 200
        assert _approve(client, second).status_code == 200
        assert self._unlocks(app, org_id) == 1
