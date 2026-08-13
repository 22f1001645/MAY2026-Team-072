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

import pytest

from app.config import Config
from app.constants import UPLOAD_URL_PATTERN, UPLOAD_URL_PREFIX
from app.controllers.upload_controller import sniff_image_ext, upload_dir
from app.extensions import db
from app.rbac import _DENIAL_MESSAGES
from app.models import AuditLog, OrganisationSocialLink

from .conftest import council_org, house_org, other_org, region_org

PROFILE_URL = "/api/v1/orgs/{org_id}/profile"
SOCIAL_URL = "/api/v1/orgs/{org_id}/social-links"
LOGO_URL = "/api/v1/orgs/{org_id}/logo"

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
