"""Phase 4 tests: organisation profile and brand kit.

Covers: ORG-01 — a Secretary, Deputy Secretary, Regional Coordinator or
Coordinator edits the profile of the one organisation they hold authority over.

The spine under test is `can_manage_org_required`, which had zero route call
sites before this phase. Every assertion here about who may edit what is
therefore also an assertion about that decorator's first real consumer, so the
denial cases matter at least as much as the happy path.

Fixture conventions follow conftest.py: users looked up by email, organisations
by type, headers from the `_token` helper.
"""
from app.models import AuditLog

from .conftest import house_org

PROFILE_URL = "/api/v1/orgs/{org_id}/profile"


def _profile(org):
    return PROFILE_URL.format(org_id=org.id)


# --------------------------------------------------------------------------- #
# The proven slice: one Secretary, one organisation, one field
# --------------------------------------------------------------------------- #


def test_edit_own_house_bio_round_trip(client, app, house_secretary_headers):
    """ORG-01 end to end: PATCH writes the bio and GET reads it back."""
    house = house_org()
    bio = "Nilgiri House runs monthly city meetups across the south."

    res = client.patch(
        _profile(house), json={"bio": bio}, headers=house_secretary_headers
    )
    assert res.status_code == 200, res.get_json()
    assert res.get_json()["bio"] == bio

    read = client.get(_profile(house), headers=house_secretary_headers)
    assert read.status_code == 200
    assert read.get_json()["bio"] == bio


def test_bio_length_over_1000_is_rejected(client, app, house_secretary_headers):
    """UI-SPEC contract addition 3 — organisations.bio is an unbounded db.Text,
    so a client-side counter over a server with no cap is a promise the server
    does not keep (T-04-04)."""
    house = house_org()

    ok = client.patch(
        _profile(house), json={"bio": "x" * 1000}, headers=house_secretary_headers
    )
    assert ok.status_code == 200

    too_long = client.patch(
        _profile(house), json={"bio": "x" * 1001}, headers=house_secretary_headers
    )
    assert too_long.status_code == 422
    assert too_long.get_json()["code"] == "validation_error"


def test_unknown_org_404(client, app, house_secretary_headers, admin_headers):
    """A nonexistent organisation is 404, never 403 and never 500.

    The url_map assertion is what keeps this test honest: without it, an
    unregistered blueprint would satisfy every 404 below for entirely the wrong
    reason. It also pins the parameter spelling — `org_scoped` reads
    kwargs.get("org_id"), and any other spelling silently 404s every caller
    including admins while the RBAC suite stays green (T-04-02).
    """
    assert PROFILE_URL.replace("{org_id}", "<org_id>") in {
        rule.rule for rule in app.url_map.iter_rules()
    }

    missing = PROFILE_URL.format(org_id="no-such-org-id")

    patched = client.patch(missing, json={"bio": "hi"}, headers=admin_headers)
    assert patched.status_code == 404
    assert patched.get_json()["code"] == "not_found"

    read = client.get(missing, headers=house_secretary_headers)
    assert read.status_code == 404
    assert read.get_json()["code"] == "not_found"


def test_edit_own_house_writes_exactly_one_audit_row(
    client, app, house_secretary_headers
):
    """T-04-05 — a profile mutation is attributable, and only once per PATCH."""
    house = house_org()
    before = AuditLog.query.count()

    res = client.patch(
        _profile(house), json={"bio": "One row, one change."},
        headers=house_secretary_headers,
    )
    assert res.status_code == 200
    assert AuditLog.query.count() == before + 1

    entry = AuditLog.query.order_by(AuditLog.created_at.desc()).first()
    assert entry.entity == "organisation"
    assert entry.entity_id == house.id
