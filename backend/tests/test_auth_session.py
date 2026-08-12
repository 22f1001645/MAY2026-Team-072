"""Session spine: login → refresh → rotate → logout (AUTH-01, phase 02).

Every assertion here rides the cookie-borne refresh flow, so these tests use the
`cookie_client` fixture rather than the header-only `*_headers` fixtures — the
refresh token never travels in a header by design (D-05)."""
from datetime import timedelta

from flask_jwt_extended import create_access_token

STUDENT = ("arav@ekatva.os", "student123")


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
