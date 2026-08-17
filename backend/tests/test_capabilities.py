"""The AUTH-02 capability contract on `/auth/me`.

Three claims are under test, and they are the whole of D-10 and D-11:

1. the payload carries `is_organiser` plus both id sets, computed on the server;
2. those values are recomputed on every call, so revoking a POR takes effect on
   the next request rather than whenever the access token happens to expire;
3. none of it is baked into the token, which is what makes (2) possible.

Capabilities are a *rendering* projection only. Nothing here should ever be read
as evidence that they may be trusted as an authorization decision — every
mutating endpoint keeps the Phase 1 scoped guards, and tests/test_rbac_enforcement.py
is the gate that enforces it.
"""
import pytest
from flask_jwt_extended import decode_token
from sqlalchemy import event
from werkzeug.security import generate_password_hash

from app.extensions import db
from app.models import PORAssignment, User

from .conftest import rc_user, region_org
from .test_rbac_predicates import _give_por

ME_URL = "/api/v1/auth/me"

# Generous on purpose. 02-RESEARCH.md flagged manageable_activity_ids as an N+1
# risk and the implementation answers it with a bounded union of a few queries;
# this ceiling fails if that degenerates into a per-row walk, without pinning an
# exact count that ordinary refactoring would break.
MAX_SELECTS_PER_ME_CALL = 25


class _SelectCounter:
    """Counts SELECT statements issued on the app's engine while active."""

    def __init__(self):
        self.count = 0

    def __enter__(self):
        self._engine = db.engine

        @event.listens_for(self._engine, "before_cursor_execute")
        def _on_execute(conn, cursor, statement, parameters, context, executemany):
            if statement.lstrip().upper().startswith("SELECT"):
                self.count += 1

        self._listener = _on_execute
        return self

    def __exit__(self, *exc):
        event.remove(self._engine, "before_cursor_execute", self._listener)
        return False


MATRIX_PASSWORD = "matrix12345"


def _user(email, name="Someone"):
    user = User(name=name, email=email,
                password_hash=generate_password_hash(MATRIX_PASSWORD),
                role="student", city="Hyderabad")
    db.session.add(user)
    db.session.flush()
    return user


def _headers_for(client, email):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": MATRIX_PASSWORD})
    assert res.status_code == 200
    return {"Authorization": f"Bearer {res.get_json()['access_token']}"}


def test_me_returns_the_three_capability_keys(client, rc_headers, student_headers):
    with _SelectCounter() as counter:
        res = client.get(ME_URL, headers=rc_headers)

    assert res.status_code == 200
    caps = res.get_json()["capabilities"]
    assert caps["is_organiser"] is True
    assert isinstance(caps["manageable_org_ids"], list)
    assert isinstance(caps["manageable_activity_ids"], list)
    assert region_org().id in caps["manageable_org_ids"]

    # Control: without it, a hardcoded `True` would pass the assertions above.
    plain = client.get(ME_URL, headers=student_headers).get_json()["capabilities"]
    assert plain["is_organiser"] is False
    assert plain["manageable_org_ids"] == []
    assert plain["manageable_activity_ids"] == []

    assert counter.count <= MAX_SELECTS_PER_ME_CALL, (
        f"/auth/me issued {counter.count} SELECTs — capability computation "
        "has probably regressed into a per-row query"
    )


def test_admin_with_no_por_is_not_organiser(client, admin_headers):
    """An admin holding zero organiser PORs is not an organiser (PRD P3).

    `rbac.is_organiser()` short-circuits True for ROLE_ADMIN, but that shortcut
    exists only to back the frozen legacy `organiser_required` route guard
    (six routes, Phase 1). `/auth/me`'s capability contract is a different
    consumer — capability-driven rendering, e.g. the DASH-01 view switcher —
    and must stay POR-only, or every admin account sees an Organiser toggle
    it has no POR-backed reason to see."""
    res = client.get(ME_URL, headers=admin_headers)

    assert res.status_code == 200
    caps = res.get_json()["capabilities"]
    assert caps["is_organiser"] is False


def test_capabilities_are_recomputed_live_when_a_por_is_deactivated(client, rc_headers):
    """Deactivating a POR flips is_organiser on the very next call (D-11).

    Both calls deliberately reuse the SAME Authorization header. Do not
    "simplify" this by logging in again between them: a fresh token would make
    the test pass even if capabilities were baked into the JWT, which is exactly
    the failure this test exists to catch.
    """
    assert client.get(ME_URL, headers=rc_headers).get_json()["capabilities"]["is_organiser"] is True

    por = PORAssignment.query.filter_by(por_type="Regional Coordinator").first()
    assert por is not None and por.membership.user_id == rc_user().id
    por.active = False
    db.session.commit()

    again = client.get(ME_URL, headers=rc_headers)
    assert again.status_code == 200
    assert again.get_json()["capabilities"]["is_organiser"] is False


def test_access_token_carries_no_claims_about_capabilities(app, rc_headers):
    """No capability data in the token (D-11) — revocation stays off the expiry clock."""
    token = rc_headers["Authorization"].split()[1]
    claims = decode_token(token)

    for forbidden in ("is_organiser", "manageable_org_ids", "manageable_activity_ids", "capabilities"):
        assert forbidden not in claims, f"{forbidden} must not travel in the access token"

    # An absence-only assertion would also pass against a decode that returned
    # nothing at all, so pin what the token IS expected to carry.
    assert claims["role"] == "student"
    assert claims["sub"] == rc_user().id


# --- AUTH-03: the organiser surface, one POR type at a time ------------------
# ROADMAP criterion 3 stated as a test. Asserted through /auth/me rather than by
# calling rbac.is_organiser directly, because the claim being made is that
# organiser status *arrives from the endpoint* — a direct predicate call would
# still pass if the endpoint stopped surfacing it.


@pytest.mark.parametrize(
    "por_type, expected",
    [
        ("Deputy House Secretary", True),
        ("Web Admin", True),
        ("Society Deputy Secretary", True),
        ("Coordinator", True),
        # Negative controls, in the same table so the matrix cannot pass by
        # returning True unconditionally.
        (None, False),
        ("Regional Coordinatr", False),
    ],
)
def test_por_matrix_all_four_por_types_get_the_organiser_surface(client, por_type, expected):
    email = f"matrix-{(por_type or 'none').lower().replace(' ', '-')}@ekatva.os"
    user = _user(email, name=por_type or "No POR")
    # Exactly one POR, so a pass can only be attributed to the type under test.
    if por_type:
        _give_por(user, region_org(), por_type)
    db.session.commit()

    res = client.get(ME_URL, headers=_headers_for(client, email))

    assert res.status_code == 200
    assert res.get_json()["capabilities"]["is_organiser"] is expected, (
        f"POR type {por_type!r} should {'' if expected else 'not '}confer the organiser surface"
    )
