"""ORG-02: the single predicate that decides whether a user-supplied URL may be
stored AND whether it may be rendered.

One function, two call sites — the write path in `org_profile_service` and the
read path in `public_profile()` — so a link that could never be saved can also
never be served. That is ROADMAP Phase 4 success criterion 2 in full: "rejected
at save time **and** never rendered anywhere". The read-side call is not a
redundant second copy of the write-side one; rows can pre-date this phase,
arrive from a direct database edit or seed data, or come from a future bug, and
`OrganisationSocialLink.url` is documented as stored unvalidated by that layer
on purpose.

Everything here is built on `urllib.parse.urlsplit` and nothing hand-rolls URL
parsing. Every rejection below is a *parser differential* — the validator and
the browser disagreeing about what a string means — so reusing the same parser
the runtime uses is the whole defence. A bespoke one reintroduces the gap by
construction.
"""
import ipaddress
from urllib.parse import urlsplit, urlunsplit

from .constants import SOCIAL_PLATFORMS

ALLOWED_SCHEMES = ("http", "https")

# Must not exceed OrganisationSocialLink.url's String(300) and
# organisations.website's String(300), or SQLite silently accepts a value
# Postgres rejects.
MAX_SOCIAL_URL_LENGTH = 300

# The two rejection codes the API surfaces. They are distinguishable because a
# rejected scheme and a rejected destination are different user corrections and
# the editor renders them under different headings:
#   REJECT_SCHEME — what kind of link this is (must start with http:// or https://)
#   REJECT_HOST   — where the link points (not that platform's address)
# Anything that fakes the host boundary — userinfo, an explicit port, an IP
# literal, a non-ASCII lookalike — is a destination problem, not a scheme one.
REJECT_SCHEME = "social_url_scheme"
REJECT_HOST = "social_url_host"


def _host_allowed(host: str, allowed: tuple) -> bool:
    """Exact match, or a genuine subdomain of an allowed host.

    `host.endswith(a)` alone would accept `instagram.com.evil.com`. The leading
    dot is the entire defence against the suffix attack.
    """
    return any(host == a or host.endswith("." + a) for a in allowed)


def _check(raw):
    """Every control except the per-platform host allowlist.

    Returns `(host, normalised, None)` when the URL is acceptable, or
    `(None, None, <rejection code>)` when it is not. Both public entry points
    share this one body, so the website field's narrowing is visible as a single
    skipped check rather than as a second parser that can drift.
    """
    if not raw or len(raw) > MAX_SOCIAL_URL_LENGTH:
        return None, None, REJECT_SCHEME

    try:
        parts = urlsplit(raw.strip())
    except ValueError:
        return None, None, REJECT_SCHEME

    # First, and unconditionally. `javascript://instagram.com/%0aalert(1)`
    # parses to an ALLOWLISTED host, so any host logic running before this would
    # pass it. Marshmallow's own scheme check is conditional on "://" appearing
    # in the value and cannot be relied on here either.
    if parts.scheme.lower() not in ALLOWED_SCHEMES:
        return None, None, REJECT_SCHEME

    try:
        # `https://instagram.com@evil.com/x` points at evil.com. Read the host
        # from .hostname, which resolves the credentials prefix and lowercases.
        if parts.username or parts.password or parts.port is not None:
            return None, None, REJECT_HOST
        host = parts.hostname
    except ValueError:
        return None, None, REJECT_HOST

    if not host:
        return None, None, REJECT_HOST

    try:
        host.encode("ascii")           # `ínstagram.com`, `instagram。com`
    except UnicodeEncodeError:
        return None, None, REJECT_HOST

    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass                           # a normal domain name — the only shape accepted
    else:
        # An IP literal is never a legitimate public profile or organisation
        # site, and rejecting the whole shape closes the SSRF target now rather
        # than when something eventually fetches a stored URL.
        return None, None, REJECT_HOST

    if host == "localhost" or host.endswith(".localhost"):
        return None, None, REJECT_HOST

    # Re-serialise, dropping the fragment and keeping path and query, so what is
    # stored is exactly what was validated. urlsplit strips tab, CR and LF before
    # parsing (urllib.parse._UNSAFE_URL_BYTES_TO_REMOVE), so storing `raw` would
    # persist a string that differs from the one these checks ran against.
    normalised = urlunsplit((parts.scheme.lower(), host, parts.path, parts.query, ""))
    if len(normalised) > MAX_SOCIAL_URL_LENGTH:
        return None, None, REJECT_SCHEME
    return host, normalised, None


def check_social_url(raw, platform):
    """`(normalised, None)` or `(None, <rejection code>)` for a social link."""
    allowed = SOCIAL_PLATFORMS.get(platform)
    if allowed is None:
        return None, REJECT_HOST
    host, normalised, error = _check(raw)
    if error:
        return None, error
    if not _host_allowed(host, allowed):
        return None, REJECT_HOST
    return normalised, None


def check_website_url(raw):
    """`(normalised, None)` or `(None, <rejection code>)` for the website field.

    D-03's one deliberate narrowing: the per-platform host allowlist is skipped
    because an organisation's own site is on its own domain. Every other control
    still runs.
    """
    _host, normalised, error = _check(raw)
    return (None, error) if error else (normalised, None)


def normalise_social_url(raw, platform):
    """The canonical URL to STORE, or None if it must be rejected."""
    return check_social_url(raw, platform)[0]


def normalise_website_url(raw):
    """The canonical website URL to STORE, or None if it must be rejected."""
    return check_website_url(raw)[0]


def is_renderable_social_url(url, platform) -> bool:
    """The read-side gate. Same predicate as the write side, by construction."""
    return normalise_social_url(url, platform) is not None
