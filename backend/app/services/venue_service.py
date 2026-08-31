"""Venue autocomplete — a thin server-side proxy in front of Mappls Autosuggest.

Why a proxy at all: the API key must never reach the browser (a VITE_* name
would be inlined into the client bundle), and routing through the backend is
also what lets `auth_required` keep anonymous traffic off a metered upstream.

Mappls issues no static API key. A client_id/client_secret pair is exchanged
for a bearer token that lives about a day, so this module holds two caches:
one for the token, one for recent queries.

Degrades instead of breaking. With no credentials configured the endpoint
answers 501 and the frontend's VenuePicker falls back to a plain text input,
so the app works out of the box for anyone who never signs up. A failed token
request, an upstream timeout and a 5xx all come back as an empty suggestion
list for the same reason: typed text is always a valid venue, so a suggestion
service having a bad day must never look like a form error.

    query ──► _cache hit? ──yes──► cached suggestions
                │no
                ▼
        _get_access_token ──fail──► []
                │ok (cached ~24h)
                ▼
        Mappls Autosuggest ──error/timeout──► []  (never raises to the caller)
                │ok
                ▼
        normalise ──► store in _cache (60s TTL) ──► suggestions
"""
import json
import time
import urllib.error
import urllib.parse
import urllib.request

from flask import current_app

MAPPLS_AUTOSUGGEST_URL = "https://atlas.mappls.com/api/places/search/json"
MAPPLS_TOKEN_URL = "https://outpost.mappls.com/api/security/oauth/token"
_TIMEOUT_SECONDS = 4
_CACHE_TTL_SECONDS = 60
_CACHE_MAX_ENTRIES = 500
# Refresh this far before the stated expiry, so a request never leaves with a
# token that dies in flight.
_TOKEN_REFRESH_MARGIN_SECONDS = 300

# query string -> (expires_at, suggestions). Process-local; bounded in size and
# each entry is 60s-lived.
# ponytail: single-process dict cache, swap for Redis if the app ever runs
# multi-worker and the upstream quota actually bites.
_cache: dict[str, tuple[float, list[dict]]] = {}

# (expires_at, access_token). Mappls issues ~24h tokens, so this is fetched
# roughly once a day per process rather than per request.
_token: tuple[float, str] | None = None


def is_configured() -> bool:
    """Both halves of the OAuth2 client credential must be present.

    Mappls does NOT issue a static API key: client_id/client_secret are
    exchanged for a short-lived bearer token (see _get_access_token)."""
    config = current_app.config
    return bool(config.get("MAPPLS_CLIENT_ID") and config.get("MAPPLS_CLIENT_SECRET"))


def _get_access_token() -> str | None:
    """A valid bearer token, from cache or freshly minted. None if unavailable.

    Returning None rather than raising keeps the failure shape identical to an
    autosuggest outage: the caller renders "no venues found" and the typed text
    is still a perfectly good venue."""
    global _token

    if _token and time.monotonic() < _token[0]:
        return _token[1]

    body = urllib.parse.urlencode(
        {
            "grant_type": "client_credentials",
            "client_id": current_app.config["MAPPLS_CLIENT_ID"],
            "client_secret": current_app.config["MAPPLS_CLIENT_SECRET"],
        }
    ).encode("utf-8")
    request = urllib.request.Request(
        MAPPLS_TOKEN_URL,
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )

    try:
        with urllib.request.urlopen(request, timeout=_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        current_app.logger.warning("Mappls token request failed: %s", exc)
        return None

    access_token = payload.get("access_token")
    if not access_token:
        current_app.logger.warning("Mappls token response carried no access_token")
        return None

    # Default to an hour if the field is missing; never trust it to be present.
    expires_in = payload.get("expires_in") or 3600
    lifetime = max(int(expires_in) - _TOKEN_REFRESH_MARGIN_SECONDS, 60)
    _token = (time.monotonic() + lifetime, access_token)
    return access_token


def _cache_get(key: str):
    hit = _cache.get(key)
    if not hit:
        return None
    expires_at, suggestions = hit
    if time.monotonic() >= expires_at:
        _cache.pop(key, None)
        return None
    return suggestions


def _cache_put(key: str, suggestions: list[dict]) -> None:
    if len(_cache) >= _CACHE_MAX_ENTRIES:
        _cache.clear()  # crude, but bounded; entries are 60s-lived anyway
    _cache[key] = (time.monotonic() + _CACHE_TTL_SECONDS, suggestions)


def _normalise(payload: dict) -> list[dict]:
    """Mappls returns richer records than the picker needs; keep four fields."""
    out = []
    for item in payload.get("suggestedLocations", []) or []:
        name = item.get("placeName")
        if not name:
            continue
        out.append(
            {
                "name": name,
                "address": item.get("placeAddress", ""),
                "lat": item.get("latitude"),
                "lng": item.get("longitude"),
            }
        )
    return out


def suggest(query: str) -> list[dict]:
    """Venue suggestions for `query`. Returns [] on anything short of success."""
    query = (query or "").strip()
    if len(query) < 3:
        return []

    cached = _cache_get(query)
    if cached is not None:
        return cached

    access_token = _get_access_token()
    if not access_token:
        return []

    params = urllib.parse.urlencode({"query": query, "region": "IND"})
    request = urllib.request.Request(
        f"{MAPPLS_AUTOSUGGEST_URL}?{params}",
        headers={"Authorization": f"Bearer {access_token}"},
    )

    try:
        with urllib.request.urlopen(request, timeout=_TIMEOUT_SECONDS) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        # Logged, not raised: the caller renders "no venues found" and the
        # organiser's typed text stays valid.
        current_app.logger.warning("Mappls autosuggest failed for %r: %s", query, exc)
        return []

    suggestions = _normalise(payload)
    _cache_put(query, suggestions)
    return suggestions
