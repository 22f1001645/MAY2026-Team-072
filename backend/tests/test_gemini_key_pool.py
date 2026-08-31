"""The Gemini key pool — failover when a key runs out of quota.

A free-tier key has a small daily quota and a per-minute rate limit. With one
key, the first hit of either turns every AI surface into a 503 for the rest of
the day. These tests pin that a second key takes over inside the same request,
that non-quota failures do NOT burn the pool, and that exhausting everything
degrades rather than raising something the caller cannot handle.

The vendor client is faked throughout: what is under test is the rotation
policy, not Google's SDK.
"""

import sys
import time
import types as pytypes

import pytest

from app.errors import ApiError
from app.services import gemini


class _FakeError(Exception):
    """Stands in for google.genai's ClientError, which we do not import here."""


class _FakeClient:
    """Records which key it was built with and replays a scripted outcome."""

    def __init__(self, api_key):
        self.api_key = api_key
        _FakeClient.keys_tried.append(api_key)
        self.models = self

    def generate_content(self, model, contents, config):
        outcome = _FakeClient.script.get(self.api_key, "ok")
        if isinstance(outcome, Exception):
            raise outcome
        if outcome == "empty":
            return pytypes.SimpleNamespace(text="")
        return pytypes.SimpleNamespace(text=f"answered by {self.api_key}")


@pytest.fixture
def fake_genai(monkeypatch):
    """Install a fake `google.genai` so `from google import genai` resolves."""
    _FakeClient.keys_tried = []
    _FakeClient.script = {}

    genai_mod = pytypes.ModuleType("google.genai")
    genai_mod.Client = _FakeClient

    types_mod = pytypes.ModuleType("google.genai.types")
    types_mod.GenerateContentConfig = lambda **kw: kw
    genai_mod.types = types_mod

    google_pkg = pytypes.ModuleType("google")
    google_pkg.genai = genai_mod

    monkeypatch.setitem(sys.modules, "google", google_pkg)
    monkeypatch.setitem(sys.modules, "google.genai", genai_mod)
    monkeypatch.setitem(sys.modules, "google.genai.types", types_mod)

    gemini.reset_pool_state()
    yield _FakeClient
    gemini.reset_pool_state()


def _configure(app, keys, single=None):
    app.config["GEMINI_API_KEYS"] = ",".join(keys)
    app.config["GEMINI_API_KEY"] = single


# ------------------------------------------------------------------ the pool
def test_keys_are_read_in_order(app):
    _configure(app, ["one", "two", "three"])
    with app.app_context():
        assert gemini.configured_keys() == ["one", "two", "three"]


def test_the_legacy_single_key_still_works(app):
    """An existing deployment setting only GEMINI_API_KEY must not break."""
    _configure(app, [], single="solo")
    with app.app_context():
        assert gemini.configured_keys() == ["solo"]


def test_the_single_key_joins_the_pool_without_duplicating(app):
    _configure(app, ["one", "two"], single="one")
    with app.app_context():
        assert gemini.configured_keys() == ["one", "two"]


def test_blank_entries_are_ignored(app):
    """A trailing comma in a .env line is the most likely way this list is typed."""
    app.config["GEMINI_API_KEYS"] = "one, ,two,"
    app.config["GEMINI_API_KEY"] = None
    with app.app_context():
        assert gemini.configured_keys() == ["one", "two"]


# -------------------------------------------------------------- the failover
def test_a_quota_error_moves_to_the_next_key(app, fake_genai):
    _configure(app, ["spent", "fresh"])
    fake_genai.script = {"spent": _FakeError("429 RESOURCE_EXHAUSTED: quota exceeded")}

    with app.app_context():
        answer = gemini.generate("hi", "system")

    assert answer == "answered by fresh"
    assert fake_genai.keys_tried == ["spent", "fresh"]


def test_a_rate_limit_moves_to_the_next_key(app, fake_genai):
    _configure(app, ["busy", "fresh"])
    fake_genai.script = {"busy": _FakeError("Too Many Requests: rate limit exceeded")}

    with app.app_context():
        assert gemini.generate("hi", "system") == "answered by fresh"


def test_an_invalid_key_moves_on_rather_than_failing(app, fake_genai):
    """A revoked or mistyped key should cost one retry, not the whole feature."""
    _configure(app, ["revoked", "fresh"])
    fake_genai.script = {"revoked": _FakeError("400 API key not valid")}

    with app.app_context():
        assert gemini.generate("hi", "system") == "answered by fresh"


def test_a_spent_key_is_skipped_on_the_next_call(app, fake_genai):
    """The parking is the point: without it every request pays the failed call."""
    _configure(app, ["spent", "fresh"])
    fake_genai.script = {"spent": _FakeError("quota exceeded")}

    with app.app_context():
        gemini.generate("first", "system")
        fake_genai.keys_tried.clear()
        gemini.generate("second", "system")

    assert fake_genai.keys_tried == ["fresh"], "the spent key should not be retried yet"


def test_a_parked_key_returns_after_its_cooldown(app, fake_genai, monkeypatch):
    """Per-minute limits clear in a minute; discarding the key would mean a
    restart is the only way back."""
    _configure(app, ["recovering", "fresh"])
    fake_genai.script = {"recovering": _FakeError("quota exceeded")}

    real_now = time.time()

    with app.app_context():
        gemini.generate("first", "system")

        # Jump the clock past the cooldown rather than sleeping through it.
        monkeypatch.setattr(gemini.time, "time", lambda: real_now + gemini._COOLDOWN_SECONDS + 1)
        fake_genai.script = {}
        fake_genai.keys_tried.clear()
        answer = gemini.generate("second", "system")

    assert answer == "answered by recovering"


# ---------------------------------------------------- what must NOT rotate
def test_a_non_quota_failure_does_not_burn_the_pool(app, fake_genai):
    """A safety block or a dead network fails identically on every key.

    Retrying would turn one bad request into an outage and spend quota proving
    the same point four times.
    """
    _configure(app, ["one", "two", "three"])
    fake_genai.script = {"one": _FakeError("SAFETY: response blocked")}

    with app.app_context():
        with pytest.raises(_FakeError):
            gemini.generate("hi", "system")

    assert fake_genai.keys_tried == ["one"]


def test_an_empty_completion_is_a_failure_not_an_answer(app, fake_genai):
    _configure(app, ["one", "two"])
    fake_genai.script = {"one": "empty"}

    with app.app_context():
        with pytest.raises(ApiError):
            gemini.generate("hi", "system")


# ------------------------------------------------------------- exhaustion
def test_exhausting_every_key_raises_the_handled_error(app, fake_genai):
    _configure(app, ["a", "b"])
    fake_genai.script = {
        "a": _FakeError("quota exceeded"),
        "b": _FakeError("quota exceeded"),
    }

    with app.app_context():
        with pytest.raises(gemini.AllKeysExhausted):
            gemini.generate("hi", "system")

    assert fake_genai.keys_tried == ["a", "b"]


def test_no_keys_configured_raises_the_handled_error(app, fake_genai):
    _configure(app, [])
    with app.app_context():
        with pytest.raises(gemini.AllKeysExhausted):
            gemini.generate("hi", "system")


# ------------------------------------------- what the assistant does with it
def test_the_assistant_keeps_answering_when_the_pool_is_dry(
    app, client, fake_genai, student_headers
):
    """The whole point of the pool is that running dry is not a visible failure.

    Every key spent still produces a useful answer — the deterministic keyword
    match — and the response says so rather than passing it off as written prose.
    """
    _configure(app, ["a", "b"])
    fake_genai.script = {
        "a": _FakeError("quota exceeded"),
        "b": _FakeError("quota exceeded"),
    }

    res = client.post(
        "/api/v1/assistant/ask",
        json={"question": "where is my QR pass?"},
        headers=student_headers,
    )

    assert res.status_code == 200
    body = res.get_json()
    assert body["source"] == "keyword"
    assert "/me" in [link["path"] for link in body["links"]]


def test_the_assistant_uses_the_second_key_when_the_first_is_spent(
    app, client, fake_genai, student_headers
):
    _configure(app, ["spent", "fresh"])
    fake_genai.script = {"spent": _FakeError("quota exceeded")}

    res = client.post(
        "/api/v1/assistant/ask",
        json={"question": "where is my QR pass?"},
        headers=student_headers,
    )

    body = res.get_json()
    assert body["source"] == "ai", "the second key should have answered"
    assert body["answer"] == "answered by fresh"
