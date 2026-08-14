"""Phase 4 tests: organisation profile and brand kit.

Covers: ORG-01 — a Secretary, Deputy Secretary, Regional Coordinator or
Coordinator edits the profile of the one organisation they hold authority over.
Covers: ORG-02 — the replace-all social-links endpoint, the read-side filter and
the withheld-link contract. The bypass vectors themselves live in
test_url_safety.py; what is asserted here is that the API refuses them with an
error the editor can place on a row, and that a hostile row already in the table
never reaches the response.

The spine under test is `can_manage_org_required`, which had zero route call
sites before this phase. Every assertion here about who may edit what is
therefore also an assertion about that decorator's first real consumer, so the
denial cases matter at least as much as the happy path.

Fixture conventions follow conftest.py: users looked up by email, organisations
by type, headers from the `_token` helper.
"""
import io
import json
import re
import sys
from contextlib import contextmanager
from types import ModuleType, SimpleNamespace

import pytest

from app.config import Config
from app.constants import (
    BRAND_KIT_AI_DRAFT,
    BRAND_KIT_DEFAULT_VOICE,
    BRAND_KIT_MANUAL,
    UPLOAD_URL_PATTERN,
    UPLOAD_URL_PREFIX,
)
from app.controllers.upload_controller import sniff_image_ext, upload_dir
from app.extensions import db
from app.rbac import _DENIAL_MESSAGES
from app.models import AuditLog, BrandKit, OrganisationSocialLink
from app.services import org_profile_service

from .conftest import council_org, house_org, other_org, region_org

PROFILE_URL = "/api/v1/orgs/{org_id}/profile"
SOCIAL_URL = "/api/v1/orgs/{org_id}/social-links"
LOGO_URL = "/api/v1/orgs/{org_id}/logo"
BRAND_KIT_URL = "/api/v1/orgs/{org_id}/brand-kit"
DRAFT_URL = "/api/v1/orgs/{org_id}/brand-kit/draft"

# Real leading bytes for each accepted format, padded to something a file system
# will happily hold. Only the signature matters — nothing downstream decodes the
# image — but the signatures themselves are verbatim, because a "close enough"
# magic number would make every sniff assertion below vacuous.
PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64
JPEG_BYTES = b"\xff\xd8\xff\xe0" + b"\x00" * 64
WEBP_BYTES = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP" + b"\x00" * 64
SVG_BYTES = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'


def _profile(org):
    return PROFILE_URL.format(org_id=org.id)


def _social(org):
    return SOCIAL_URL.format(org_id=org.id)


def _logo(org):
    return LOGO_URL.format(org_id=org.id)


def _brand_kit(org):
    return BRAND_KIT_URL.format(org_id=org.id)


def _draft(org):
    return DRAFT_URL.format(org_id=org.id)


def _save_kit(client, org, headers, **overrides):
    """PUT a complete, valid kit, with individual fields overridden per case.

    A whole-body helper rather than per-field ones because the endpoint is a
    replace-all: a partial body is a different assertion, not a shorter one."""
    body = {
        "voice_tone": "Warm, direct, never corporate.",
        "palette": ["#5CE6C9", "#FFCF96"],
        "sample_phrases": ["See you in the city.", "One community, many cities."],
    }
    body.update(overrides)
    return client.put(_brand_kit(org), json=body, headers=headers)


def _stored_file(logo_url):
    """The file on disk a served `logo_url` points at."""
    return upload_dir() / logo_url[len(UPLOAD_URL_PREFIX):]


def _upload(client, org, content, filename="logo.png", content_type=None, headers=None):
    """POST one part named `file`, the way the browser's FormData will."""
    part = (io.BytesIO(content), filename)
    if content_type is not None:
        part = (io.BytesIO(content), filename, content_type)
    return client.post(
        _logo(org),
        data={"file": part},
        content_type="multipart/form-data",
        headers=headers or {},
    )


_BOUNDARY = "ekatvalogoboundary"
_MULTIPART = f"multipart/form-data; boundary={_BOUNDARY}"


def _multipart_of_exactly(total):
    """A genuine multipart body whose TOTAL length is exactly `total` bytes.

    The cap applies to the request body, not to the file inside it, so the
    boundary cases can only be built by counting the envelope as well — a
    2 MiB file always arrives as a slightly larger body and would prove nothing
    about the cap's exact edge.
    """
    prefix = (
        f"--{_BOUNDARY}\r\n"
        'Content-Disposition: form-data; name="file"; filename="logo.png"\r\n'
        "Content-Type: image/png\r\n\r\n"
    ).encode()
    suffix = f"\r\n--{_BOUNDARY}--\r\n".encode()
    magic = PNG_BYTES[:8]
    padding = total - len(prefix) - len(suffix) - len(magic)
    assert padding >= 0, "asked for a body smaller than its own envelope"
    body = prefix + magic + b"\x00" * padding + suffix
    assert len(body) == total
    return body


@pytest.fixture(autouse=True)
def swept_upload_dir(app):
    """`instance/uploads/` is real, gitignored disk shared by every run.

    Unlike the in-memory database, nothing tears it down between tests, so a
    test that uploads a logo would otherwise leave the file there for the next
    developer and for CI. Snapshot, then remove exactly what this test added —
    never the whole directory, which would delete a real developer's uploads.
    """
    before = set(upload_dir().iterdir())
    yield
    for path in set(upload_dir().iterdir()) - before:
        path.unlink(missing_ok=True)


# --------------------------------------------------------------------------- #
# The proven slice: one Secretary, one organisation, one field
# --------------------------------------------------------------------------- #


def test_edit_own_house_bio_round_trip(client, app, house_secretary_headers):
    """ORG-01 end to end: PATCH writes the bio and GET reads it back."""
    house = house_org()
    bio = "Nilgiri House runs monthly city meetups across the south."

    res = client.patch(
        _profile(house), json={"bio": bio}, headers=house_secretary_headers
    )
    assert res.status_code == 200, res.get_json()
    assert res.get_json()["bio"] == bio

    read = client.get(_profile(house), headers=house_secretary_headers)
    assert read.status_code == 200
    assert read.get_json()["bio"] == bio


def test_bio_length_over_1000_is_rejected(client, app, house_secretary_headers):
    """UI-SPEC contract addition 3 — organisations.bio is an unbounded db.Text,
    so a client-side counter over a server with no cap is a promise the server
    does not keep (T-04-04)."""
    house = house_org()

    ok = client.patch(
        _profile(house), json={"bio": "x" * 1000}, headers=house_secretary_headers
    )
    assert ok.status_code == 200

    too_long = client.patch(
        _profile(house), json={"bio": "x" * 1001}, headers=house_secretary_headers
    )
    assert too_long.status_code == 422
    assert too_long.get_json()["code"] == "validation_error"


def test_unknown_org_404(client, app, house_secretary_headers, admin_headers):
    """A nonexistent organisation is 404, never 403 and never 500.

    The url_map assertion is what keeps this test honest: without it, an
    unregistered blueprint would satisfy every 404 below for entirely the wrong
    reason. It also pins the parameter spelling — `org_scoped` reads
    kwargs.get("org_id"), and any other spelling silently 404s every caller
    including admins while the RBAC suite stays green (T-04-02).
    """
    assert PROFILE_URL.replace("{org_id}", "<org_id>") in {
        rule.rule for rule in app.url_map.iter_rules()
    }

    missing = PROFILE_URL.format(org_id="no-such-org-id")

    patched = client.patch(missing, json={"bio": "hi"}, headers=admin_headers)
    assert patched.status_code == 404
    assert patched.get_json()["code"] == "not_found"

    read = client.get(missing, headers=house_secretary_headers)
    assert read.status_code == 404
    assert read.get_json()["code"] == "not_found"


def test_edit_own_house_writes_exactly_one_audit_row(
    client, app, house_secretary_headers
):
    """T-04-05 — a profile mutation is attributable, and only once per PATCH."""
    house = house_org()
    before = AuditLog.query.count()

    res = client.patch(
        _profile(house), json={"bio": "One row, one change."},
        headers=house_secretary_headers,
    )
    assert res.status_code == 200
    assert AuditLog.query.count() == before + 1

    entry = AuditLog.query.order_by(AuditLog.created_at.desc()).first()
    assert entry.entity == "organisation"
    assert entry.entity_id == house.id


# --------------------------------------------------------------------------- #
# All four organisation types, one code path (ROADMAP Phase 4 criterion 1)
# --------------------------------------------------------------------------- #


def test_society_deputy_edits_own_society(client, app, society_deputy_headers):
    """AUTH-03's Society Deputy Secretary is in ORG_MANAGER_PORS, so the society
    is editable by its deputy and not only by its secretary."""
    society = other_org()

    res = client.patch(
        _profile(society), json={"bio": "We shoot the campus."},
        headers=society_deputy_headers,
    )
    assert res.status_code == 200, res.get_json()
    assert res.get_json()["bio"] == "We shoot the campus."
    assert res.get_json()["type"] == "society"


def test_rc_edits_region_profile(client, app, rc_headers):
    """A Regional Coordinator manages the region organisation itself, not merely
    the events inside it."""
    region = region_org()

    res = client.patch(
        _profile(region), json={"bio": "Meetups across Telangana."}, headers=rc_headers
    )
    assert res.status_code == 200, res.get_json()
    assert res.get_json()["bio"] == "Meetups across Telangana."
    assert res.get_json()["type"] == "region"


def test_coordinator_edits_council_profile(client, app, council_coordinator_headers):
    """The fourth type. `Coordinator` is already in ORG_MANAGER_PORS and is not
    house-scoped, so the council needs no POR constant of its own."""
    council = council_org()

    res = client.patch(
        _profile(council), json={"bio": "The elected student body."},
        headers=council_coordinator_headers,
    )
    assert res.status_code == 200, res.get_json()
    assert res.get_json()["bio"] == "The elected student body."
    assert res.get_json()["type"] == "council"


def test_all_four_org_types_are_reachable_through_one_path(client, app, admin_headers):
    """The criterion stated directly: house, society, region and council all
    round-trip through the same endpoint, with no per-type branch anywhere."""
    orgs = [house_org(), other_org(), region_org(), council_org()]
    assert sorted(o.type for o in orgs) == ["council", "house", "region", "society"]

    for org in orgs:
        text = f"Profile for a {org.type}."
        patched = client.patch(_profile(org), json={"bio": text}, headers=admin_headers)
        assert patched.status_code == 200, (org.type, patched.get_json())

        read = client.get(_profile(org), headers=admin_headers)
        assert read.get_json()["bio"] == text, org.type


# --------------------------------------------------------------------------- #
# The denial matrix — the reason can_manage_org_required exists at all
# --------------------------------------------------------------------------- #


def test_cross_org_403_not_404_and_not_500(client, app, house_secretary_headers):
    """T-04-01, and criterion 1's discriminator.

    A Secretary of org A naming org B's id gets 403, not 404: org B plainly
    exists, so the guard's not-found branch never runs and the denial is an
    authorization answer rather than a coincidence. And not 500 either —
    can_manage_org is a total function, so the question always has an answer.
    """
    society = other_org()
    before = society.bio

    res = client.patch(
        _profile(society), json={"bio": "Not mine to write."},
        headers=house_secretary_headers,
    )

    assert res.status_code == 403
    body = res.get_json()
    assert body["code"] == "forbidden"
    assert body["error"] == _DENIAL_MESSAGES["can_manage_org"]
    assert other_org().bio == before, "a denied PATCH still wrote"


def test_student_forbidden_without_a_por(client, app, student_headers):
    """A POR-less student holds no authority over any organisation, including
    the region their own account is anchored to."""
    for org in (house_org(), other_org(), region_org(), council_org()):
        res = client.patch(
            _profile(org), json={"bio": "I should not be able to."},
            headers=student_headers,
        )
        assert res.status_code == 403, (org.type, res.get_json())
        assert res.get_json()["code"] == "forbidden"


def test_unauthenticated_patch_is_401(client, app):
    """No token at all is an authentication answer, not an authorization one."""
    res = client.patch(_profile(house_org()), json={"bio": "anon"})
    assert res.status_code == 401


def test_admin_any_org_may_edit(client, app, admin_headers):
    """can_manage_org short-circuits for admins, so governance is not blocked by
    the absence of a POR."""
    for org in (house_org(), other_org(), region_org(), council_org()):
        res = client.patch(
            _profile(org), json={"bio": f"Admin note on the {org.type}."},
            headers=admin_headers,
        )
        assert res.status_code == 200, (org.type, res.get_json())


def test_read_is_open_to_any_signed_in_user(client, app, student_headers,
                                            house_secretary_headers):
    """P-06 — the read payload is identical whether or not the reader may edit
    it, so nothing in it can be rendered as a padlock the caller cannot open."""
    house = house_org()
    client.patch(
        _profile(house), json={"bio": "Open to read."}, headers=house_secretary_headers
    )

    as_student = client.get(_profile(house), headers=student_headers)
    as_secretary = client.get(_profile(house), headers=house_secretary_headers)

    assert as_student.status_code == 200
    assert as_student.get_json() == as_secretary.get_json()


# --------------------------------------------------------------------------- #
# ORG-02 — the replace-all social links endpoint
# --------------------------------------------------------------------------- #


def test_social_links_round_trip(client, app, house_secretary_headers):
    """PUT writes the link and GET reads it back through the filtered payload."""
    house = house_org()

    res = client.put(
        _social(house),
        json={"links": [{"platform": "instagram", "url": "https://instagram.com/kanha"}]},
        headers=house_secretary_headers,
    )
    assert res.status_code == 200, res.get_json()
    assert res.get_json()["social_links"] == [
        {
            "id": res.get_json()["social_links"][0]["id"],
            "org_id": house.id,
            "platform": "instagram",
            "url": "https://instagram.com/kanha",
        }
    ]

    read = client.get(_profile(house), headers=house_secretary_headers)
    assert [link["url"] for link in read.get_json()["social_links"]] == [
        "https://instagram.com/kanha"
    ]
    assert read.get_json()["withheld_platforms"] == []


def test_replace_existing_platform_keeps_one_row(client, app, house_secretary_headers):
    """The unique constraint on (org, platform) fires unless the delete is
    flushed before the insert — this is the edit case, not the create case."""
    house = house_org()

    first = client.put(
        _social(house),
        json={"links": [{"platform": "instagram", "url": "https://instagram.com/old"}]},
        headers=house_secretary_headers,
    )
    assert first.status_code == 200

    second = client.put(
        _social(house),
        json={"links": [{"platform": "instagram", "url": "https://instagram.com/new"}]},
        headers=house_secretary_headers,
    )
    assert second.status_code == 200, second.get_json()

    links = second.get_json()["social_links"]
    assert len(links) == 1
    assert links[0]["url"] == "https://instagram.com/new"
    assert OrganisationSocialLink.query.filter_by(org_id=house.id).count() == 1


def test_duplicate_platform_is_rejected_before_any_write(
    client, app, house_secretary_headers
):
    """Two rows naming one platform is a user mistake with a sentence, not an
    IntegrityError with a 500."""
    house = house_org()
    before = OrganisationSocialLink.query.filter_by(org_id=house.id).count()

    res = client.put(
        _social(house),
        json={
            "links": [
                {"platform": "instagram", "url": "https://instagram.com/one"},
                {"platform": "instagram", "url": "https://instagram.com/two"},
            ]
        },
        headers=house_secretary_headers,
    )

    assert res.status_code == 400, res.get_json()
    assert res.get_json()["code"] == "duplicate_platform"
    assert res.get_json()["details"] == {"platform": "instagram"}
    assert OrganisationSocialLink.query.filter_by(org_id=house.id).count() == before


def test_scheme_rejected_with_placeable_details(client, app, house_secretary_headers):
    """`details` must be a NON-EMPTY dict: errors.envelope() drops a falsy one,
    and the editor cannot mark the offending row without it."""
    house = house_org()

    res = client.put(
        _social(house),
        json={"links": [{"platform": "instagram", "url": "javascript:alert(1)"}]},
        headers=house_secretary_headers,
    )

    assert res.status_code == 400, res.get_json()
    assert res.get_json()["code"] == "social_url_scheme"
    assert res.get_json()["details"] == {"platform": "instagram"}
    assert OrganisationSocialLink.query.filter_by(org_id=house.id).count() == 0


def test_host_rejected_with_placeable_details(client, app, house_secretary_headers):
    """A well-formed URL pointing somewhere else is a distinct correction from a
    malformed one, so it carries its own code and its own heading."""
    house = house_org()

    res = client.put(
        _social(house),
        json={"links": [{"platform": "instagram", "url": "https://evil.com/x"}]},
        headers=house_secretary_headers,
    )

    assert res.status_code == 400, res.get_json()
    assert res.get_json()["code"] == "social_url_host"
    assert res.get_json()["details"] == {"platform": "instagram"}
    assert OrganisationSocialLink.query.filter_by(org_id=house.id).count() == 0


def test_website_rejection_names_the_field_not_a_platform(
    client, app, house_secretary_headers
):
    """The website field is not a platform (P-08), so its rejection is placed by
    field name instead."""
    house = house_org()

    scheme = client.put(
        _social(house),
        json={"website": "javascript:alert(1)"},
        headers=house_secretary_headers,
    )
    assert scheme.status_code == 400, scheme.get_json()
    assert scheme.get_json()["code"] == "social_url_scheme"
    assert scheme.get_json()["details"] == {"field": "website"}

    # The link-local metadata address: nothing fetches a stored URL today, so
    # this is closed at save time rather than when something eventually does.
    ssrf = client.put(
        _social(house),
        json={"website": "http://169.254.169.254/x"},
        headers=house_secretary_headers,
    )
    assert ssrf.status_code == 400, ssrf.get_json()
    assert ssrf.get_json()["code"] == "social_url_host"
    assert ssrf.get_json()["details"] == {"field": "website"}

    assert house_org().website is None


def test_website_round_trip(client, app, house_secretary_headers):
    """A host no platform allowlist would accept is exactly the point of D-03."""
    house = house_org()

    res = client.put(
        _social(house),
        json={"website": "HTTPS://Kanha.example.org/home#top"},
        headers=house_secretary_headers,
    )

    assert res.status_code == 200, res.get_json()
    assert res.get_json()["website"] == "https://kanha.example.org/home"

    read = client.get(_profile(house), headers=house_secretary_headers)
    assert read.get_json()["website"] == "https://kanha.example.org/home"


def test_stores_normalised_url_never_the_raw_input(
    client, app, house_secretary_headers
):
    """urlsplit strips tab, CR and LF before parsing, so storing the raw string
    would persist something other than the string that was validated."""
    house = house_org()

    res = client.put(
        _social(house),
        json={"links": [{"platform": "instagram", "url": "https://insta\tgram.com/x"}]},
        headers=house_secretary_headers,
    )
    assert res.status_code == 200, res.get_json()

    read = client.get(_profile(house), headers=house_secretary_headers)
    assert read.get_json()["social_links"][0]["url"] == "https://instagram.com/x"

    stored = OrganisationSocialLink.query.filter_by(org_id=house.id).first()
    assert stored.url == "https://instagram.com/x"
    assert "\t" not in stored.url


def test_empty_payload_is_a_valid_saved_state(client, app, house_secretary_headers):
    """No bio, no links. An organisation that has not filled anything in is a
    truthful state, not a validation failure."""
    house = house_org()

    res = client.put(_social(house), json={}, headers=house_secretary_headers)
    assert res.status_code == 200, res.get_json()

    read = client.get(_profile(house), headers=house_secretary_headers)
    body = read.get_json()
    assert body["social_links"] == []
    assert body["withheld_platforms"] == []
    assert "error" not in body


def test_hostile_row_never_rendered(client, app, house_secretary_headers):
    """ROADMAP Phase 4 criterion 2's SECOND clause.

    The row here bypasses the API entirely, which is the whole point: rows can
    pre-date this phase, arrive from a direct database edit or seed data, or come
    from a future bug. Without the read-side filter, "never rendered anywhere" is
    a claim about the write path rather than a property of the system.
    """
    house = house_org()
    db.session.add(
        OrganisationSocialLink(
            org_id=house.id, platform="instagram", url="javascript:alert(1)"
        )
    )
    db.session.commit()

    read = client.get(_profile(house), headers=house_secretary_headers)
    body = read.get_json()

    assert read.status_code == 200
    assert [link["platform"] for link in body["social_links"]] == []
    assert "instagram" in body["withheld_platforms"]
    # P-05a: the key is already public, the URL is precisely the string that
    # failed the check and must not reach the DOM at all.
    assert "javascript" not in json.dumps(body)
    assert "alert" not in json.dumps(body)


def test_social_links_come_back_in_the_declared_order(
    client, app, house_secretary_headers
):
    """The seven-row editor maps each platform to the same row every time, so the
    server orders the collection rather than leaving it to insertion order."""
    house = house_org()

    res = client.put(
        _social(house),
        json={
            "links": [
                {"platform": "github", "url": "https://github.com/ekatva"},
                {"platform": "instagram", "url": "https://instagram.com/ekatva"},
                {"platform": "linkedin", "url": "https://linkedin.com/company/ekatva"},
            ]
        },
        headers=house_secretary_headers,
    )

    assert res.status_code == 200, res.get_json()
    assert [link["platform"] for link in res.get_json()["social_links"]] == [
        "instagram",
        "linkedin",
        "github",
    ]


def test_social_links_write_is_org_scoped(client, app, house_secretary_headers,
                                          student_headers):
    """The new route sits behind the same guard as the profile PATCH."""
    society = other_org()

    cross_org = client.put(
        _social(society),
        json={"links": [{"platform": "instagram", "url": "https://instagram.com/x"}]},
        headers=house_secretary_headers,
    )
    assert cross_org.status_code == 403
    assert cross_org.get_json()["code"] == "forbidden"

    por_less = client.put(
        _social(house_org()),
        json={"links": []},
        headers=student_headers,
    )
    assert por_less.status_code == 403

    anonymous = client.put(_social(house_org()), json={"links": []})
    assert anonymous.status_code == 401


def test_social_links_write_records_one_audit_row(
    client, app, house_secretary_headers
):
    """A replace-all is a mutation and is attributable, once."""
    house = house_org()
    before = AuditLog.query.count()

    res = client.put(
        _social(house),
        json={"links": [{"platform": "x", "url": "https://x.com/ekatva"}]},
        headers=house_secretary_headers,
    )

    assert res.status_code == 200, res.get_json()
    assert AuditLog.query.count() == before + 1


# --------------------------------------------------------------------------- #
# ORG-01, D-01 — the upload primitive: serve half
# --------------------------------------------------------------------------- #


def test_uploads_public_no_traversal(client, app):
    """The serve route answers without credentials, carries `nosniff`, and
    refuses to walk out of the upload directory.

    Unauthenticated is the requirement, not an oversight: the SPA is on another
    origin, so a plain `<img>` for a logo sends neither the in-memory bearer
    token nor a cookie. A guarded logo URL is a broken image everywhere.

    Traversal is handled by `send_from_directory`, so the percent-encoded form
    matters as much as the plain one — a hand-rolled `..` check typically stops
    the first and waves the second through.
    """
    stored = upload_dir() / "aserved0000000000000000000000fed.png"
    stored.write_bytes(PNG_BYTES)

    # Closed explicitly: send_from_directory streams from an open handle, and on
    # Windows an unclosed one makes the file undeletable for the sweeper above.
    with client.get(f"{UPLOAD_URL_PREFIX}{stored.name}") as res:
        assert res.status_code == 200, "the logo route must not require a token"
        assert "Authorization" not in res.request.headers
        assert res.headers["X-Content-Type-Options"] == "nosniff"
        assert res.data == PNG_BYTES

    for attempt in (
        "../../ekatva.db",
        "%2e%2e%2f%2e%2e%2fekatva.db",
        "..%2f..%2fekatva.db",
        "..%5c..%5cekatva.db",          # the Windows separator this repo develops on
    ):
        escaped = client.get(f"{UPLOAD_URL_PREFIX}{attempt}")
        assert escaped.status_code != 200, attempt


def test_sniff_accepts_three_formats_and_refuses_everything_else():
    """T-04-17 and T-04-18 asserted on the helper itself, with no HTTP in the
    way. SVG is the row that matters: it is refused because an SVG is an XML
    document that can carry a script element, not because we lack a decoder."""
    assert sniff_image_ext(PNG_BYTES) == ".png"
    assert sniff_image_ext(JPEG_BYTES) == ".jpg"
    assert sniff_image_ext(WEBP_BYTES) == ".webp"

    assert sniff_image_ext(SVG_BYTES) is None
    assert sniff_image_ext(b"GIF89a" + b"\x00" * 16) is None
    assert sniff_image_ext(b"<!DOCTYPE html><script>alert(1)</script>") is None
    assert sniff_image_ext(b"%PDF-1.7") is None
    assert sniff_image_ext(b"") is None
    # RIFF alone is a WAV or an AVI. Only `WEBP` at offset 8 makes it an image.
    assert sniff_image_ext(b"RIFF\x00\x00\x00\x00WAVE" + b"\x00" * 16) is None


def test_upload_size_cap_is_two_mib_and_not_overridden_in_tests():
    """The cap is enforced by Flask before the body is buffered, so the value
    itself is the control. TestConfig must not soften it, or the boundary test
    below would be proving something about a test-only number."""
    assert Config.MAX_CONTENT_LENGTH == 2 * 1024 * 1024


# --------------------------------------------------------------------------- #
# ORG-01, D-01 — the upload primitive: write half
# --------------------------------------------------------------------------- #


def test_logo_upload_png(client, app, house_secretary_headers):
    """The happy path, end to end: the row points at a served path, the bytes
    are on disk, and the public route hands them back.

    The client's filename is deliberately `Ekatva Logo (final) v2.PNG` — a name
    with spaces, brackets and the wrong case. None of it may survive into the
    stored path, because the only filename that cannot be attacked is one the
    client never supplied.
    """
    house = house_org()

    res = _upload(
        client, house, PNG_BYTES,
        filename="Ekatva Logo (final) v2.PNG",
        headers=house_secretary_headers,
    )

    assert res.status_code == 200, res.get_json()
    logo_url = res.get_json()["logo_url"]
    assert re.match(UPLOAD_URL_PATTERN, logo_url), logo_url
    assert "Ekatva" not in logo_url and "final" not in logo_url

    assert _stored_file(logo_url).read_bytes() == PNG_BYTES
    assert house_org().logo_url == logo_url

    with client.get(logo_url) as served:
        assert served.status_code == 200
        assert served.headers["X-Content-Type-Options"] == "nosniff"


def test_logo_upload_accepts_jpeg_and_webp(client, app, house_secretary_headers):
    """The other two allowlisted formats, and the extension each one lands on.

    The WebP case is the one worth having: `RIFF` at offset 0 is shared with WAV
    and AVI, so a prefix-only table would either refuse a real WebP or accept an
    audio file.
    """
    for content, expected_ext in ((JPEG_BYTES, ".jpg"), (WEBP_BYTES, ".webp")):
        res = _upload(
            client, house_org(), content,
            filename="logo.png",          # wrong on purpose — the bytes decide
            headers=house_secretary_headers,
        )
        assert res.status_code == 200, res.get_json()
        assert res.get_json()["logo_url"].endswith(expected_ext)


def test_logo_rejects_svg(client, app, house_secretary_headers):
    """T-04-17. An SVG is an XML document that can carry a script element, and
    serving one from the API origin is stored XSS — so it is refused at the door
    rather than sanitised, and nothing is written."""
    house = house_org()
    before = set(upload_dir().iterdir())

    res = _upload(
        client, house, SVG_BYTES,
        filename="logo.svg", content_type="image/svg+xml",
        headers=house_secretary_headers,
    )

    assert res.status_code == 400, res.get_json()
    assert res.get_json()["code"] == "invalid_image"
    assert set(upload_dir().iterdir()) == before
    assert house_org().logo_url is None


def test_logo_sniffs_content(client, app, house_secretary_headers):
    """T-04-18 — the decision is made by the bytes, not by the label.

    This payload is named `logo.png` AND declares `Content-Type: image/png`.
    Both are free for an attacker to set, so a server that trusts either one has
    no format allowlist at all — it has a naming convention.
    """
    house = house_org()
    before = set(upload_dir().iterdir())

    res = _upload(
        client, house, b"MZ\x90\x00 this is a windows executable, not an image",
        filename="logo.png", content_type="image/png",
        headers=house_secretary_headers,
    )

    assert res.status_code == 400, res.get_json()
    assert res.get_json()["code"] == "invalid_image"
    assert set(upload_dir().iterdir()) == before, "a refused file was written anyway"
    assert house_org().logo_url is None


def test_logo_too_large(client, app, house_secretary_headers):
    """T-04-21, asserted at the exact edge and one byte past it.

    The over-size body is refused by Flask before it is buffered, so the view
    never runs: no file appears and the row still points at the file the
    at-the-cap upload stored. The pair matters — a cap that also refused a body
    exactly at the limit would be off by one and nothing else here would notice.
    """
    house = house_org()
    cap = app.config["MAX_CONTENT_LENGTH"]

    at_the_cap = client.post(
        _logo(house), data=_multipart_of_exactly(cap),
        content_type=_MULTIPART, headers=house_secretary_headers,
    )
    assert at_the_cap.status_code == 200, at_the_cap.status_code
    accepted_url = at_the_cap.get_json()["logo_url"]
    after_the_cap = set(upload_dir().iterdir())

    over = client.post(
        _logo(house), data=_multipart_of_exactly(cap + 1),
        content_type=_MULTIPART, headers=house_secretary_headers,
    )

    assert over.status_code == 413
    assert set(upload_dir().iterdir()) == after_the_cap, "the view ran anyway"
    assert house_org().logo_url == accepted_url


def test_logo_replace_removes_the_previous_file(client, app, house_secretary_headers):
    """T-04-22. The old file is unlinked only AFTER the commit that stopped
    pointing at it — delete-first would orphan the row's image if the write
    rolled back. Asserted as a before/after pair, so a test that passed because
    the first file was never written would fail."""
    house = house_org()

    first = _upload(client, house, PNG_BYTES, headers=house_secretary_headers)
    assert first.status_code == 200, first.get_json()
    first_file = _stored_file(first.get_json()["logo_url"])
    assert first_file.exists()

    second = _upload(client, house_org(), JPEG_BYTES, headers=house_secretary_headers)
    assert second.status_code == 200, second.get_json()

    assert second.get_json()["logo_url"] != first.get_json()["logo_url"]
    assert not first_file.exists(), "the replaced file is still on disk"
    assert _stored_file(second.get_json()["logo_url"]).exists()
    assert house_org().logo_url == second.get_json()["logo_url"]


def test_logo_removed_through_profile_patch(client, app, house_secretary_headers):
    """UI-SPEC S3 — removal is `PATCH /profile` with a null, not a delete route.
    One writer for the column means one audit trail and one authorization
    decision."""
    house = house_org()
    uploaded = _upload(client, house, PNG_BYTES, headers=house_secretary_headers)
    stored = _stored_file(uploaded.get_json()["logo_url"])
    assert stored.exists()

    res = client.patch(
        _profile(house_org()), json={"logo_url": None}, headers=house_secretary_headers
    )

    assert res.status_code == 200, res.get_json()
    assert res.get_json()["logo_url"] is None
    assert house_org().logo_url is None
    assert not stored.exists(), "clearing the column left the file behind"


def test_logo_patch_leaves_the_logo_alone_when_the_key_is_absent(
    client, app, house_secretary_headers
):
    """The partial-PATCH rule the profile service already follows: a client
    editing only the bio must not silently erase a logo it never mentioned."""
    house = house_org()
    uploaded = _upload(client, house, PNG_BYTES, headers=house_secretary_headers)
    logo_url = uploaded.get_json()["logo_url"]

    res = client.patch(
        _profile(house_org()), json={"bio": "Only the bio."},
        headers=house_secretary_headers,
    )

    assert res.status_code == 200, res.get_json()
    assert res.get_json()["logo_url"] == logo_url
    assert _stored_file(logo_url).exists()


def test_logo_url_cannot_be_set_to_an_arbitrary_value(
    client, app, house_secretary_headers
):
    """T-04-25 — the upload endpoint is the only legitimate writer of a non-null
    `logo_url`. Accepting a client-supplied string here would reintroduce exactly
    the external-hotlink shape D-01 rejected, and would let a caller point the
    unlink-on-replace path at a file of their choosing."""
    house = house_org()

    for hostile in (
        "https://evil.com/tracker.png",
        "/api/v1/uploads/../../ekatva.db",
        "/api/v1/uploads/notauuid.png",
        "/api/v1/uploads/deadbeefdeadbeefdeadbeefdeadbeef.svg",
        "javascript:alert(1)",
    ):
        res = client.patch(
            _profile(house), json={"logo_url": hostile},
            headers=house_secretary_headers,
        )
        assert res.status_code == 422, (hostile, res.get_json())
        assert res.get_json()["code"] == "validation_error"

    assert house_org().logo_url is None


def test_logo_url_cannot_be_hijacked_from_another_organisation(
    client, app, house_secretary_headers, society_deputy_headers
):
    """CR-01 — a same-shape `logo_url` is not the same as an owned one. Every
    stored path is readable from GET /orgs/<id>/profile, so the schema's shape
    check alone lets a manager name ANOTHER organisation's file, render it as
    their own, then null it out and unlink someone else's logo. Org B's file
    must survive a hostile PATCH against org A untouched."""
    society = other_org()
    uploaded = _upload(client, society, PNG_BYTES, headers=society_deputy_headers)
    assert uploaded.status_code == 200, uploaded.get_json()
    other_logo_url = uploaded.get_json()["logo_url"]
    other_file = _stored_file(other_logo_url)
    assert other_file.exists()

    res = client.patch(
        _profile(house_org()), json={"logo_url": other_logo_url},
        headers=house_secretary_headers,
    )

    assert res.status_code == 400, res.get_json()
    assert res.get_json()["code"] == "invalid_image"
    assert house_org().logo_url is None
    assert other_org().logo_url == other_logo_url
    assert other_file.exists(), "another organisation's logo was deleted"


def test_logo_upload_is_org_scoped(client, app, house_secretary_headers,
                                   student_headers):
    """T-04-24. The upload route is org-scoped like every other write on this
    profile, and its URL parameter is `org_id` — any other spelling would 404
    for everyone while the RBAC suite stayed green."""
    society = other_org()
    before = set(upload_dir().iterdir())

    cross_org = _upload(client, society, PNG_BYTES, headers=house_secretary_headers)
    assert cross_org.status_code == 403, cross_org.get_json()
    assert cross_org.get_json()["code"] == "forbidden"

    por_less = _upload(client, house_org(), PNG_BYTES, headers=student_headers)
    assert por_less.status_code == 403

    anonymous = _upload(client, house_org(), PNG_BYTES)
    assert anonymous.status_code == 401

    assert set(upload_dir().iterdir()) == before
    assert other_org().logo_url is None


def test_logo_upload_without_a_file_part_is_rejected(
    client, app, house_secretary_headers
):
    """A request with no part at all is a client mistake with a sentence, not a
    500 on a None."""
    res = client.post(
        _logo(house_org()), data={}, content_type="multipart/form-data",
        headers=house_secretary_headers,
    )

    assert res.status_code == 400, res.get_json()
    assert res.get_json()["code"] == "invalid_image"


def test_logo_upload_records_one_audit_row(client, app, house_secretary_headers):
    """A logo change is a profile mutation and is attributable, once."""
    before = AuditLog.query.count()

    res = _upload(client, house_org(), PNG_BYTES, headers=house_secretary_headers)

    assert res.status_code == 200, res.get_json()
    assert AuditLog.query.count() == before + 1
    entry = AuditLog.query.order_by(AuditLog.created_at.desc()).first()
    assert entry.entity == "organisation"


# --- ORG-03: the brand kit ---------------------------------------------------
# The brand_kits table has existed since Phase 1; what has never existed is any
# rule about what may go INSIDE its JSON columns. Neither SQLite nor Postgres
# enforces anything there, so every bound asserted below is a service-tier rule
# and is the only thing standing between a typo and a Phase 5 mail template.


def test_brand_kit_roundtrip(client, app, house_secretary_headers):
    """ORG-03. A kit saves and reads back — and the palette reads back
    LOWERCASE. The stored value is what the editor re-renders from, so a colour
    that silently changes case on the next load reads as a lost edit."""
    house = house_org()

    saved = _save_kit(client, house, house_secretary_headers)
    assert saved.status_code == 200, saved.get_json()

    res = client.get(_brand_kit(house_org()), headers=house_secretary_headers)
    assert res.status_code == 200, res.get_json()
    body = res.get_json()
    assert body["has_kit"] is True
    assert body["voice_tone"] == "Warm, direct, never corporate."
    assert body["palette"] == ["#5ce6c9", "#ffcf96"]
    assert body["sample_phrases"] == [
        "See you in the city.",
        "One community, many cities.",
    ]
    assert body["source"] == BRAND_KIT_MANUAL


def test_brand_kit_read_without_a_saved_kit_creates_no_row(
    client, app, house_secretary_headers
):
    """T-04-31. An organisation nobody has written a kit for reads back a
    truthful `has_kit: false` — not a 404 the campaign creator would have to
    branch on, and not a freshly minted empty row. The read writes nothing."""
    before = BrandKit.query.count()

    res = client.get(_brand_kit(house_org()), headers=house_secretary_headers)

    assert res.status_code == 200, res.get_json()
    body = res.get_json()
    assert body["has_kit"] is False
    assert body["voice_tone"] is None
    assert body["palette"] == []
    assert body["sample_phrases"] == []
    assert BrandKit.query.count() == before


def test_brand_kit_upsert_updates_the_one_row(client, app, house_secretary_headers):
    """`brand_kits.org_id` is unique, so a second save must update rather than
    insert — an IntegrityError here would be a 500 on an ordinary second edit."""
    house = house_org()

    first = _save_kit(client, house, house_secretary_headers)
    assert first.status_code == 200, first.get_json()

    second = _save_kit(
        client, house_org(), house_secretary_headers,
        voice_tone="Second pass.", palette=["#050505"],
    )
    assert second.status_code == 200, second.get_json()

    assert BrandKit.query.filter_by(org_id=house_org().id).count() == 1
    body = client.get(
        _brand_kit(house_org()), headers=house_secretary_headers
    ).get_json()
    assert body["voice_tone"] == "Second pass."
    assert body["palette"] == ["#050505"]


@pytest.mark.parametrize(
    "bad", ["red", "#ff", "rgb(1,2,3)", "#5CE6C9G", "#12345", "", "#5ce6c9;color:red"]
)
def test_brand_kit_palette_hex_only(client, app, house_secretary_headers, bad):
    """T-04-26. This is a stored-XSS gate, not a formatting preference: Phase 5
    interpolates these strings into generated mail HTML in a CSS context, so a
    free-text colour is a CSS-context injection. Six hex digits and nothing
    else — no rgb() form, no named colour, no three-digit shorthand."""
    res = _save_kit(client, house_org(), house_secretary_headers, palette=[bad])

    assert res.status_code == 422, (bad, res.get_json())
    assert res.get_json()["code"] == "validation_error"
    assert BrandKit.query.count() == 0


def test_brand_kit_bounds(client, app, house_secretary_headers):
    """T-04-27. A JSON column is unbounded at both database engines, so these
    caps are the only ones that exist. Each is asserted AT the limit as well as
    past it, so the test pins the actual number rather than merely proving that
    some cap exists somewhere."""
    for override in (
        {"palette": ["#000000"] * 7},
        {"sample_phrases": ["Hello."] * 11},
        {"sample_phrases": ["x" * 201]},
        {"voice_tone": "x" * 501},
    ):
        res = _save_kit(client, house_org(), house_secretary_headers, **override)
        assert res.status_code == 422, (list(override), res.get_json())
        assert res.get_json()["code"] == "validation_error"

    assert BrandKit.query.count() == 0

    at_limit = _save_kit(
        client, house_org(), house_secretary_headers,
        voice_tone="x" * 500,
        palette=["#000000"] * 6,
        sample_phrases=["y" * 200] * 10,
    )
    assert at_limit.status_code == 200, at_limit.get_json()


def test_brand_kit_source_enum(client, app, house_secretary_headers):
    """T-04-29. `source` is provenance metadata, never an authorization input —
    a client that lies about it changes nothing that matters. The enum is still
    validated so a Phase 5 reader can rely on the value set, and it is imported
    from constants rather than restated in the schema."""
    bad = _save_kit(
        client, house_org(), house_secretary_headers, source="totally_made_up"
    )
    assert bad.status_code == 422, bad.get_json()
    assert bad.get_json()["code"] == "validation_error"

    ok = _save_kit(
        client, house_org(), house_secretary_headers, source=BRAND_KIT_AI_DRAFT
    )
    assert ok.status_code == 200, ok.get_json()
    body = client.get(
        _brand_kit(house_org()), headers=house_secretary_headers
    ).get_json()
    assert body["source"] == BRAND_KIT_AI_DRAFT


def test_brand_kit_drops_blank_entries(client, app, house_secretary_headers):
    """A row the user cleared in the editor arrives as whitespace, and storing
    it would render as an empty bullet in a Phase 5 template. Dropped, not
    stored — and the surviving phrase is stored stripped."""
    res = _save_kit(
        client, house_org(), house_secretary_headers,
        sample_phrases=["  See you in the city.  ", "   "],
    )

    assert res.status_code == 200, res.get_json()
    body = client.get(
        _brand_kit(house_org()), headers=house_secretary_headers
    ).get_json()
    assert body["sample_phrases"] == ["See you in the city."]


def test_brand_kit_ai_available_flag(client, app, house_secretary_headers):
    """D-04. The flag is computed from server-side config and reported HERE.
    `/auth/me` deliberately does not carry it: that payload is AUTH-02's
    authorization capability contract, and mixing a server feature flag into it
    invites the next config flag onto the auth payload too.

    Both directions are asserted, so this pins the computation rather than
    whatever happens to sit in the developer's environment."""
    app.config["GEMINI_API_KEY"] = None
    unset = client.get(_brand_kit(house_org()), headers=house_secretary_headers)
    assert unset.status_code == 200, unset.get_json()
    assert unset.get_json()["ai_available"] is False

    app.config["GEMINI_API_KEY"] = "a-configured-key"
    configured = client.get(_brand_kit(house_org()), headers=house_secretary_headers)
    assert configured.get_json()["ai_available"] is True


def test_brand_kit_cross_org_is_refused(
    client, app, house_secretary_headers, student_headers
):
    """P-09, T-04-28. A brand kit is an internal working document for one
    organisation's own communications, not part of its public identity, so it is
    guarded on the READ as well as the write — unlike the profile, which any
    signed-in reader may see."""
    society = other_org()

    cross_read = client.get(_brand_kit(society), headers=house_secretary_headers)
    assert cross_read.status_code == 403, cross_read.get_json()
    assert cross_read.get_json()["code"] == "forbidden"

    cross_write = client.put(
        _brand_kit(other_org()),
        json={"voice_tone": "Not mine to write."},
        headers=house_secretary_headers,
    )
    assert cross_write.status_code == 403, cross_write.get_json()
    assert cross_write.get_json()["code"] == "forbidden"

    por_less = client.get(_brand_kit(house_org()), headers=student_headers)
    assert por_less.status_code == 403

    anonymous = client.get(_brand_kit(house_org()))
    assert anonymous.status_code == 401

    assert BrandKit.query.count() == 0


def test_brand_kit_save_records_one_audit_row(client, app, house_secretary_headers):
    """T-04-30. Exactly one row per successful save, in the same transaction."""
    before = AuditLog.query.count()

    res = _save_kit(client, house_org(), house_secretary_headers)

    assert res.status_code == 200, res.get_json()
    assert AuditLog.query.count() == before + 1
    entry = AuditLog.query.order_by(AuditLog.created_at.desc()).first()
    assert entry.entity == "organisation"
    assert entry.action == "Updated organisation brand kit"


# --- ORG-03: brand_kit_for(), the seam Phase 5 consumes ----------------------
# These two issue no HTTP; they need the app fixture only for the ORM. What is
# under test is a Python contract another phase will call in-process, so it is
# asserted as one rather than through a route that does not exist for it.

BRAND_KIT_FOR_KEYS = {
    "org_id",
    "org_name",
    "logo_url",
    "has_kit",
    "voice_tone",
    "palette",
    "sample_phrases",
    "source",
}


def test_brand_kit_for_contract(client, app, house_secretary_headers):
    """The totality guarantee, as a test rather than a convention.

    Phase 5 gets one code path with no absence branch: an organisation nobody
    wrote a kit for still yields usable neutral defaults, which is what makes
    ROADMAP Phase 5 criterion 2 — a draft is producible for any organisation —
    reachable. `has_kit` is how a caller tells "they chose these words" from
    "nobody has written one yet".

    The key set is asserted explicitly so a later phase cannot silently drop
    one and leave a template rendering an empty string.
    """
    house = house_org()

    empty = org_profile_service.brand_kit_for(house)
    assert empty is not None
    assert isinstance(empty, dict)
    assert set(empty) == BRAND_KIT_FOR_KEYS
    assert empty["has_kit"] is False
    assert empty["voice_tone"] == BRAND_KIT_DEFAULT_VOICE
    assert empty["voice_tone"], "the default must be usable, not an empty string"
    assert empty["palette"] == []
    assert empty["sample_phrases"] == []
    assert empty["source"] == BRAND_KIT_MANUAL
    assert empty["org_id"] == house.id
    assert empty["org_name"] == house.name

    saved = _save_kit(client, house_org(), house_secretary_headers)
    assert saved.status_code == 200, saved.get_json()

    filled = org_profile_service.brand_kit_for(house_org())
    assert set(filled) == BRAND_KIT_FOR_KEYS
    assert filled["has_kit"] is True
    assert filled["voice_tone"] == "Warm, direct, never corporate."
    assert filled["palette"] == ["#5ce6c9", "#ffcf96"]
    assert filled["sample_phrases"] == [
        "See you in the city.",
        "One community, many cities.",
    ]
    assert filled["source"] == BRAND_KIT_MANUAL

    # A row that EXISTS with null columns is the case a `has_kit` check alone
    # would miss — every field coalesces individually, so no None reaches a
    # Phase 5 template.
    society = other_org()
    db.session.add(
        BrandKit(
            org_id=society.id, voice_tone=None, palette=None, sample_phrases=None
        )
    )
    db.session.commit()

    null_columns = org_profile_service.brand_kit_for(other_org())
    assert null_columns["has_kit"] is True
    assert null_columns["voice_tone"] == BRAND_KIT_DEFAULT_VOICE
    assert null_columns["palette"] == []
    assert null_columns["sample_phrases"] == []
    assert null_columns["source"] == BRAND_KIT_MANUAL


def test_brand_kit_for_carries_logo(client, app):
    """CAMPAIGN-02 calls this once per accepted collaborator and needs every one
    of their logos. Fetching those separately would guarantee a second,
    divergent accessor for the same thing, so the logo rides along."""
    stored = UPLOAD_URL_PREFIX + "a" * 32 + ".png"
    house = house_org()
    house.logo_url = stored
    db.session.commit()

    assert org_profile_service.brand_kit_for(house_org())["logo_url"] == stored


# --- ORG-04: the AI draft ----------------------------------------------------
# ROADMAP Phase 4 criterion 4 is "nothing applies until they explicitly save
# it", and these tests assert it with ROW COUNTS rather than with a response
# body. A body assertion passes just as happily against a service that quietly
# upserted on its way to returning the right JSON, which is the one regression
# the criterion actually needs catching — a reviewer cannot see it, because the
# UI looks exactly right either way.
#
# Nothing here reaches the provider. The whole battery runs with no key and with
# the SDK uninstalled, which is the state of every machine on this team and of
# every grading run.

# A well-formed model reply. The palette arrives in upper case on purpose: the
# draft normalises it the same way a save does, so the values the editor shows
# are the values a save would store.
GOOD_DRAFT = json.dumps(
    {
        "voice_tone": "Warm, plainspoken, never corporate.",
        "palette": ["#5CE6C9", "#FFCF96", "#050505"],
        "sample_phrases": ["See you in the city.", "One community, many cities."],
    }
)

# The reply that must be refused. A palette entry is interpolated into a CSS
# context by Phase 5's mail template, so this is the AI path meeting the same
# hex regex a human typo meets — the proof that there is ONE validator and not a
# looser second one on the side that needs it most.
HOSTILE_DRAFT = json.dumps(
    {
        "voice_tone": "Fine.",
        "palette": ["<script>alert(1)</script>"],
        "sample_phrases": ["Hello."],
    }
)


@contextmanager
def _fake_sdk(reply=None, error=None):
    """Stand a fake `google.genai` in `sys.modules` for the duration of a test.

    Injected rather than `mock.patch`ed onto the real package, because the real
    package is genuinely absent on most machines here: patching an attribute of
    something that cannot be imported fails before it can patch anything, and a
    battery that only runs where the SDK happens to be installed is a battery
    that is green for nobody. The service imports the SDK lazily inside the
    function, so by the time the import runs this fake is what it finds.

    Yields the list of calls the service made, so a test can assert on what was
    sent as well as on what came back.
    """
    calls = []

    class _Models:
        def __init__(self, api_key):
            self._api_key = api_key

        def generate_content(self, model, contents, config):
            calls.append(
                {"api_key": self._api_key, "model": model,
                 "contents": contents, "config": config}
            )
            if error is not None:
                raise error
            return SimpleNamespace(text=reply)

    class _Client:
        def __init__(self, api_key=None, **kwargs):
            self.models = _Models(api_key)

    fake_genai = ModuleType("google.genai")
    fake_genai.Client = _Client
    fake_types = ModuleType("google.genai.types")
    fake_types.GenerateContentConfig = lambda **kwargs: SimpleNamespace(**kwargs)
    fake_genai.types = fake_types
    fake_google = ModuleType("google")
    fake_google.genai = fake_genai

    # The real package may or may not be loaded. Set it aside either way and put
    # it back afterwards, so one test cannot leave a stub behind for the next.
    saved = {
        name: module for name, module in sys.modules.items()
        if name == "google" or name.startswith("google.")
    }
    for name in saved:
        del sys.modules[name]
    sys.modules["google"] = fake_google
    sys.modules["google.genai"] = fake_genai
    sys.modules["google.genai.types"] = fake_types
    try:
        yield calls
    finally:
        for name in ("google", "google.genai", "google.genai.types"):
            sys.modules.pop(name, None)
        sys.modules.update(saved)


def test_draft_persists_nothing(client, app, house_secretary_headers):
    """ROADMAP Phase 4 criterion 4, asserted as the absence of writes.

    Both counts and the backref, on BOTH outcomes: this is not a test about
    what the endpoint returns, it is a test that the endpoint returns it without
    having stored anything. Accepting either 200 or 503 is deliberate — the
    no-write guarantee has to hold whether or not a key happens to be
    configured, and pinning the status here would quietly turn it into a test of
    the developer's environment.
    """
    house = house_org()
    kits_before = BrandKit.query.count()
    audit_before = AuditLog.query.count()

    app.config["GEMINI_API_KEY"] = None
    unconfigured = client.post(_draft(house), headers=house_secretary_headers)

    app.config["GEMINI_API_KEY"] = "a-configured-key"
    with _fake_sdk(reply=GOOD_DRAFT):
        drafted = client.post(_draft(house_org()), headers=house_secretary_headers)

    for res in (unconfigured, drafted):
        assert res.status_code in (200, 503), res.get_json()

    assert BrandKit.query.count() == kits_before, "the draft wrote a brand kit"
    assert AuditLog.query.count() == audit_before, "the draft wrote an audit row"
    assert house_org().brand_kit is None


def test_ai_unconfigured_503(client, app, house_secretary_headers):
    """The default state of every machine in this project, so it is the path
    built first and tested hardest.

    503 and not 500: the unhandled-exception handler is precisely the outcome
    the draft service exists to prevent, and a 500 gives the UI nothing to
    branch on. The message is a literal authored in the service, so it names
    neither the vendor nor the variable the key lives in.
    """
    app.config["GEMINI_API_KEY"] = None

    res = client.post(_draft(house_org()), headers=house_secretary_headers)

    assert res.status_code == 503, res.get_json()
    body = res.get_json()
    assert body["code"] == "ai_unavailable"
    assert "gemini" not in body["error"].lower()
    assert "GEMINI_API_KEY" not in body["error"]
    # P-02: an unavailable provider answers with an error and an empty form, not
    # with a plausible kit the user would reasonably believe was drafted for
    # their organisation.
    assert "voice_tone" not in body
    assert "palette" not in body


def test_draft_happy_path_mocked(client, app, house_secretary_headers):
    """The whole round trip with the provider faked out, and the row count still
    zero afterwards — then the PUT, which is what actually creates the row.

    The second half is the regression this test exists for. A draft that returns
    200 and a kit that exists afterwards are indistinguishable in the UI, so the
    only place the difference can be caught is here.
    """
    house = house_org()
    app.config["GEMINI_API_KEY"] = "a-configured-key"

    with _fake_sdk(reply=GOOD_DRAFT) as calls:
        res = client.post(_draft(house), headers=house_secretary_headers)

    assert res.status_code == 200, res.get_json()
    body = res.get_json()
    assert body["voice_tone"] == "Warm, plainspoken, never corporate."
    assert body["palette"] == ["#5ce6c9", "#ffcf96", "#050505"]
    assert body["sample_phrases"] == [
        "See you in the city.",
        "One community, many cities.",
    ]
    assert body["source"] == BRAND_KIT_AI_DRAFT

    # One call, and it carried the configured key and the configured model —
    # neither hardcoded in the service.
    assert len(calls) == 1
    assert calls[0]["api_key"] == "a-configured-key"
    assert calls[0]["model"] == app.config["GEMINI_MODEL"]
    # The organisation's own three fields go into the prompt, and no fact is
    # asked for.
    assert house_org().name in calls[0]["contents"]

    assert BrandKit.query.count() == 0, "a 200 draft created a row"
    assert house_org().brand_kit is None

    saved = _save_kit(
        client, house_org(), house_secretary_headers,
        voice_tone=body["voice_tone"],
        palette=body["palette"],
        sample_phrases=body["sample_phrases"],
        source=body["source"],
    )
    assert saved.status_code == 200, saved.get_json()
    assert BrandKit.query.count() == 1
    read = client.get(
        _brand_kit(house_org()), headers=house_secretary_headers
    ).get_json()
    assert read["has_kit"] is True
    assert read["source"] == BRAND_KIT_AI_DRAFT


def test_draft_invalid_output(client, app, house_secretary_headers):
    """T-04-36. A model can ignore the response schema it was handed, so the
    output is revalidated by the SAME BrandKitSchema a human save goes through.

    The retry is bounded at one, and the hostile string never reaches the
    client: a rejected draft is an error, not a half-parsed kit.
    """
    app.config["GEMINI_API_KEY"] = "a-configured-key"
    before = BrandKit.query.count()

    with _fake_sdk(reply=HOSTILE_DRAFT) as calls:
        res = client.post(_draft(house_org()), headers=house_secretary_headers)

    assert res.status_code == 503, res.get_json()
    assert res.get_json()["code"] == "ai_failed"
    assert "script" not in res.get_data(as_text=True)
    assert "alert" not in res.get_data(as_text=True)
    assert len(calls) == 2, "one attempt and exactly one retry"

    assert BrandKit.query.count() == before
    assert house_org().brand_kit is None


def test_draft_unparseable_output(client, app, house_secretary_headers):
    """A reply that is not JSON at all takes the same route as one that fails
    revalidation — 503 ai_failed, nothing stored, no 500."""
    app.config["GEMINI_API_KEY"] = "a-configured-key"

    with _fake_sdk(reply="Sure! Here is your brand kit:") as calls:
        res = client.post(_draft(house_org()), headers=house_secretary_headers)

    assert res.status_code == 503, res.get_json()
    assert res.get_json()["code"] == "ai_failed"
    assert len(calls) == 2
    assert BrandKit.query.count() == 0


def test_draft_never_leaks_the_vendor_exception(
    client, app, house_secretary_headers
):
    """T-04-33, P-03. Vendor exception text routinely quotes the request and the
    credential that failed, so none of it may be echoed back.

    The exception below carries the key verbatim, which is exactly how a real
    one arrives. What the client gets is the sentence this service authored.
    """
    key = "AIzaSy-this-is-the-secret-key"
    app.config["GEMINI_API_KEY"] = key
    boom = RuntimeError(f"400 INVALID_ARGUMENT: API key {key} is not valid")

    with _fake_sdk(error=boom):
        res = client.post(_draft(house_org()), headers=house_secretary_headers)

    assert res.status_code == 503, res.get_json()
    body = res.get_data(as_text=True)
    assert res.get_json()["code"] == "ai_failed"
    assert key not in body
    assert "INVALID_ARGUMENT" not in body
    assert "API key" not in body
    assert BrandKit.query.count() == 0


def test_draft_cross_org(client, app, house_secretary_headers, student_headers):
    """T-04-40. The draft route is org-scoped like every other write on this
    profile, and its URL parameter is `org_id` — any other spelling would 404
    for everyone while the RBAC suite stayed green.

    Authorization is settled before the key is ever read, so a denied caller
    cannot spend this server's quota either.
    """
    app.config["GEMINI_API_KEY"] = "a-configured-key"
    society = other_org()

    cross_org = client.post(_draft(society), headers=house_secretary_headers)
    assert cross_org.status_code == 403, cross_org.get_json()
    assert cross_org.get_json()["code"] == "forbidden"

    por_less = client.post(_draft(house_org()), headers=student_headers)
    assert por_less.status_code == 403

    anonymous = client.post(_draft(house_org()))
    assert anonymous.status_code == 401

    assert BrandKit.query.count() == 0
