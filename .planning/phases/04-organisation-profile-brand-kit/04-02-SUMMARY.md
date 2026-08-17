---
phase: 04-organisation-profile-brand-kit
plan: 02
subsystem: api
tags: [flask, marshmallow, sqlalchemy, alembic, security, url-validation, pytest]

# Dependency graph
requires:
  - phase: 01-migration-and-rbac-foundation
    provides: "can_manage_org_required, organisation_social_links table with uq_org_social_platform, the Alembic chain and test_migrations.py's drift gate"
  - phase: 04-organisation-profile-brand-kit
    plan: 01
    provides: "org_profile_bp, org_profile_service.public_profile/update_profile, Organisation.to_dict(detail=), the Phase 4 conftest fixtures"
provides:
  - "app/url_safety.py — normalise_social_url / normalise_website_url / is_renderable_social_url, plus check_social_url / check_website_url returning the rejection code"
  - "SOCIAL_PLATFORMS, SOCIAL_PLATFORM_KEYS, SOCIAL_FIELD_ORDER in app/constants.py"
  - "PUT /api/v1/orgs/<org_id>/social-links — replace-all, behind can_manage_org_required"
  - "withheld_platforms on GET /orgs/<org_id>/profile — platform keys only"
  - "organisations.website — a distinct nullable column (Alembic revision f997686e136b)"
  - "SocialLinkSchema / SocialLinksReplaceSchema"
  - "backend/tests/test_url_safety.py — a 52-case pure-unit vector table with no app fixture"
affects: [04-03-logo-upload, 04-04-brand-kit, 04-05-frontend-profile, 04-09-phase-integration]

actuals:
  tokens: 11500
  tasks: 3
  commits: 5

tech-stack:
  added: []
  patterns:
    - "One safety predicate with two call sites — the write path and the read path — so a value that could never be saved can also never be served"
    - "A narrowed variant of a validator shares the original's body and skips exactly one named check, rather than existing as a second parser"
    - "Rejections carry a stable code plus a non-empty details object naming the field or row that caused them, so the client can place the error"

key-files:
  created:
    - backend/app/url_safety.py
    - backend/tests/test_url_safety.py
    - backend/migrations/versions/f997686e136b_add_organisations_website.py
  modified:
    - backend/app/constants.py
    - backend/app/models/__init__.py
    - backend/app/schemas/__init__.py
    - backend/app/services/org_profile_service.py
    - backend/app/controllers/org_profile_controller.py
    - backend/tests/test_org_profile_brand_kit.py
    - backend/tests/test_schema_batch.py

key-decisions:
  - "Checkpoint Task 1 resolved as option-a: organisations.website is a distinct nullable column added by Alembic revision f997686e136b. D-03's own reversibility note already presupposed a column ('a schema drop'), and ROADMAP Phase 1 forbids a destructive reset rather than an additive revision"
  - "Rejection codes are assigned by what the user must fix: social_url_scheme for what kind of link it is, social_url_host for where the link points — so credentials, an explicit port, an IP literal and a lookalike hostname all report as host problems"
  - "validate.URL was left off SocialLinkSchema.url deliberately: it would pre-empt javascript:alert(1) with a 422 whose message cannot be placed on a row, where url_safety returns 400 social_url_scheme with details naming the platform"
  - "A withheld website is omitted from the read payload but is NOT added to withheld_platforms — that array is contractually platform keys, and website is a field, not a platform (P-08)"

patterns-established:
  - "The read-side filter lives in the service, never in to_dict(): a to_dict() cannot omit itself from a list"
  - "Enum allowlists are imported into schemas, never restated"
  - "test_schema_batch.py's head revision and revision count are updated deliberately, with a note naming the revision and why, exactly as that file asks"

requirements-completed: [ORG-02]

coverage:
  - id: D1
    description: "A link whose scheme is not http or https is rejected at save time, including javascript:, data: and the scheme-relative //host/path form"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "backend/tests/test_url_safety.py#test_rejected_urls_return_none[javascript_scheme|data_scheme|scheme_relative_empty_scheme|ftp_scheme]"
        status: pass
      - kind: unit
        ref: "backend/tests/test_url_safety.py#test_scheme_is_checked_first_and_unconditionally"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_scheme_rejected_with_placeable_details"
        status: pass
    human_judgment: false
  - id: D2
    description: "A link whose host is not on that platform's allowlist is rejected; instagram.com.evil.com and instagram.com@evil.com are both refused"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "backend/tests/test_url_safety.py#test_suffix_attack_needs_the_leading_dot"
        status: pass
      - kind: unit
        ref: "backend/tests/test_url_safety.py#test_rejected_urls_return_none[userinfo|suffix_attack|right_host_wrong_platform]"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_host_rejected_with_placeable_details"
        status: pass
    human_judgment: false
  - id: D3
    description: "IP literals, localhost and private/loopback/link-local ranges are rejected at save time (SSRF guard)"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "backend/tests/test_url_safety.py#test_rejected_urls_return_none[ssrf_loopback_ip|ssrf_localhost|ssrf_private_range|ssrf_link_local_metadata|ssrf_ipv6_loopback]"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_website_rejection_names_the_field_not_a_platform"
        status: pass
    human_judgment: false
  - id: D4
    description: "The value persisted is the re-serialised URL, never the raw input — https://insta\\tgram.com/x reads back as https://instagram.com/x"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "backend/tests/test_url_safety.py#test_accepted_urls_normalise[parser_differential_tab|parser_differential_newline]"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_stores_normalised_url_never_the_raw_input"
        status: pass
    human_judgment: false
  - id: D5
    description: "A non-ASCII hostname is rejected — both the accented and the ideographic-full-stop forms"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "backend/tests/test_url_safety.py#test_rejected_urls_return_none[homograph_latin_accent|homograph_ideographic_stop]"
        status: pass
    human_judgment: false
  - id: D6
    description: "A hostile row inserted directly through the ORM is absent from GET /orgs/<id>/profile, its platform appears in withheld_platforms, and its URL appears nowhere in the response"
    requirement: "ORG-02"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_hostile_row_never_rendered"
        status: pass
    human_judgment: false
  - id: D7
    description: "An empty payload is a valid saved state — 200, social_links [] and no error"
    requirement: "ORG-02"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_empty_payload_is_a_valid_saved_state"
        status: pass
    human_judgment: false
  - id: D8
    description: "The platform set has a fixed stable order (website, instagram, linkedin, x, youtube, facebook, github) and the returned links follow it"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "backend/tests/test_url_safety.py#test_social_field_order_is_fixed_and_stable"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_social_links_come_back_in_the_declared_order"
        status: pass
    human_judgment: false
  - id: D9
    description: "Replacing an existing platform's URL does not raise IntegrityError on uq_org_social_platform, and two rows naming one platform are rejected 400 duplicate_platform before the database is touched"
    requirement: "ORG-02"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_replace_existing_platform_keeps_one_row"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_duplicate_platform_is_rejected_before_any_write"
        status: pass
    human_judgment: false
  - id: D10
    description: "organisations.website exists as a distinct column, added by one additive nullable Alembic revision, with the model-vs-migration drift gate green"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "backend/tests/test_migrations.py — 9 passed, including test_models_match_migrations_no_drift"
        status: pass
      - kind: unit
        ref: "backend/tests/test_schema_batch.py — head revision f997686e136b, revision count 7"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_website_round_trip"
        status: pass
    human_judgment: false

# Metrics
duration: 35min
completed: 2026-08-14
status: complete
---

# Phase 4 Plan 02: ORG-02 URL Safety and Social Links Summary

**One `urlsplit`-based predicate called on both the write path and the read path, so every empirically-verified bypass is refused at save time and a hostile row already sitting in the table is provably absent from the response — plus the replace-all endpoint and the deliberately-narrowed `website` column.**

## Performance

- **Duration:** 35 min
- **Completed:** 2026-08-14
- **Tasks:** 3
- **Files modified:** 10 (3 created, 7 modified)
- **Suite:** 216 → 281 passing, 0 failing

## Checkpoint Decision (Task 1)

**Chosen: `option-a` — add `organisations.website` as a distinct nullable column.**

Rationale: D-03 requires `website` to be modelled as a distinct field and its own reversibility note calls removal "a schema drop", so D-03 already presupposed a column. 04-CONTEXT.md's "no new Alembic migration" constraint was stale, and has since been amended (commit `2d7f642`) — ROADMAP Phase 1 criterion 3 prohibits a second *destructive reset*, not an additive revision, and criterion 1 literally requires that a developer can add and drop a column with `flask db upgrade`. Four additive revisions had already landed after the Phase 1 batch with the drift gate green throughout; this is the fifth.

Delivered as revision `f997686e136b` (`add organisations.website`), additive, nullable, batch-mode, chained to the previous head `60ec9bdbcde9`, applied to the dev database with `flask db upgrade`. No reseed. `option-c` was not implemented — it violates D-03's first requirement and reintroduces the carve-out the decision exists to prevent.

## Accomplishments

- **`backend/app/url_safety.py`** — the phase's security core, with no analog anywhere in the codebase before this plan. Built entirely on `urllib.parse.urlsplit`; nothing hand-rolls URL parsing, because every bypass it refuses is a parser differential and a bespoke parser reintroduces the gap by construction.
- **The checks run in a fixed, load-bearing order**: length → **scheme, first and unconditionally** → credentials and port → host read from `.hostname` → ASCII only → IP literals and `localhost` → the per-platform host allowlist → re-serialise → final length. `javascript://instagram.com/%0aalert(1)` is the row that proves the order matters: it parses to an *allowlisted* host, so any host logic running first would pass it.
- **The stored value is the re-serialised URL, never the input.** `urlsplit` strips tab, CR and LF before parsing, so validating the raw string and storing the raw string would persist something other than what was checked. `https://insta\tgram.com/x` is saved as `https://instagram.com/x`, asserted both as a unit and end to end through the API.
- **The read-side filter** in `public_profile()` calls the same predicate. This, not the write gate, is what makes ROADMAP Phase 4 criterion 2's second clause — "never rendered anywhere" — a property of the system: the write gate does nothing about rows already in the table, and the model's own docstring says the column is stored unvalidated by that layer on purpose. `test_hostile_row_never_rendered` inserts `javascript:alert(1)` straight through the ORM and asserts the string appears nowhere in `json.dumps(body)`.
- **52 unit vectors in `test_url_safety.py`, with no app fixture** — the fastest feedback loop in the phase, roughly a second. Every vector in the plan is a row, plus the website field's parallel table.
- **`PUT /orgs/<org_id>/social-links`** replaces the whole section in one write. Duplicates are caught in the payload and every URL is normalised *before* any row changes, so a rejected payload leaves the existing links exactly as they were. Delete → `flush()` → insert inside one transaction keeps `uq_org_social_platform` from firing on an edit.
- **Rejections are placeable.** `social_url_scheme` and `social_url_host` each carry a non-empty `details` — `{"platform": "<key>"}` for a row, `{"field": "website"}` for the website field — because `errors.envelope()` drops a falsy `details` and the editor cannot mark the offending row without it.
- **`withheld_platforms` carries keys only** (P-05a). The row's existence is not the secret; the URL is precisely the string that failed the check.

## Task Commits

1. **Task 1 (checkpoint, option-a): the `website` column** — `c8b375d`
2. **Task 2 (TDD): the URL-safety predicate and its vector table** — `c1ac344` (test, RED) then `38c760c` (feat, GREEN)
3. **Task 3 (TDD): replace-all social links, the read filter, `withheld_platforms`** — `1f89a33` (test, RED) then `90a0806` (feat, GREEN)

No REFACTOR commits — neither GREEN implementation needed cleanup.

## Files Created/Modified

- `backend/app/url_safety.py` (new) — `_check` holds every control; `check_social_url` adds the platform allowlist, `check_website_url` skips exactly that one check. `normalise_social_url`, `normalise_website_url` and `is_renderable_social_url` are one-line wrappers.
- `backend/tests/test_url_safety.py` (new) — 52 cases: the accept table with expected normalised output, 22 rejection rows, the scheme-order proof, the suffix-attack proof, the length boundary, the website table, and the constants contract.
- `backend/migrations/versions/f997686e136b_add_organisations_website.py` (new) — additive nullable column, batch mode, reversible.
- `backend/app/constants.py` — `SOCIAL_PLATFORMS` (six platforms, no generic entry), `SOCIAL_PLATFORM_KEYS`, `SOCIAL_FIELD_ORDER`.
- `backend/app/models/__init__.py` — `Organisation.website` and its key in `to_dict()`.
- `backend/app/schemas/__init__.py` — `SocialLinkSchema` (platform enum imported, never restated) and `SocialLinksReplaceSchema`.
- `backend/app/services/org_profile_service.py` — `replace_social_links()` and the read-side filter inside `public_profile()`.
- `backend/app/controllers/org_profile_controller.py` — the `PUT` route under `can_manage_org_required`, returning the same payload `GET /profile` returns.
- `backend/tests/test_org_profile_brand_kit.py` — 13 new integration cases.
- `backend/tests/test_schema_batch.py` — head revision and revision count updated with the note that file explicitly asks for.

## Decisions Made

- **Rejection codes are assigned by what the user has to fix, not by which line rejected.** `social_url_scheme` means "what kind of link is this" (scheme missing, not http(s), empty, over-length); `social_url_host` means "where does this point" (credentials, explicit port, empty host, non-ASCII host, IP literal, `localhost`, off-allowlist). So `https://instagram.com@evil.com` reports as a host problem, which is the honest description: the link points at evil.com. This maps cleanly onto the two headings UI-SPEC S4 defines.
- **`validate.URL` was deliberately left off `SocialLinkSchema.url`.** The plan's `<action>` suggested it as a cheap first pass, but its `<behavior>` requires `javascript:alert(1)` to return **400 `social_url_scheme` with `details`**. Marshmallow would pre-empt that with a 422 whose nested message the editor cannot place on a row. `url_safety` is strictly the stronger check — it has a scheme allowlist that runs unconditionally, plus host, port, IDN and IP checks marshmallow has none of — so keeping the weaker one in front of it would only have degraded the error. `validate.Length(max=MAX_SOCIAL_URL_LENGTH)` and the imported platform `OneOf` remain as the marshmallow pass.
- **A withheld `website` is omitted from the payload but is not added to `withheld_platforms`.** D-03 says the read filter applies to the website field identically, and it does — the value is served as `null`. It is kept out of `withheld_platforms` because that array is contractually platform keys and `website` is a field, not a platform (P-08). Surfacing a withheld website to the manager would need its own contract addition, which no locked artifact defines; flagged below for 04-05.
- **All IP literals are rejected, not only private ranges.** One rule instead of a range table: a public IP literal is never a legitimate social profile or organisation site, and the single rule covers loopback, private, link-local and IPv6 at once.
- **A blank URL in the payload is skipped by the service rather than stored as an empty string**, but the schema requires the key, so through the API "remove this link" means omitting the row — which is what the seven-row editor already does.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `test_schema_batch.py` pinned the head revision and the revision count**

- **Found during:** Task 1 (full-suite run after the model change)
- **Issue:** `test_exactly_one_migration_head` and `test_exactly_two_revisions` assert `HEAD_REVISION == "60ec9bdbcde9"` and `EXPECTED_REVISION_COUNT == 6`. The new revision failed both. Neither `test_migrations.py` nor 04-RESEARCH mentions this second gate.
- **Fix:** Updated both constants to `f997686e136b` and `7`, with a comment naming the revision and why it was added. That file's own comment specifies this exactly: "If a FUTURE phase legitimately adds a revision, this number is the thing to update — deliberately, in a review, alongside a note saying which revision was added and why. It is not the thing to delete."
- **Files modified:** `backend/tests/test_schema_batch.py`
- **Verification:** `pytest tests/test_schema_batch.py tests/test_migrations.py tests/test_seed_guard.py` green.
- **Committed in:** `c8b375d` (Task 1)

**2. [Rule 2 - Missing critical functionality] The website field had no read-side filter in the plan's task text**

- **Found during:** Task 3
- **Issue:** Task 3's `<action>` describes the read-side filter for social-link rows only. D-03 states "the read-side filter and `safeExternalHref()` apply to it identically" for the website field, but no task step implements it, so an out-of-band website value would have rendered.
- **Fix:** `public_profile()` passes `org.website` through `check_website_url` and serves the result, so a value that could not be saved today is not served today either.
- **Files modified:** `backend/app/services/org_profile_service.py`
- **Verification:** covered by `test_website_round_trip` (the normalised value survives the filter); the hostile-value path shares the identical predicate proven by `test_url_safety.py`.
- **Committed in:** `90a0806` (Task 3)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing-functionality)
**Impact on plan:** No scope creep. Every artifact, symbol name and acceptance criterion in the plan is delivered, plus the one `validate.URL` judgement recorded under Decisions above.

### Acceptance criteria: two literal-vs-intent notes

- **"a URL whose *normalised* form exceeds 300 characters" has no constructible vector.** Normalisation only ever removes characters — it strips tab/CR/LF, drops the fragment and lowercases — so no input under 300 characters can normalise to over 300. The check is implemented as the plan specifies and is genuine defence in depth against a future normalisation step that adds characters, but it cannot be reached today. The length boundary is instead asserted directly at 300 and 301 in `test_length_boundary_is_enforced_on_the_value_returned`.
- **`pytest --collect-only -q | wc -l` is not the count on this machine.** This project's pytest prints one summary line per file (`tests/test_url_safety.py: 52`) rather than one line per test, so the criterion's `wc -l` reads 1. The underlying intent is satisfied with room to spare: **52** collected cases against a floor of 25.

## Issues Encountered

- **The plan's own two clauses about `SocialLinkSchema.url` could not both hold.** Resolved in favour of the testable behaviour contract; reasoning recorded under Decisions.
- Nothing else. `can_manage_org_required` mounted on the new route with no change, `test_rbac_enforcement.py` needed no new entry, and `test_blueprint_registration.py` was already satisfied because the route joins the existing `org_profile_bp`.

## Known Stubs

None. No placeholder values, no empty branches added, no TODO left behind.

Carried forward from 04-01 and still open by design: `Organisation.to_dict(detail=True)` returns the base dict — this plan assembles `social_links` and `withheld_platforms` in the service rather than the model, deliberately, because a `to_dict()` cannot omit itself from a list. 04-04's brand kit still owns that branch.

## Threat Flags

None. Every surface this plan adds is inside the phase `<threat_model>`'s register (T-04-07 through T-04-16) and each carries its mitigation and its test.

## User Setup Required

**Run `flask db upgrade` in `backend/` after pulling.** One additive nullable column, no data change, no reseed. `python seed.py` is *not* required and should not be run — it is destructive.

## Next Phase Readiness

Ready. What the rest of the phase inherits:

- **04-03 (logo upload)** — unaffected; `EDITABLE_FIELDS` and the profile PATCH are untouched by this plan.
- **04-04 (brand kit)** — `Organisation.to_dict(detail=True)`'s branch is still free; note that `public_profile()` now adds keys after calling it, so the brand kit should follow the same pattern rather than competing with it.
- **04-05 (frontend profile)** — the read contract is `social_links` (ordered by `SOCIAL_FIELD_ORDER`, filtered), `withheld_platforms` (keys only), and `website` (filtered, possibly `null`). Error placement uses `code` plus `details.platform` / `details.field`, never message matching. **One open item:** a withheld *website* is served as `null` and does not appear in `withheld_platforms`, so the "n links need attention" badge will not count it — if S4 wants that, it needs a contract addition naming the field.
- **04-09 (integration)** — `pytest tests/test_url_safety.py -x -q` runs in about a second with no app fixture and is the cheapest regression check in the phase.

No blockers.

## Self-Check: PASSED

- Created files present on disk: `backend/app/url_safety.py`, `backend/tests/test_url_safety.py`, `backend/migrations/versions/f997686e136b_add_organisations_website.py`.
- Commits present in `git log`: `c8b375d`, `c1ac344`, `38c760c`, `1f89a33`, `90a0806`.
- `cd backend && pytest -q` — 281 passed, 0 failed (exit 0).

---
*Phase: 04-organisation-profile-brand-kit*
*Completed: 2026-08-14*
