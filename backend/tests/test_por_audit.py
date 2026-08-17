"""The D-14 POR audit: unrecognised `por_type` values must surface as data.

`por_type` is a free-text column by decision (02-CONTEXT.md defers a database
enum), and every authorization predicate matches it against ORGANISER_PORS or
ORG_MANAGER_PORS by exact string. A value in neither set therefore grants
nothing anywhere, and presents to the person holding it as silently losing
organiser access rather than as an error. This endpoint is the only place that
defect is visible, so it must report the unrecognised rows *and only* those —
an audit that also lists every healthy assignment cannot answer the question.
"""
from app.extensions import db
from app.models import User

from .conftest import rc_user, region_org
from .test_rbac_predicates import _give_por

AUDIT_URL = "/api/v1/auth/por-audit"

# Deliberately a plausible typo rather than obvious junk: the failure D-14
# guards against is a fat-fingered POR type that reads correctly at a glance.
TYPO_POR = "Regional Coordinatr"


def _user(email, name="Someone"):
    user = User(name=name, email=email, password_hash="x",
                role="student", city="Hyderabad")
    db.session.add(user)
    db.session.flush()
    return user


def test_por_audit_reports_only_unrecognised_por_types(client, admin_headers):
    # _seed_minimal already gave the RC a recognised "Regional Coordinator".
    assert rc_user() is not None
    _give_por(_user("typo@ekatva.os"), region_org(), TYPO_POR)
    db.session.commit()

    res = client.get(AUDIT_URL, headers=admin_headers)

    assert res.status_code == 200
    body = res.get_json()
    assert [row["por_type"] for row in body] == [TYPO_POR]


def test_por_audit_returns_empty_when_every_por_type_is_recognised(client, admin_headers):
    """The healthy state is legible, not an implicit success."""
    _give_por(_user("clean@ekatva.os"), region_org(), "House Secretary")
    db.session.commit()

    res = client.get(AUDIT_URL, headers=admin_headers)

    assert res.status_code == 200
    assert res.get_json() == []


def test_por_audit_requires_admin(client, student_headers, rc_headers):
    assert client.get(AUDIT_URL, headers=student_headers).status_code == 403
    assert client.get(AUDIT_URL, headers=rc_headers).status_code == 403


def test_por_audit_includes_inactive_assignments(client, admin_headers):
    """A typo does not stop being a data defect because the row was deactivated."""
    _give_por(_user("stale@ekatva.os"), region_org(), TYPO_POR, active=False)
    db.session.commit()

    res = client.get(AUDIT_URL, headers=admin_headers)

    assert res.status_code == 200
    body = res.get_json()
    assert [(row["por_type"], row["active"]) for row in body] == [(TYPO_POR, False)]
