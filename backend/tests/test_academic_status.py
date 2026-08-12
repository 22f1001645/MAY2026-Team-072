"""AUTH-04 — academic status: staleness, the admin override audit trail, and the
decoupling promise that is the requirement's whole point.

Verification map rows 13 (`-k stale`), 14 (`-k decoupled`) and 15
(`-k override_audit`).

AUTH-04 says academic status is "fully decoupled from session/login behavior".
That is a negative claim, and a purely behavioural test of a negative claim is
weak: it passes whenever a branch exists but happens not to fire for the seeded
data. So the decoupling is pinned twice — once by driving a withdrawn, stale
user through the whole login → refresh → /auth/me sequence, and once by reading
`auth_service.py` and asserting the `login` and `refresh` bodies do not mention
an academic identifier at all.
"""

import json
from datetime import datetime, timedelta
from pathlib import Path

import pytest

from app.extensions import db
from app.models import AuditLog, Term
from app.services import auth_service

from .conftest import admin_user, student_user

AUTH_SERVICE_SOURCE = (
    Path(__file__).resolve().parents[1] / "app" / "services" / "auth_service.py"
)

OVERRIDE_ACTION = "admin_override_academic_status"


def _set_current_term(start_days: int, end_days: int) -> Term:
    """Replace the current term with a window relative to now.

    Offsets are in days and may be negative. `_seed_minimal` creates no terms, so
    there is nothing to preserve."""
    Term.query.delete()
    now = datetime.now()
    term = Term(
        name="Window Under Test",
        start_date=now + timedelta(days=start_days),
        end_date=now + timedelta(days=end_days),
        is_current=True,
    )
    db.session.add(term)
    db.session.commit()
    return term


def _confirmed_days_ago(user, days: int):
    user.academic_confirmed_at = datetime.now() - timedelta(days=days)
    db.session.commit()


def _function_body(source: str, name: str) -> str:
    """The lines of a module-level `def name(...)` up to the next top-level
    statement. Crude on purpose — a real parse would be more machinery than the
    single question being asked."""
    lines = source.splitlines()
    start = next(i for i, line in enumerate(lines) if line.startswith(f"def {name}("))
    body = []
    for line in lines[start + 1 :]:
        if line and not line[0].isspace():
            break
        body.append(line)
    return "\n".join(body)


# --- Staleness (row 13, `-k stale`) ----------------------------------------


def test_status_is_stale_when_confirmed_in_a_previous_term(app):
    term = _set_current_term(-30, 90)
    user = student_user()

    # Never confirmed at all.
    user.academic_confirmed_at = None
    db.session.commit()
    assert auth_service.is_academic_status_stale(user) is True

    # Confirmed before this term opened.
    user.academic_confirmed_at = term.start_date - timedelta(days=5)
    db.session.commit()
    assert auth_service.is_academic_status_stale(user) is True

    # Confirmed inside the window.
    user.academic_confirmed_at = term.start_date + timedelta(days=1)
    db.session.commit()
    assert auth_service.is_academic_status_stale(user) is False


def test_staleness_is_not_a_rolling_window(app):
    """The pair that distinguishes D-20 from a rolling window.

    A 30-day rolling implementation passes the first case and fails the second;
    a term-boundary implementation passes both. Either case alone proves
    nothing."""
    user = student_user()

    # Old, but inside the current term → fresh. A rolling window calls this stale.
    _set_current_term(-60, 60)
    _confirmed_days_ago(user, 40)
    assert auth_service.is_academic_status_stale(user) is False

    # Recent, but in the previous term → stale. A rolling window calls this fresh.
    _set_current_term(-5, 90)
    _confirmed_days_ago(user, 10)
    assert auth_service.is_academic_status_stale(user) is True


def test_stale_computation_survives_the_seeded_term_shape(app):
    """`seed_reference_data` inserts `date` objects into `Term.start_date`, which
    is a `db.DateTime` column. Comparing a `date` to a `datetime` raises
    TypeError in Python; only SQLite's permissiveness has kept this latent. A
    term row built with `datetime` values would not exercise it."""
    Term.query.delete()
    db.session.add(
        Term(
            name="May 2026",
            start_date=datetime(2026, 5, 1).date(),
            end_date=datetime(2026, 8, 31).date(),
            is_current=True,
        )
    )
    db.session.commit()

    user = student_user()
    user.academic_confirmed_at = datetime(2026, 6, 1)
    db.session.commit()

    assert auth_service.is_academic_status_stale(user) is False


def test_no_current_term_means_nobody_is_stale(app):
    """A deliberate fail-open: an empty terms table is a seeding gap, and
    nudging every user in the app is the worse failure."""
    Term.query.delete()
    db.session.commit()

    user = student_user()
    user.academic_confirmed_at = None
    db.session.commit()

    assert auth_service.is_academic_status_stale(user) is False


# --- Decoupling from session behaviour (row 14, `-k decoupled`) -------------


def test_login_and_refresh_are_decoupled_from_academic_status(app, cookie_client):
    """A withdrawn user with a stale confirmation is still a user."""
    _set_current_term(-10, 90)
    user = student_user()
    user.academic_level = "degree"
    user.academic_status = "withdrawn"
    user.academic_confirmed_at = datetime.now() - timedelta(days=200)
    db.session.commit()
    assert auth_service.is_academic_status_stale(user) is True

    assert cookie_client.login_as("arav@ekatva.os", "student123").status_code == 200

    refreshed = cookie_client.post_refresh()
    assert refreshed.status_code == 200

    token = refreshed.get_json()["access_token"]
    me = cookie_client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert me.status_code == 200

    body = me.get_json()
    assert body["capabilities"] is not None
    assert body["academic_status"] == "withdrawn"
    assert body["academic_status_stale"] is True


def test_login_and_refresh_source_is_decoupled_from_academic_fields():
    """The source-level half of row 14.

    The behavioural test above passes if a branch exists but does not fire for
    the seeded data. This one fails the moment either function so much as reads
    an academic field."""
    source = AUTH_SERVICE_SOURCE.read_text(encoding="utf-8")

    for name in ("login", "refresh"):
        body = _function_body(source, name)
        assert body.strip(), f"could not isolate the body of {name}()"
        assert "academic" not in body, (
            f"auth_service.{name}() mentions an academic field. AUTH-04 forbids "
            "academic status from influencing login or refresh."
        )


# --- Admin override + audit trail (row 15, `-k override_audit`) -------------


def _override(client, headers, user_id, **payload):
    body = {"academic_level": "degree", "academic_status": "on_break"}
    body.update(payload)
    return client.patch(
        f"/api/v1/admin/users/{user_id}/academic-status", headers=headers, json=body
    )


def test_admin_override_audit_row_is_attributed_and_complete(app, client, admin_headers):
    target = student_user()
    target.academic_level = "foundation"
    target.academic_status = "active"
    db.session.commit()
    target_id, actor_id = target.id, admin_user().id

    before = AuditLog.query.count()
    res = _override(client, admin_headers, target_id, reason="Registry correction")
    assert res.status_code == 200

    # Exactly one row, not "at least one" — a duplicate write is also a defect.
    assert AuditLog.query.count() == before + 1
    row = AuditLog.query.filter_by(action=OVERRIDE_ACTION).one()

    assert row.entity == "user"
    assert row.entity_id == target_id
    assert row.actor_id == actor_id
    assert row.actor_name

    # Asserting a row merely exists would pass against a row recording nothing.
    note = json.loads(row.note)
    assert note["old_level"] == "foundation"
    assert note["new_level"] == "degree"
    assert note["old_status"] == "active"
    assert note["new_status"] == "on_break"
    assert note["reason"] == "Registry correction"


def test_admin_override_audit_row_records_an_absent_reason(app, client, admin_headers):
    """`reason` is optional by design (D-22); the row is still written."""
    res = _override(client, admin_headers, student_user().id)
    assert res.status_code == 200

    note = json.loads(AuditLog.query.filter_by(action=OVERRIDE_ACTION).one().note)
    assert note["reason"] is None
    assert note["new_status"] == "on_break"


def test_user_can_self_confirm_after_an_admin_override(app, client, admin_headers, student_headers):
    """An override is a correction, not a lock (D-22)."""
    assert _override(client, admin_headers, student_user().id).status_code == 200
    assert student_user().academic_level == "degree"

    res = client.patch(
        "/api/v1/auth/academic-status",
        headers=student_headers,
        json={"academic_level": "diploma", "academic_status": "active"},
    )
    assert res.status_code == 200
    assert student_user().academic_level == "diploma"
    assert student_user().academic_status == "active"


@pytest.mark.parametrize("actor", ["student_headers", "rc_headers"])
def test_non_admin_cannot_override(app, client, request, actor):
    headers = request.getfixturevalue(actor)
    res = _override(client, headers, student_user().id)

    assert res.status_code == 403
    assert AuditLog.query.filter_by(action=OVERRIDE_ACTION).count() == 0


def test_override_of_an_unknown_user_is_a_404_in_the_error_envelope(app, client, admin_headers):
    res = _override(client, admin_headers, "no-such-user-id")

    assert res.status_code == 404
    assert res.get_json()["code"] == "not_found"


# --- Enum validation --------------------------------------------------------


@pytest.mark.parametrize(
    "payload",
    [
        {"academic_level": "postgrad", "academic_status": "active"},
        {"academic_level": "degree", "academic_status": "expelled"},
        {"academic_level": "degree"},
    ],
)
def test_invalid_enum_values_are_rejected(app, client, admin_headers, payload):
    res = client.patch(
        f"/api/v1/admin/users/{student_user().id}/academic-status",
        headers=admin_headers,
        json=payload,
    )

    assert res.status_code == 422
    body = res.get_json()
    assert "error" in body and "code" in body
    assert AuditLog.query.filter_by(action=OVERRIDE_ACTION).count() == 0


def test_self_confirmation_rejects_an_invalid_level(app, client, student_headers):
    res = client.patch(
        "/api/v1/auth/academic-status",
        headers=student_headers,
        json={"academic_level": "postgrad", "academic_status": "active"},
    )

    assert res.status_code == 422
    assert student_user().academic_level is None
