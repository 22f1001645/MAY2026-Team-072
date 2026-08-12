"""DASH-01 / D-18, verification map row 16: the client's Student/Organiser view
changes zero authorization outcomes.

The point of these tests is that the server has *no view input to honour*. They
pass today trivially, and that is exactly their value: the day someone adds a
`request.args.get("view")` branch to one of these endpoints, this module goes
red and names the regression. It is the server-side half of the proof whose
client-side half lives in `frontend/src/lib/__tests__/view-not-sent.test.ts` —
that one asserts the value is never sent, this one asserts it would not matter
if it were (T-02-08).

The hints below are deliberately the shapes a well-meaning future change would
reach for first: an `X-View` header and a `?view=` query parameter.
"""

import pytest

# Three authenticated GETs the organiser surface actually calls: the session
# itself, the organiser dashboard, and the activity feed.
ENDPOINTS = ["/api/v1/auth/me", "/api/v1/dashboard", "/api/v1/events"]

VIEW_HINTS = ["organiser", "student"]


def _hinted(client, path, headers, view):
    """The same request, plus every channel a view could plausibly ride in."""
    sep = "&" if "?" in path else "?"
    return client.get(
        f"{path}{sep}view={view}",
        headers={**headers, "X-View": view, "X-Ekatva-View": view},
    )


@pytest.mark.parametrize("path", ENDPOINTS)
@pytest.mark.parametrize("view", VIEW_HINTS)
def test_response_is_identical_with_and_without_a_view_hint(client, rc_headers, path, view):
    plain = client.get(path, headers=rc_headers)
    assert plain.status_code == 200

    hinted = _hinted(client, path, rc_headers, view)

    assert hinted.status_code == plain.status_code
    assert hinted.get_json() == plain.get_json()


def test_the_dashboard_role_comes_from_pors_not_from_the_view(client, rc_headers):
    """The server's own notion of "organiser" is POR-derived (PRD P3).

    A hint claiming the opposite view does not move it, which is the concrete
    version of "the view changes zero authorization outcomes"."""
    plain = client.get("/api/v1/dashboard", headers=rc_headers)
    assert plain.get_json()["role"] == "organiser"

    # The RC asks to be seen as a student. The server does not care.
    assert _hinted(client, "/api/v1/dashboard", rc_headers, "student").get_json()["role"] == "organiser"


@pytest.mark.parametrize("view", VIEW_HINTS)
def test_a_view_hint_never_grants_access_a_user_does_not_have(client, student_headers, view):
    """The elevation case stated directly: a plain student claiming the organiser
    view is refused an admin-only endpoint exactly as they were before."""
    plain = client.get("/api/v1/analytics", headers=student_headers)
    assert plain.status_code == 403

    hinted = _hinted(client, "/api/v1/analytics", student_headers, view)
    assert hinted.status_code == plain.status_code


@pytest.mark.parametrize("view", VIEW_HINTS)
def test_a_view_hint_never_removes_access_a_user_does_have(client, rc_headers, view):
    """The mirror of the case above — a hint must not downgrade either, or the
    switcher would become a way to lock yourself out of your own surfaces."""
    plain = client.get("/api/v1/dashboard", headers=rc_headers)
    assert plain.status_code == 200

    assert _hinted(client, "/api/v1/dashboard", rc_headers, view).status_code == 200
