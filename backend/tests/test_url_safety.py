"""ORG-02 — the URL-safety predicate, as a vector table.

Every row below was executed against `urllib.parse.urlsplit` before it was
written down (04-RESEARCH §D-3): these are observed behaviours of the parser
this application actually uses, not guesses about what a URL "looks like".
That matters because every one of the rejections is a *parser differential* —
the validator and the browser disagreeing about what a string means — so a
hand-rolled parser would reintroduce the gap by construction.

Deliberately a pure unit module with no app fixture: it is the fastest feedback
loop in the phase and can be run on every commit in under a second.
"""
import pytest

from app.constants import SOCIAL_FIELD_ORDER, SOCIAL_PLATFORM_KEYS, SOCIAL_PLATFORMS
from app.url_safety import (
    MAX_SOCIAL_URL_LENGTH,
    is_renderable_social_url,
    normalise_social_url,
    normalise_website_url,
)

# --------------------------------------------------------------------------- #
# Accepted — and what is STORED is the re-serialised value, never the input
# --------------------------------------------------------------------------- #
ACCEPTED = [
    pytest.param(
        "https://instagram.com/ekatva", "instagram", "https://instagram.com/ekatva",
        id="plain",
    ),
    pytest.param(
        "HTTPS://Instagram.COM/Ekatva?ref=1#frag", "instagram",
        "https://instagram.com/Ekatva?ref=1",
        id="scheme_and_host_lowercased_path_case_kept_fragment_dropped",
    ),
    pytest.param(
        "https://insta\tgram.com/x", "instagram", "https://instagram.com/x",
        id="parser_differential_tab",
    ),
    pytest.param(
        "https://instagram.com/x\n", "instagram", "https://instagram.com/x",
        id="parser_differential_newline",
    ),
    pytest.param(
        "https://www.linkedin.com/company/x", "linkedin",
        "https://www.linkedin.com/company/x",
        id="legitimate_subdomain",
    ),
    pytest.param(
        "https://youtu.be/abc", "youtube", "https://youtu.be/abc",
        id="second_allowed_host_for_a_platform",
    ),
]


@pytest.mark.parametrize("raw,platform,expected", ACCEPTED)
def test_accepted_urls_normalise(raw, platform, expected):
    """The return value is the string to STORE.

    `urlsplit` strips tab, CR and LF before parsing
    (`urllib.parse._UNSAFE_URL_BYTES_TO_REMOVE`), so returning `raw` would
    persist a string that is not the string that was validated.
    """
    assert normalise_social_url(raw, platform) == expected


# --------------------------------------------------------------------------- #
# Rejected — every one of these returns None
# --------------------------------------------------------------------------- #
REJECTED = [
    pytest.param("javascript:alert(1)", "instagram", id="javascript_scheme"),
    pytest.param(
        "javascript://instagram.com/%0aalert(1)", "instagram",
        id="javascript_scheme_with_allowlisted_host",
    ),
    pytest.param("data:text/html;base64,PHN2Zz4=", "instagram", id="data_scheme"),
    pytest.param("//instagram.com/x", "instagram", id="scheme_relative_empty_scheme"),
    pytest.param("ftp://instagram.com/x", "instagram", id="ftp_scheme"),
    pytest.param("https://instagram.com@evil.com/x", "instagram", id="userinfo"),
    pytest.param("https://evil.com#@instagram.com", "instagram", id="userinfo_in_fragment"),
    pytest.param("https://instagram.com.evil.com/x", "instagram", id="suffix_attack"),
    pytest.param("https://ínstagram.com/x", "instagram", id="homograph_latin_accent"),
    pytest.param("https://instagram。com/x", "instagram", id="homograph_ideographic_stop"),
    pytest.param("https://instagram.com:8443/x", "instagram", id="explicit_port"),
    pytest.param("http://127.0.0.1:5000/admin", "instagram", id="ssrf_loopback_ip"),
    pytest.param("http://localhost/x", "instagram", id="ssrf_localhost"),
    pytest.param("http://10.0.0.1/x", "instagram", id="ssrf_private_range"),
    pytest.param("http://169.254.169.254/x", "instagram", id="ssrf_link_local_metadata"),
    pytest.param("http://[::1]/x", "instagram", id="ssrf_ipv6_loopback"),
    pytest.param(
        "https://linkedin.com/company/x", "instagram",
        id="right_host_wrong_platform",
    ),
    pytest.param(
        "https://instagram.com/" + "x" * MAX_SOCIAL_URL_LENGTH, "instagram",
        id="over_length",
    ),
    pytest.param("", "instagram", id="empty_string"),
    pytest.param(None, "instagram", id="none_value"),
    pytest.param("https://instagram.com/x", "myspace", id="unknown_platform"),
    pytest.param("https://instagram.com/x", "website", id="website_is_not_a_platform"),
]


@pytest.mark.parametrize("raw,platform", REJECTED)
def test_rejected_urls_return_none(raw, platform):
    assert normalise_social_url(raw, platform) is None


def test_scheme_is_checked_first_and_unconditionally():
    """`javascript://instagram.com/%0aalert(1)` parses to an ALLOWLISTED host.

    So the host allowlist alone would pass it. Marshmallow's own scheme check is
    conditional on `"://" in value` and cannot be relied on here either — this
    module's check runs first and always.
    """
    assert normalise_social_url("javascript://instagram.com/%0aalert(1)", "instagram") is None
    assert normalise_social_url("javascript:alert(1)", "instagram") is None


def test_suffix_attack_needs_the_leading_dot():
    """`endswith("instagram.com")` alone accepts `instagram.com.evil.com`."""
    assert normalise_social_url("https://instagram.com.evil.com/x", "instagram") is None
    assert normalise_social_url("https://evil.com.instagram.com/x", "instagram") == (
        "https://evil.com.instagram.com/x"
    )


def test_length_boundary_is_enforced_on_the_value_returned():
    at_limit = "https://instagram.com/" + "x" * (MAX_SOCIAL_URL_LENGTH - 22)
    assert len(at_limit) == MAX_SOCIAL_URL_LENGTH
    assert normalise_social_url(at_limit, "instagram") == at_limit
    assert normalise_social_url(at_limit + "x", "instagram") is None


def test_every_accepted_value_fits_the_column():
    """MAX_SOCIAL_URL_LENGTH must not exceed OrganisationSocialLink.url's
    String(300), or SQLite silently accepts what Postgres rejects."""
    assert MAX_SOCIAL_URL_LENGTH == 300
    for raw, platform, expected in [p.values for p in ACCEPTED]:
        assert len(normalise_social_url(raw, platform)) <= MAX_SOCIAL_URL_LENGTH


def test_is_renderable_mirrors_normalise():
    """One function, two call sites: a link that could never be saved can also
    never be served (ROADMAP Phase 4 criterion 2, second clause)."""
    assert is_renderable_social_url("https://instagram.com/x", "instagram") is True
    assert is_renderable_social_url("javascript:alert(1)", "instagram") is False
    assert is_renderable_social_url("https://evil.com/x", "instagram") is False


# --------------------------------------------------------------------------- #
# The website field — D-03's ONE narrowing: the host allowlist, and nothing else
# --------------------------------------------------------------------------- #


def test_website_accepts_a_host_no_platform_allowlist_would():
    assert normalise_website_url("https://ekatva.example.org/about") == (
        "https://ekatva.example.org/about"
    )
    assert normalise_website_url("HTTP://Example.ORG/x#frag") == "http://example.org/x"


@pytest.mark.parametrize(
    "raw",
    [
        pytest.param("javascript:alert(1)", id="javascript_scheme"),
        pytest.param("data:text/html;base64,PHN2Zz4=", id="data_scheme"),
        pytest.param("//example.org/x", id="scheme_relative_empty_scheme"),
        pytest.param("ftp://example.org/x", id="ftp_scheme"),
        pytest.param("https://example.org@evil.com/x", id="userinfo"),
        pytest.param("https://example.org:8443/x", id="explicit_port"),
        pytest.param("https://éxample.org/x", id="homograph_latin_accent"),
        pytest.param("http://127.0.0.1:5000/admin", id="ssrf_loopback_ip"),
        pytest.param("http://localhost/x", id="ssrf_localhost"),
        pytest.param("http://10.0.0.1/x", id="ssrf_private_range"),
        pytest.param("http://169.254.169.254/x", id="ssrf_link_local_metadata"),
        pytest.param("https://example.org/" + "x" * 300, id="over_length"),
        pytest.param("", id="empty_string"),
        pytest.param(None, id="none_value"),
    ],
)
def test_website_keeps_every_control_except_the_host_allowlist(raw):
    assert normalise_website_url(raw) is None


def test_website_stores_the_re_serialised_value():
    assert normalise_website_url("https://exa\tmple.org/x") == "https://example.org/x"


# --------------------------------------------------------------------------- #
# The constants the schema and the seven-row editor both read
# --------------------------------------------------------------------------- #


def test_website_is_never_a_platform():
    """P-08. A generic entry would defeat the host allowlist by definition and
    would force ROADMAP Phase 4 criterion 2 to carry a carve-out."""
    assert "website" not in SOCIAL_PLATFORMS
    assert "website" not in SOCIAL_PLATFORM_KEYS


def test_social_field_order_is_fixed_and_stable():
    """The seven-row editor maps each platform to the same row every time, and
    the order is declared once — here — so the client cannot drift from it."""
    assert SOCIAL_FIELD_ORDER == (
        "website", "instagram", "linkedin", "x", "youtube", "facebook", "github",
    )
    assert SOCIAL_PLATFORM_KEYS == SOCIAL_FIELD_ORDER[1:]


def test_every_platform_maps_to_a_non_empty_host_tuple():
    for platform, hosts in SOCIAL_PLATFORMS.items():
        assert isinstance(hosts, tuple) and hosts, platform
        assert all(host and not host.startswith(".") for host in hosts), platform
