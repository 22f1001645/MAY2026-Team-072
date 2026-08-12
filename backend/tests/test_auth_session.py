"""Session spine: login → refresh → rotate → logout (AUTH-01, phase 02).

Every assertion here rides the cookie-borne refresh flow, so these tests use the
`cookie_client` fixture rather than the header-only `*_headers` fixtures — the
refresh token never travels in a header by design (D-05)."""
from datetime import timedelta

import pytest
from flask_jwt_extended import create_access_token, decode_token

from app.extensions import db
from app.models import RefreshTokenBlocklist

from .conftest import CookieClient

STUDENT = ("arav@ekatva.os", "student123")


def _set_cookie_header(response, name):
    """The raw Set-Cookie line for `name`.

    Read raw rather than via the client's cookie jar: the jar keeps only the
    value and discards the Max-Age and HttpOnly directives, which are the whole
    point of the assertions below."""
    for header in response.headers.get_all("Set-Cookie"):
        if header.startswith(f"{name}="):
            return header
    return None


def test_login_then_refresh_returns_new_access_token(cookie_client):
    """The tracer: one real path through repository, app factory, controller and
    service. A 500 here is the exact defect this plan closes."""
    login = cookie_client.login_as(*STUDENT)
    assert login.status_code == 200, login.get_data(as_text=True)
    first_access = login.get_json()["access_token"]

    res = cookie_client.post_refresh()

    assert res.status_code != 500, (
        "POST /auth/refresh returned 500 — the blocklist loader raised before the "
        f"view body ran. Body: {res.get_data(as_text=True)}"
    )
    assert res.status_code == 200, res.get_data(as_text=True)
    body = res.get_json()
    assert "access_token" in body
    assert body["access_token"] != first_access


def test_refresh_uses_the_cookie_even_when_a_stale_access_token_header_is_present(
    cookie_client, app
):
    """The real client attaches `Authorization: Bearer <access>` to every request,
    including /auth/refresh — and by the time refresh is needed that access token
    has expired. If the header location wins over the cookie, the expired header
    is decoded and refresh fails exactly when it is needed most (T-02-17)."""
    login = cookie_client.login_as(*STUDENT)
    assert login.status_code == 200

    with app.app_context():
        stale_access = create_access_token(
            identity="stale-user", expires_delta=timedelta(seconds=-1)
        )

    res = cookie_client.post_refresh(
        extra_headers={"Authorization": f"Bearer {stale_access}"}
    )

    assert res.status_code == 200, (
        "Refresh must read the refresh cookie, not the stale Authorization header. "
        f"Got {res.status_code}: {res.get_data(as_text=True)}"
    )
    assert "access_token" in res.get_json()


def test_refresh_cookie_carries_max_age_and_is_not_a_session_cookie(cookie_client):
    """D-05b. A session cookie dies on browser quit, so "close the tab and come
    back still logged in" would fail intermittently and look like a flake.
    Secure is deliberately not asserted — it is False by design in dev config."""
    login = cookie_client.login_as(*STUDENT)
    assert login.status_code == 200

    header = _set_cookie_header(login, "refresh_token_cookie")

    assert header is not None, "login set no refresh_token_cookie"
    assert "Max-Age=" in header, f"refresh cookie is a session cookie: {header}"
    assert "HttpOnly" in header, f"refresh cookie is readable by JS: {header}"


def test_refresh_rotation_blocklists_old_jti_and_returns_a_different_token(
    cookie_client, app
):
    """Rotation must spend the old token and carry the family forward. A rotation
    that minted a fresh family would silently break the reuse detection 02-03
    builds on, and this is the cheapest place to catch that."""
    login = cookie_client.login_as(*STUDENT)
    assert login.status_code == 200
    old_cookie = cookie_client.refresh_cookie
    assert old_cookie

    res = cookie_client.post_refresh()
    assert res.status_code == 200, res.get_data(as_text=True)
    new_cookie = cookie_client.refresh_cookie

    assert new_cookie != old_cookie, "rotation returned the same refresh token"

    with app.app_context():
        old_claims = decode_token(old_cookie)
        new_claims = decode_token(new_cookie)

        row = (
            db.session.query(RefreshTokenBlocklist)
            .filter_by(jti=old_claims["jti"])
            .first()
        )

    assert row is not None, "the spent refresh token was not blocklisted"
    assert row.reason == "rotated"
    assert row.family_id == old_claims["fam"]
    assert new_claims["fam"] == old_claims["fam"], (
        "rotation minted a new family id — reuse detection in 02-03 depends on "
        "the family being carried forward unchanged"
    )


def test_logout_clears_cookies_and_revokes_only_this_family(cookie_client, app):
    """D-04: logout ends the session on this device and no other. The second
    client is a second device — separate clients have separate cookie jars."""
    assert cookie_client.login_as(*STUDENT).status_code == 200
    device_cookie = cookie_client.refresh_cookie

    other_device = CookieClient(app.test_client())
    assert other_device.login_as(*STUDENT).status_code == 200

    res = cookie_client.post_logout()

    assert res.status_code == 200, res.get_data(as_text=True)
    for name in ("refresh_token_cookie", "csrf_refresh_token"):
        header = _set_cookie_header(res, name)
        assert header is not None, f"logout did not clear {name}"
        assert header.startswith(f"{name}=;"), f"{name} was not cleared: {header}"

    with app.app_context():
        family_id = decode_token(device_cookie)["fam"]
        row = (
            db.session.query(RefreshTokenBlocklist)
            .filter_by(family_id=family_id, reason="logout")
            .first()
        )
    assert row is not None, "logout wrote no revocation row for this family"

    # The other device was never told to log out, so its session survives.
    assert other_device.post_refresh().status_code == 200, (
        "logging out on one device revoked another device's session — D-04 says "
        "logout is device scoped"
    )


@pytest.mark.parametrize("endpoint", ["/api/v1/auth/refresh", "/api/v1/auth/logout"])
@pytest.mark.parametrize("cookie_state", ["absent", "valid", "garbage"])
def test_auth_cookie_endpoints_never_return_500(app, endpoint, cookie_state):
    """The permanent guard against the class of defect this plan fixed: a missing
    repository method turned every call to both endpoints into an unhandled 500,
    denying all sessions (T-02-15).

    Exact per-state codes are deliberately not pinned — the point is the absence
    of an unhandled exception, and pinning codes would make this brittle against
    the CSRF and reuse work landing in 02-03."""
    client = CookieClient(app.test_client())

    if cookie_state != "absent":
        assert client.login_as(*STUDENT).status_code == 200
    if cookie_state == "garbage":
        client.set_cookie("refresh_token_cookie", "not-a-jwt-at-all")

    res = client.post(endpoint, headers=client.csrf_headers())

    assert res.status_code != 500, (
        f"{endpoint} raised an unhandled exception with a {cookie_state} cookie: "
        f"{res.get_data(as_text=True)}"
    )
    assert res.status_code in {200, 401, 422}, (
        f"{endpoint} with a {cookie_state} cookie returned an undocumented "
        f"{res.status_code}: {res.get_data(as_text=True)}"
    )
