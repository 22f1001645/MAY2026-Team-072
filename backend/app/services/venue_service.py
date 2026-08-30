"""Venue autocomplete — a thin server-side proxy in front of Mappls Autosuggest.

Why a proxy at all: the API key must never reach the browser (a VITE_* name
would be inlined into the client bundle), and routing through the backend is
also what lets `auth_required` keep anonymous traffic off a metered upstream.

Degrades instead of breaking. With no MAPPLS_API_KEY configured the endpoint
answers 501 and the frontend's VenuePicker falls back to a plain text input,
so the app works out of the box for anyone who never sets a key. Upstream
timeouts and 5xx come back as an empty suggestion list for the same reason:
typed text is always a valid venue, so a suggestion-service hiccup must never
look like a form error.

    query ──► _cache hit? ──yes──► cached suggestions
                │no
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
_TIMEOUT_SECONDS = 4
_CACHE_TTL_SECONDS = 60
_CACHE_MAX_ENTRIES = 500

# query string -> (expires_at, suggestions). Process-local; bounded in size and
# each entry is 60s-lived.
# ponytail: single-process dict cache, swap for Redis if the app ever runs
# multi-worker and the upstream quota actually bites.
_cache: dict[str, tuple[float, list[dict]]] = {}


def is_configured() -> bool:
    return bool(current_app.config.get("MAPPLS_API_KEY"))


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

    api_key = current_app.config.get("MAPPLS_API_KEY")
    params = urllib.parse.urlencode({"query": query, "region": "IND"})
    request = urllib.request.Request(
        f"{MAPPLS_AUTOSUGGEST_URL}?{params}",
        headers={"Authorization": f"Bearer {api_key}"},
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
