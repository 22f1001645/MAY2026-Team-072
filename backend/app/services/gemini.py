"""One Gemini call, several keys, no visible failure when one runs dry.

A free-tier Gemini key has a small daily quota and a per-minute rate limit. With
a single key, the first hit of either turns every AI surface in Ekatva OS into a
503 for the rest of the day — during a demo, that reads as "the feature is
broken" rather than "the quota is spent".

So the key is a *pool*. Keys are tried in order; when one answers with a quota
or rate-limit error it is parked for a cooldown and the next key takes over
within the same request. The caller never sees the switch. Only when every key
in the pool is exhausted does this raise, and the caller's existing degraded
path (a keyword match, a 503) takes over exactly as before.

Two deliberate limits:

- **Only quota, rate-limit and bad-key errors rotate.** A prompt that trips a
  safety filter, or a network that is down, will fail identically on every key —
  burning the whole pool on it would turn one bad request into an outage. Those
  raise on the first attempt.
- **A parked key is retried, not discarded.** Per-minute limits clear in a
  minute and daily quotas clear overnight, so a key parked at 11am is usable
  again later. Discarding it would mean a restart is the only way back.

The cooldown lives in memory, which is the right scope: it is a hint about a
remote quota, not a fact worth persisting, and a fresh process re-probing every
key costs one request.
"""

import threading
import time

from flask import current_app

from ..errors import ApiError

# Substrings that mean "this key is spent, another key would work". Matched
# against the vendor exception's text because google-genai raises a single
# ClientError type for all of these and the status code is not always present.
_ROTATE_ON = (
    "resource_exhausted",
    "resource exhausted",
    "quota",
    "rate limit",
    "rate_limit",
    "429",
    "too many requests",
    "api key not valid",
    "api_key_invalid",
    "permission_denied",
    "invalid api key",
    "expired",
)

# How long a key sits out after answering with a quota error. Long enough to
# stop hammering a per-minute limit, short enough that a key freed by a rolling
# window comes back inside one working session.
_COOLDOWN_SECONDS = 15 * 60

# key -> unix time it becomes usable again. Module-level so the parking survives
# across requests within a process; guarded because Flask serves concurrently.
_parked: dict[str, float] = {}
_lock = threading.Lock()


class AllKeysExhausted(RuntimeError):
    """Every key in the pool is parked or failed. The caller should degrade."""


def configured_keys() -> list[str]:
    """The pool, in the order it should be tried.

    GEMINI_API_KEYS (comma-separated) is the pool; GEMINI_API_KEY stays
    supported and is appended, so an existing single-key deployment keeps
    working with no config change. Duplicates are collapsed because listing the
    same key twice would double the apparent pool size and halve nothing.
    """
    raw = current_app.config.get("GEMINI_API_KEYS") or ""
    keys = [k.strip() for k in raw.split(",") if k.strip()]

    single = current_app.config.get("GEMINI_API_KEY")
    if single and single.strip():
        keys.append(single.strip())

    seen, ordered = set(), []
    for k in keys:
        if k not in seen:
            seen.add(k)
            ordered.append(k)
    return ordered


def _should_rotate(exc: Exception) -> bool:
    text = f"{type(exc).__name__} {exc}".lower()
    return any(marker in text for marker in _ROTATE_ON)


def _park(key: str) -> None:
    with _lock:
        _parked[key] = time.time() + _COOLDOWN_SECONDS


def _is_parked(key: str) -> bool:
    with _lock:
        until = _parked.get(key)
        if until is None:
            return False
        if time.time() >= until:
            # Cooldown served — let it back into rotation.
            del _parked[key]
            return False
        return True


def reset_pool_state() -> None:
    """Forget every parked key. For tests, and for an operator who has just
    raised a quota and does not want to wait out a cooldown."""
    with _lock:
        _parked.clear()


def generate(contents, system_instruction, *, temperature=0.2, max_output_tokens=800) -> str:
    """Ask Gemini, trying each configured key until one answers.

    Returns the completion text. Raises AllKeysExhausted when the pool cannot
    serve the request, and lets any non-rotatable vendor error propagate on the
    first attempt.

    `max_output_tokens` is generous because Gemini 3 models spend part of that
    budget on internal reasoning before emitting a word. At 200 the assistant
    replied "You can find your QR pass on" — a truncation that reads as a broken
    feature. The prompts, not the ceiling, are what keep answers short.
    """
    keys = configured_keys()
    if not keys:
        raise AllKeysExhausted("No Gemini API key is configured.")

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        current_app.logger.warning(
            "A Gemini key is configured but google-genai is not installed; "
            "run pip install -r requirements.txt."
        )
        raise AllKeysExhausted("The Gemini client library is not installed.")

    model = current_app.config["GEMINI_MODEL"]
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        temperature=temperature,
        max_output_tokens=max_output_tokens,
    )

    # Prefer keys that are not cooling down, but keep the parked ones as a last
    # resort: a cooldown is a guess about a remote quota, and guessing wrong
    # should cost a retry, not the whole answer.
    fresh = [k for k in keys if not _is_parked(k)]
    order = fresh or keys

    last_rotatable = None
    for position, key in enumerate(order, start=1):
        try:
            client = genai.Client(api_key=key)
            response = client.models.generate_content(
                model=model, contents=contents, config=config
            )
            text = (response.text or "").strip()
            if not text:
                # An empty completion is a failure, not an answer, and it is not
                # a quota problem — another key would return the same nothing.
                raise ApiError("The model returned an empty answer.", "ai_failed", 503)
            return text

        except ApiError:
            raise

        except Exception as exc:
            if not _should_rotate(exc):
                # Safety blocks, malformed requests, a dead network: identical on
                # every key. Burning the pool on one bad request would turn a
                # single failure into an outage.
                current_app.logger.error(
                    "Gemini call failed on key %d/%d and is not retryable",
                    position,
                    len(order),
                    exc_info=True,
                )
                raise

            _park(key)
            last_rotatable = exc
            # The vendor's text can carry the prompt, the completion or the key
            # itself, so only the position is logged — never the exception.
            current_app.logger.warning(
                "Gemini key %d/%d is rate-limited or out of quota; trying the next one.",
                position,
                len(order),
            )

    current_app.logger.error(
        "All %d Gemini keys are exhausted; the caller will degrade.",
        len(order),
        exc_info=last_rotatable,
    )
    raise AllKeysExhausted("Every configured Gemini key is rate-limited or out of quota.")
