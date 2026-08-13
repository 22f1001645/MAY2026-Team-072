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
import json

from app.extensions import db
from app.rbac import _DENIAL_MESSAGES
from app.models import AuditLog, OrganisationSocialLink

from .conftest import council_org, house_org, other_org, region_org

PROFILE_URL = "/api/v1/orgs/{org_id}/profile"
SOCIAL_URL = "/api/v1/orgs/{org_id}/social-links"


def _profile(org):
    return PROFILE_URL.format(org_id=org.id)


def _social(org):
    return SOCIAL_URL.format(org_id=org.id)


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
