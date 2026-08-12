"""Phase 3 tests: Proposal Collaboration, Team Roster & Budget Guardrails.

Covers: PROPOSAL-00, PROPOSAL-01, PROPOSAL-02, PROPOSAL-03, PROPOSAL-04,
        PROPOSAL-05, PROPOSAL-06, BUDGET-01.

Test fixture design follows conftest.py conventions: user lookup by email,
org lookup by type, helper functions to obtain auth headers.
"""
import pytest
from werkzeug.security import generate_password_hash

from app.constants import (
    BUDGET_ABSOLUTE_CEILING,
    BUDGET_CAPACITY_RATE,
    COLLAB_ACCEPTED,
    COLLAB_DECLINED,
    COLLAB_PENDING,
    MEGA_MEETUP_THRESHOLD,
    TEAM_ROLE_MEETUP_HEAD,
)
from app.extensions import db as _db
from app.models import (
    Activity,
    ActivityCollaborator,
    ActivityTeamMember,
    Membership,
    Notification,
    Organisation,
    PORAssignment,
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


def _seed_user_with_por(email, name, org, por_type):
    """Create a user + membership + active POR in `org`. Returns the user."""
    u = User(
        name=name, email=email,
        password_hash=generate_password_hash("pass12345"),
        role="student", city="Hyderabad",
    )
    _db.session.add(u)
    _db.session.flush()
    m = Membership(user_id=u.id, org_id=org.id)
    _db.session.add(m)
    _db.session.flush()
    _db.session.add(PORAssignment(membership_id=m.id, por_type=por_type, active=True))
    _db.session.commit()
    return u


def _seed_org(name, typ="society", city="Chennai"):
    o = Organisation(name=name, type=typ, city=city)
    _db.session.add(o)
    _db.session.commit()
    return o


def _valid_payload(org_id, team_user_id):
    return {
        "title": "Hyderabad Coffee & Code",
        "org_id": org_id,
        "city": "Hyderabad",
        "scale": "local_meetup",
        "venue": "Roastery Coffee House",
        "starts_at": "2027-03-15T10:00:00",
        "capacity": 50,
        "description": "A meetup for IITM BS students",
        "budget": [{"label": "Venue", "planned": 3000}],
        "team": [{"user_id": team_user_id, "role": TEAM_ROLE_MEETUP_HEAD}],
        "collaborating_org_ids": [],
    }


# --------------------------------------------------------------------------- #
# PROPOSAL-00: Submitter must hold an organiser POR in the primary org
# --------------------------------------------------------------------------- #

class TestSubmitterAuthorization:
    def test_rc_in_primary_org_can_submit(self, app, client):
        """PROPOSAL-00: RC POR in primary org → 201."""
        with app.app_context():
            primary_org = Organisation.query.filter_by(type="region").first()
            team_user = User.query.filter_by(email="arav@ekatva.os").first()
            rc = User.query.filter_by(email="rc@ekatva.os").first()
        payload = _valid_payload(primary_org.id, team_user.id)
        headers = _auth(client, "rc@ekatva.os", "rc12345")
        resp = client.post("/api/v1/activities", json=payload, headers=headers)
        assert resp.status_code == 201, resp.get_json()

    def test_rc_in_different_org_cannot_submit(self, app, client):
        """PROPOSAL-00: RC POR in org B, proposing for org A → 403."""
        with app.app_context():
            primary_org_id = Organisation.query.filter_by(type="region").first().id
            team_user_id = User.query.filter_by(email="arav@ekatva.os").first().id
            collab_org = _seed_org("Kolkata Circle", "region", "Kolkata")
            collab_org_id = collab_org.id
            # Create RC user scoped to collab_org only
            _seed_user_with_por(
                "other_rc@ekatva.os", "Other RC", collab_org, "Regional Coordinator"
            )
        payload = _valid_payload(primary_org_id, team_user_id)
        headers = _auth(client, "other_rc@ekatva.os", "pass12345")
        resp = client.post("/api/v1/activities", json=payload, headers=headers)
        assert resp.status_code == 403
        assert resp.get_json()["code"] == "forbidden"


    def test_admin_can_submit_for_any_org(self, app, client):
        """PROPOSAL-00: admin bypasses org POR check → 201."""
        with app.app_context():
            primary_org = Organisation.query.filter_by(type="region").first()
            team_user = User.query.filter_by(email="arav@ekatva.os").first()
        payload = _valid_payload(primary_org.id, team_user.id)
        headers = _auth(client, "admin@ekatva.os", "admin123")
        resp = client.post("/api/v1/activities", json=payload, headers=headers)
        assert resp.status_code == 201, resp.get_json()


# --------------------------------------------------------------------------- #
# BUDGET-01: Budget cap enforcement
# --------------------------------------------------------------------------- #

class TestBudgetCap:
    def _submit(self, client, org_id, team_user_id, scale, capacity, budget_total):
        headers = _auth(client, "rc@ekatva.os", "rc12345")
        payload = {
            "title": "Budget Cap Test",
            "org_id": org_id,
            "city": "Hyderabad",
            "scale": scale,
            "venue": "Test Venue",
            "starts_at": "2027-04-15T10:00:00",
            "capacity": capacity,
            "budget": [{"label": "All", "planned": budget_total}],
            "team": [{"user_id": team_user_id, "role": TEAM_ROLE_MEETUP_HEAD}],
            "collaborating_org_ids": [],
        }
        return client.post("/api/v1/activities", json=payload, headers=headers)

    def test_at_capacity_cap_accepted(self, app, client):
        """BUDGET-01: capacity=50, budget=10000 (50×200) → 201."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        resp = self._submit(client, org_id, team_id, "local_meetup", 50, 10_000)
        assert resp.status_code == 201

    def test_over_capacity_cap_rejected(self, app, client):
        """BUDGET-01: capacity=50, budget=10001 → 400 budget_cap_exceeded."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        resp = self._submit(client, org_id, team_id, "local_meetup", 50, 10_001)
        assert resp.status_code == 400
        assert resp.get_json()["code"] == "budget_cap_exceeded"

    def test_at_absolute_ceiling_accepted(self, app, client):
        """BUDGET-01: capacity=200 → cap=min(40000,20000)=20000 → budget=20000 → 201."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        resp = self._submit(client, org_id, team_id, "local_meetup", 200, 20_000)
        assert resp.status_code == 201

    def test_over_absolute_ceiling_rejected(self, app, client):
        """BUDGET-01: capacity=200 → cap=20000 → budget=20001 → 400."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        resp = self._submit(client, org_id, team_id, "local_meetup", 200, 20_001)
        assert resp.status_code == 400
        assert resp.get_json()["code"] == "budget_cap_exceeded"

    def test_regional_fest_exempt_from_cap(self, app, client):
        """BUDGET-01: regional_fest scale is exempt from the budget cap."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        resp = self._submit(client, org_id, team_id, "regional_fest", 500, 100_000)
        # Should not fail with budget_cap_exceeded (may fail quota or other reasons)
        data = resp.get_json()
        assert resp.status_code != 400 or data.get("code") != "budget_cap_exceeded"


# --------------------------------------------------------------------------- #
# PROPOSAL-02: Team roster validation
# --------------------------------------------------------------------------- #

class TestTeamRoster:
    def test_one_meetup_head_succeeds(self, app, client):
        """PROPOSAL-02: exactly one Meetup Head → 201."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        payload = _valid_payload(org_id, team_id)
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 201

    def test_zero_meetup_heads_rejected(self, app, client):
        """PROPOSAL-02: no Meetup Head → 400 invalid_team."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        payload = _valid_payload(org_id, team_id)
        payload["team"] = [{"user_id": team_id, "role": "Designer"}]
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 400
        assert resp.get_json()["code"] == "invalid_team"

    def test_two_meetup_heads_rejected(self, app, client):
        """PROPOSAL-02: two Meetup Heads → 400 invalid_team."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            u1 = User.query.filter_by(email="arav@ekatva.os").first().id
            u2 = User.query.filter_by(email="crew@ekatva.os").first().id
        payload = _valid_payload(org_id, u1)
        payload["team"] = [
            {"user_id": u1, "role": TEAM_ROLE_MEETUP_HEAD},
            {"user_id": u2, "role": TEAM_ROLE_MEETUP_HEAD},
        ]
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 400
        assert resp.get_json()["code"] == "invalid_team"

    def test_invalid_role_rejected(self, app, client):
        """PROPOSAL-02: unrecognised role → 400 invalid_role."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            u1 = User.query.filter_by(email="arav@ekatva.os").first().id
            u2 = User.query.filter_by(email="crew@ekatva.os").first().id
        payload = _valid_payload(org_id, u1)
        payload["team"] = [
            {"user_id": u1, "role": TEAM_ROLE_MEETUP_HEAD},
            {"user_id": u2, "role": "Grand Vizier"},
        ]
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 422  # Schema-level validation catches invalid role

    def test_team_members_written_to_db(self, app, client):
        """PROPOSAL-02: ActivityTeamMember rows created on successful submission."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        payload = _valid_payload(org_id, team_id)
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 201
        activity_id = resp.get_json()["id"]
        with app.app_context():
            rows = ActivityTeamMember.query.filter_by(activity_id=activity_id).all()
        assert len(rows) == 1
        assert rows[0].role == TEAM_ROLE_MEETUP_HEAD


# --------------------------------------------------------------------------- #
# PROPOSAL-01: Collaborator rows written at submission
# --------------------------------------------------------------------------- #

class TestCollaboratorWrite:
    def test_primary_org_written_as_accepted(self, app, client):
        """PROPOSAL-01: primary org → is_primary=True, ACCEPTED."""
        with app.app_context():
            primary_org = Organisation.query.filter_by(type="region").first()
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        payload = _valid_payload(primary_org.id, team_id)
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 201
        activity_id = resp.get_json()["id"]
        with app.app_context():
            row = ActivityCollaborator.query.filter_by(
                activity_id=activity_id, org_id=primary_org.id
            ).first()
        assert row is not None
        assert row.is_primary is True
        assert row.status == COLLAB_ACCEPTED

    def test_collaborating_org_written_as_pending(self, app, client):
        """PROPOSAL-01: collaborating org → PENDING."""
        with app.app_context():
            primary_org_id = Organisation.query.filter_by(type="region").first().id
            collab_org = _seed_org("Pune Circle", "society", "Pune")
            collab_org_id = collab_org.id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        payload = _valid_payload(primary_org_id, team_id)
        payload["collaborating_org_ids"] = [collab_org_id]
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 201
        activity_id = resp.get_json()["id"]
        with app.app_context():
            row = ActivityCollaborator.query.filter_by(
                activity_id=activity_id, org_id=collab_org_id
            ).first()
        assert row is not None
        assert row.status == COLLAB_PENDING
        assert row.is_primary is False

    def test_duplicate_collab_org_ids_deduplicated(self, app, client):
        """PROPOSAL-01: same org_id twice → one row only."""
        with app.app_context():
            primary_org_id = Organisation.query.filter_by(type="region").first().id
            collab_org_id = _seed_org("Jaipur Circle", "society", "Jaipur").id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        payload = _valid_payload(primary_org_id, team_id)
        payload["collaborating_org_ids"] = [collab_org_id, collab_org_id]
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 201
        activity_id = resp.get_json()["id"]
        with app.app_context():
            rows = ActivityCollaborator.query.filter_by(
                activity_id=activity_id, org_id=collab_org_id
            ).all()
        assert len(rows) == 1

    def test_unknown_collab_org_rejected(self, app, client):
        """PROPOSAL-01: unknown org_id in collaborating_org_ids → 404."""
        with app.app_context():
            primary_org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        payload = _valid_payload(primary_org_id, team_id)
        payload["collaborating_org_ids"] = ["nonexistent_org_id_xyz"]
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 404
        assert resp.get_json()["code"] == "org_not_found"


# --------------------------------------------------------------------------- #
# PROPOSAL-06: Collaborator respond + notifications
# --------------------------------------------------------------------------- #

class TestCollabRespond:
    @pytest.fixture(autouse=True)
    def setup(self, app, client):
        """Submit a proposal with one collaborating org, set up an authority holder."""
        with app.app_context():
            primary_org_id = Organisation.query.filter_by(type="region").first().id
            self.team_id = User.query.filter_by(email="arav@ekatva.os").first().id
            # Create a collaborating org and an authority holder for it
            collab_org = _seed_org("Mumbai Circle P6", "society", "Mumbai")
            self.collab_org_id = collab_org.id
            authority = _seed_user_with_por(
                "collab_authority_p6@ekatva.os", "Mumbai Secretary",
                collab_org, "Society Secretary"
            )
            self.authority_id = authority.id

        payload = _valid_payload(primary_org_id, self.team_id)
        payload["collaborating_org_ids"] = [self.collab_org_id]
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 201
        self.activity_id = resp.get_json()["id"]

        with app.app_context():
            collab_row = ActivityCollaborator.query.filter_by(
                activity_id=self.activity_id, org_id=self.collab_org_id
            ).first()
            self.collab_id = collab_row.id

    def test_authority_holder_accepts(self, client):
        """PROPOSAL-06: Secretary of collab org can accept → 200, status=accepted."""
        resp = client.post(
            f"/api/v1/activities/{self.activity_id}/collaborators/{self.collab_id}/respond",
            json={"status": "accepted"},
            headers=_auth(client, "collab_authority_p6@ekatva.os", "pass12345"),
        )
        assert resp.status_code == 200
        assert resp.get_json()["status"] == COLLAB_ACCEPTED

    def test_authority_holder_declines(self, client):
        """PROPOSAL-06: Secretary can decline → 200, status=declined."""
        resp = client.post(
            f"/api/v1/activities/{self.activity_id}/collaborators/{self.collab_id}/respond",
            json={"status": "declined"},
            headers=_auth(client, "collab_authority_p6@ekatva.os", "pass12345"),
        )
        assert resp.status_code == 200
        assert resp.get_json()["status"] == COLLAB_DECLINED

    def test_non_authority_cannot_respond(self, app, client):
        """PROPOSAL-06: student with no POR in collab org → 403."""
        resp = client.post(
            f"/api/v1/activities/{self.activity_id}/collaborators/{self.collab_id}/respond",
            json={"status": "accepted"},
            headers=_auth(client, "arav@ekatva.os", "student123"),
        )
        assert resp.status_code == 403

    def test_double_respond_returns_409(self, client):
        """PROPOSAL-06: responding twice → 409 already_responded."""
        headers = _auth(client, "collab_authority_p6@ekatva.os", "pass12345")
        url = f"/api/v1/activities/{self.activity_id}/collaborators/{self.collab_id}/respond"
        client.post(url, json={"status": "accepted"}, headers=headers)
        resp = client.post(url, json={"status": "declined"}, headers=headers)
        assert resp.status_code == 409
        assert resp.get_json()["code"] == "already_responded"

    def test_notification_sent_to_authority_holder(self, app):
        """PROPOSAL-06: after submission, notification row exists for collab org authority."""
        with app.app_context():
            notif = Notification.query.filter_by(
                activity_id=self.activity_id,
                user_id=self.authority_id,
                type="collaboration_invite",
            ).first()
        assert notif is not None



# --------------------------------------------------------------------------- #
# PROPOSAL-03: Mega Meetup label
# --------------------------------------------------------------------------- #

class TestMegaMeetup:
    def test_mega_meetup_false_below_threshold(self, app, client):
        """PROPOSAL-03: 1 accepted (primary only) < 3 → is_mega_meetup=False."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        payload = _valid_payload(org_id, team_id)
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 201
        assert resp.get_json()["is_mega_meetup"] is False

    def test_mega_meetup_true_at_threshold(self, app, client):
        """PROPOSAL-03: 1 primary (accepted) + 2 accepted secondary = 3 → True."""
        with app.app_context():
            primary_org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
            collab1_id = _seed_org("Ahmedabad Circle MM1", "society", "Ahmedabad").id
            collab2_id = _seed_org("Surat Circle MM1", "society", "Surat").id

        payload = _valid_payload(primary_org_id, team_id)
        payload["collaborating_org_ids"] = [collab1_id, collab2_id]
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 201
        activity_id = resp.get_json()["id"]

        # Accept both secondary collaborators directly in DB
        with app.app_context():
            for row in ActivityCollaborator.query.filter_by(
                activity_id=activity_id, is_primary=False
            ).all():
                row.status = COLLAB_ACCEPTED
            _db.session.commit()
            activity = Activity.query.get(activity_id)
            assert activity.is_mega_meetup is True

    def test_is_mega_meetup_in_api_response(self, app, client):
        """PROPOSAL-03: is_mega_meetup appears in the API response."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
        payload = _valid_payload(org_id, team_id)
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 201
        assert "is_mega_meetup" in resp.get_json()


# --------------------------------------------------------------------------- #
# PROPOSAL-04: Admin queue enrichment
# --------------------------------------------------------------------------- #

class TestAdminQueueEnrichment:
    def test_detail_includes_collaborators(self, app, client):
        """PROPOSAL-04: GET /proposals/<id> includes collaborators list."""
        with app.app_context():
            primary_org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id
            collab_id = _seed_org("Kochi Circle P4", "society", "Kochi").id

        payload = _valid_payload(primary_org_id, team_id)
        payload["collaborating_org_ids"] = [collab_id]
        create_resp = client.post("/api/v1/activities", json=payload,
                                  headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert create_resp.status_code == 201
        activity_id = create_resp.get_json()["id"]

        detail_resp = client.get(f"/api/v1/proposals/{activity_id}",
                                 headers=_auth(client, "admin@ekatva.os", "admin123"))
        assert detail_resp.status_code == 200
        body = detail_resp.get_json()
        assert "collaborators" in body
        assert len(body["collaborators"]) == 2  # primary + one pending

    def test_detail_includes_team_members(self, app, client):
        """PROPOSAL-04: GET /proposals/<id> includes team_members list."""
        with app.app_context():
            org_id = Organisation.query.filter_by(type="region").first().id
            team_id = User.query.filter_by(email="arav@ekatva.os").first().id

        payload = _valid_payload(org_id, team_id)
        create_resp = client.post("/api/v1/activities", json=payload,
                                  headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert create_resp.status_code == 201
        activity_id = create_resp.get_json()["id"]

        detail_resp = client.get(f"/api/v1/proposals/{activity_id}",
                                 headers=_auth(client, "admin@ekatva.os", "admin123"))
        assert detail_resp.status_code == 200
        body = detail_resp.get_json()
        assert "team_members" in body
        assert len(body["team_members"]) == 1
        assert body["team_members"][0]["role"] == TEAM_ROLE_MEETUP_HEAD


# --------------------------------------------------------------------------- #
# PROPOSAL-05: Meetup Head reassignment
# --------------------------------------------------------------------------- #

class TestReassignMeetupHead:
    @pytest.fixture(autouse=True)
    def setup(self, app, client):
        with app.app_context():
            self.org_id = Organisation.query.filter_by(type="region").first().id
            self.team_id = User.query.filter_by(email="arav@ekatva.os").first().id
            self.new_head_id = User.query.filter_by(email="crew@ekatva.os").first().id

        payload = _valid_payload(self.org_id, self.team_id)
        resp = client.post("/api/v1/activities", json=payload,
                           headers=_auth(client, "rc@ekatva.os", "rc12345"))
        assert resp.status_code == 201
        self.activity_id = resp.get_json()["id"]

    def test_proposer_can_reassign(self, app, client):
        """PROPOSAL-05: proposer (organiser) can reassign Meetup Head → 200."""
        resp = client.post(
            f"/api/v1/activities/{self.activity_id}/reassign-meetup-head",
            json={"new_meetup_head_user_id": self.new_head_id},
            headers=_auth(client, "rc@ekatva.os", "rc12345"),
        )
        assert resp.status_code == 200
        assert resp.get_json()["new_meetup_head_user_id"] == self.new_head_id

    def test_admin_can_reassign(self, client):
        """PROPOSAL-05: admin can reassign → 200."""
        resp = client.post(
            f"/api/v1/activities/{self.activity_id}/reassign-meetup-head",
            json={"new_meetup_head_user_id": self.new_head_id},
            headers=_auth(client, "admin@ekatva.os", "admin123"),
        )
        assert resp.status_code == 200

    def test_student_cannot_reassign(self, client):
        """PROPOSAL-05: a student with no management rights → 403."""
        resp = client.post(
            f"/api/v1/activities/{self.activity_id}/reassign-meetup-head",
            json={"new_meetup_head_user_id": self.new_head_id},
            headers=_auth(client, "crew@ekatva.os", "crew12345"),
        )
        assert resp.status_code == 403

    def test_reassign_to_nonexistent_user(self, client):
        """PROPOSAL-05: unknown user_id → 404."""
        resp = client.post(
            f"/api/v1/activities/{self.activity_id}/reassign-meetup-head",
            json={"new_meetup_head_user_id": "does_not_exist_xyz"},
            headers=_auth(client, "rc@ekatva.os", "rc12345"),
        )
        assert resp.status_code == 404
        assert resp.get_json()["code"] == "user_not_found"

    def test_old_meetup_head_removed_after_reassign(self, app, client):
        """PROPOSAL-05: only one Meetup Head row exists after reassignment."""
        client.post(
            f"/api/v1/activities/{self.activity_id}/reassign-meetup-head",
            json={"new_meetup_head_user_id": self.new_head_id},
            headers=_auth(client, "rc@ekatva.os", "rc12345"),
        )
        with app.app_context():
            rows = ActivityTeamMember.query.filter_by(
                activity_id=self.activity_id, role=TEAM_ROLE_MEETUP_HEAD
            ).all()
        assert len(rows) == 1
        assert rows[0].user_id == self.new_head_id
