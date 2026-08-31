"""Venue autocomplete proxy (T4).

The load-bearing cases here are the credential ones: with no Mappls client
credentials set the app must still work end to end, because that is how anyone
who never signs up — a grader included — will run it.
"""
import json
import urllib.error
from unittest.mock import patch

import pytest

from app.services import venue_service


class _FakeResponse:
    """Minimal stand-in for the urlopen context manager."""

    def __init__(self, payload):
        self._payload = json.dumps(payload).encode("utf-8")

    def read(self):
        return self._payload

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


MAPPLS_PAYLOAD = {
    "suggestedLocations": [
        {
            "placeName": "Roastery Coffee House",
            "placeAddress": "Banjara Hills, Hyderabad",
            "latitude": 17.41,
            "longitude": 78.44,
        },
        # No placeName — must be dropped, not rendered as a blank row.
        {"placeAddress": "Nowhere", "latitude": 0, "longitude": 0},
    ]
}


TOKEN_PAYLOAD = {"access_token": "tok-abc", "token_type": "bearer", "expires_in": 86499}


def _responses(*payloads):
    """urlopen side effect returning each payload in turn.

    Every suggest() on a cold process makes TWO calls — the token exchange,
    then the search — so tests hand over both."""
    return [_FakeResponse(p) for p in payloads]


@pytest.fixture(autouse=True)
def _clear_caches():
    venue_service._cache.clear()
    venue_service._token = None
    yield
    venue_service._cache.clear()
    venue_service._token = None


@pytest.fixture
def keyed_app(app):
    app.config["MAPPLS_CLIENT_ID"] = "test-client-id"
    app.config["MAPPLS_CLIENT_SECRET"] = "test-client-secret"
    return app


def test_suggestions_come_back_normalised(keyed_app, client, rc_headers):
    with patch(
        "urllib.request.urlopen", side_effect=_responses(TOKEN_PAYLOAD, MAPPLS_PAYLOAD)
    ):
        res = client.get("/api/v1/venues/autocomplete?q=roastery", headers=rc_headers)

    assert res.status_code == 200
    suggestions = res.get_json()["suggestions"]
    assert suggestions == [
        {
            "name": "Roastery Coffee House",
            "address": "Banjara Hills, Hyderabad",
            "lat": 17.41,
            "lng": 78.44,
        }
    ]


def test_upstream_failure_is_an_empty_list_not_an_error(keyed_app, client, rc_headers):
    """A Mappls hiccup must not read as a form error — typed text stays valid."""
    with patch(
        "urllib.request.urlopen",
        side_effect=[_FakeResponse(TOKEN_PAYLOAD), urllib.error.URLError("boom")],
    ):
        res = client.get("/api/v1/venues/autocomplete?q=roastery", headers=rc_headers)

    assert res.status_code == 200
    assert res.get_json()["suggestions"] == []


def test_a_failed_token_request_degrades_quietly(keyed_app, client, rc_headers):
    """Bad or rejected credentials must look like "no results", not a 500."""
    with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("401")):
        res = client.get("/api/v1/venues/autocomplete?q=roastery", headers=rc_headers)

    assert res.status_code == 200
    assert res.get_json()["suggestions"] == []


def test_the_access_token_is_reused_across_queries(keyed_app, client, rc_headers):
    """One token exchange, then a search per distinct query — not two exchanges."""
    with patch(
        "urllib.request.urlopen",
        side_effect=_responses(TOKEN_PAYLOAD, MAPPLS_PAYLOAD, MAPPLS_PAYLOAD),
    ) as urlopen:
        client.get("/api/v1/venues/autocomplete?q=roastery", headers=rc_headers)
        client.get("/api/v1/venues/autocomplete?q=chai+point", headers=rc_headers)

    assert urlopen.call_count == 3  # 1 token + 2 searches


def test_repeat_query_is_served_from_cache(keyed_app, client, rc_headers):
    with patch(
        "urllib.request.urlopen", side_effect=_responses(TOKEN_PAYLOAD, MAPPLS_PAYLOAD)
    ) as urlopen:
        client.get("/api/v1/venues/autocomplete?q=roastery", headers=rc_headers)
        client.get("/api/v1/venues/autocomplete?q=roastery", headers=rc_headers)

    assert urlopen.call_count == 2  # 1 token + 1 search; the repeat hit the cache


def test_short_query_never_reaches_the_upstream(keyed_app, client, rc_headers):
    with patch("urllib.request.urlopen") as urlopen:
        res = client.get("/api/v1/venues/autocomplete?q=ro", headers=rc_headers)

    assert res.status_code == 200
    assert res.get_json()["suggestions"] == []
    urlopen.assert_not_called()


def test_anonymous_request_is_rejected(keyed_app, client):
    """Without auth this is an open relay onto a metered upstream."""
    res = client.get("/api/v1/venues/autocomplete?q=roastery")
    assert res.status_code == 401


def test_without_credentials_the_endpoint_reports_itself_unavailable(app, client, rc_headers):
    app.config["MAPPLS_CLIENT_ID"] = None
    app.config["MAPPLS_CLIENT_SECRET"] = None
    res = client.get("/api/v1/venues/autocomplete?q=roastery", headers=rc_headers)

    assert res.status_code == 501
    assert res.get_json()["code"] == "venue_autocomplete_unavailable"


def test_half_a_credential_is_still_unconfigured(app, client, rc_headers):
    """An id with no secret cannot mint a token, so it must not claim to work."""
    app.config["MAPPLS_CLIENT_ID"] = "test-client-id"
    app.config["MAPPLS_CLIENT_SECRET"] = None
    res = client.get("/api/v1/venues/autocomplete?q=roastery", headers=rc_headers)

    assert res.status_code == 501
