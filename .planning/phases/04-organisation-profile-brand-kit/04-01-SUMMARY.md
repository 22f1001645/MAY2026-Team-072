---
phase: 04-organisation-profile-brand-kit
plan: 01
subsystem: api
tags: [flask, marshmallow, rbac, pytest, sqlalchemy, blueprints]

# Dependency graph
requires:
  - phase: 01-migration-and-rbac-foundation
    provides: "can_manage_org / org_scoped / can_manage_org_required in app/rbac.py, ORG_MANAGER_PORS, the test_rbac_enforcement.py route-guard gate, organisations.bio and organisations.logo_url columns"
  - phase: 02-auth-and-por-taxonomy
    provides: "Society Deputy Secretary and Coordinator added to the POR taxonomy and to ORG_MANAGER_PORS"
provides:
  - "org_profile_bp — GET and PATCH /api/v1/orgs/<org_id>/profile, registered in ALL_BLUEPRINTS"
  - "org_profile_service.public_profile(org) / update_profile(org, data, actor) — object-in, never id-in"
  - "OrgProfileSchema with the 1000-character server-side bio bound"
  - "Organisation.to_dict(detail=False) — the verbosity flag 04-02 and 04-04 widen"
  - "Wave-0 test fixtures: a second house, a council org, house_secretary_headers, society_deputy_headers, council_coordinator_headers, house_org(), council_org(), secretary_user()"
  - "test_blueprint_registration.py — a structural gate proving every Blueprint under app/controllers/ is registered"
  - "The first proven route call site of can_manage_org_required anywhere in the codebase"
affects: [04-02-social-links, 04-03-logo-upload, 04-04-brand-kit, 04-05-frontend-profile, 04-09-phase-integration]

actuals:
  tokens: 21600
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "org_scoped guard loads the row onto g.org; the service takes the Organisation object and never re-queries by id"
    - "Service-level EDITABLE_FIELDS allowlist decides what a profile field is, rather than the request body"
    - "Structural registration gate: walk the controllers package instead of maintaining a list of controller names"

key-files:
  created:
    - backend/app/controllers/org_profile_controller.py
    - backend/app/services/org_profile_service.py
    - backend/tests/test_org_profile_brand_kit.py
    - backend/tests/test_blueprint_registration.py
  modified:
    - backend/app/controllers/__init__.py
    - backend/app/models/__init__.py
    - backend/app/schemas/__init__.py
    - backend/tests/conftest.py

key-decisions:
  - "The Phase 4 House Secretary fixture sits on a SECOND seeded house (Kanha House), not Nilgiri — assign_por allows one active House Secretary per house and three existing tests need that slot on the first house free"
  - "GET loads the organisation itself and raises a 404 rather than routing through org_scoped with an always-true predicate — the read route is open by design, so a scoped guard would be ceremony that reads as authorization"
  - "The council's manager POR is Coordinator, already in ORG_MANAGER_PORS and not house-scoped; no new POR constant was added"
  - "Organisation.to_dict(detail=True) currently returns exactly the base dict; the branch exists but is empty, because social_links and brand_kit both need filtered queries that later plans add"

patterns-established:
  - "Object-in services behind scoped guards: the guard 404s and 403s, the service trusts the object it is handed"
  - "Denial invisibility (P-06): the read payload is byte-identical for a reader who may edit and one who may not"
  - "Blueprint registration is enforced structurally, so new controllers are covered without anyone remembering to extend a list"

requirements-completed: [ORG-01]

coverage:
  - id: D1
    description: "A House Secretary can PATCH their own house organisation's bio and read it back through GET /api/v1/orgs/<org_id>/profile"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_edit_own_house_bio_round_trip"
        status: pass
    human_judgment: false
  - id: D2
    description: "All four organisation types — house, society, region, council — are editable through the one polymorphic code path"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_all_four_org_types_are_reachable_through_one_path"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_society_deputy_edits_own_society"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_rc_edits_region_profile"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_coordinator_edits_council_profile"
        status: pass
    human_judgment: false
  - id: D3
    description: "A Secretary of organisation A PATCHing organisation B receives 403 with code forbidden — not 404, not 500 — and organisation B is unchanged"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_cross_org_403_not_404_and_not_500"
        status: pass
    human_judgment: false
  - id: D4
    description: "A nonexistent organisation id is 404 with code not_found on both GET and PATCH, and the route is registered under the exact <org_id> parameter spelling"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_unknown_org_404"
        status: pass
    human_judgment: false
  - id: D5
    description: "A POR-less student is 403 on every organisation, an unauthenticated caller is 401, and an admin is 200 on all four"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_student_forbidden_without_a_por"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_unauthenticated_patch_is_401"
        status: pass
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_admin_any_org_may_edit"
        status: pass
    human_judgment: false
  - id: D6
    description: "A bio longer than 1000 characters is rejected server-side with 422 validation_error"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_bio_length_over_1000_is_rejected"
        status: pass
    human_judgment: false
  - id: D7
    description: "A successful profile update writes exactly one AuditLog row, in the same transaction as the change"
    requirement: "ORG-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_org_profile_brand_kit.py#test_edit_own_house_writes_exactly_one_audit_row"
        status: pass
    human_judgment: false
  - id: D8
    description: "Every Blueprint defined under backend/app/controllers/ is provably present in ALL_BLUEPRINTS and mounted on the app, enforced by a walking test rather than a maintained list"
    verification:
      - kind: unit
        ref: "backend/tests/test_blueprint_registration.py#test_every_controller_blueprint_is_registered"
        status: pass
      - kind: unit
        ref: "backend/tests/test_blueprint_registration.py#test_all_blueprints_are_mounted_on_the_app"
        status: pass
      - kind: other
        ref: "negative control: removed org_profile_bp from ALL_BLUEPRINTS, test failed naming org_profile_bp and app/controllers/org_profile_controller.py, entry restored and re-run green"
        status: pass
    human_judgment: false
  - id: D9
    description: "The pre-existing suite stays green — no new LEGACY_COARSE_ROUTES entry, no model column added, no new Alembic revision"
    verification:
      - kind: unit
        ref: "cd backend && pytest -q — 216 passed (201 before this plan)"
        status: pass
      - kind: unit
        ref: "backend/tests/test_rbac_enforcement.py"
        status: pass
      - kind: unit
        ref: "backend/tests/test_migrations.py"
        status: pass
    human_judgment: false

# Metrics
duration: 51min
completed: 2026-08-13
status: complete
---

# Phase 4 Plan 01: Organisation Profile Authorization Spine Summary

**`GET`/`PATCH /api/v1/orgs/<org_id>/profile` behind `can_manage_org_required` — the decorator's first route call site anywhere in the codebase — proven across all four organisation types plus the full 401/403/404/422 denial matrix, and a structural gate that makes an unregistered Blueprint impossible.**

## Performance

- **Duration:** 51 min
- **Started:** 2026-08-13T18:18:00Z
- **Completed:** 2026-08-13T19:09:00Z
- **Tasks:** 3
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments

- Proved the ORG-01 authorization spine end to end on one field before any new surface existed. `can_manage_org_required` previously had zero route call sites; every later plan in this phase now mounts on a seam with a passing denial matrix behind it.
- All four organisation types (house, society, region, council) round-trip a bio through one polymorphic code path, with no per-type branch anywhere in the controller or service. This discharges ROADMAP Phase 4 criterion 1.
- Cross-org denial is asserted as 403 with `code == "forbidden"` and the exact `_DENIAL_MESSAGES["can_manage_org"]` sentence, explicitly **not** 404 (the target exists) and **not** 500 (`can_manage_org` is total) — and the target organisation is verified unchanged afterwards.
- The 1000-character bio bound is enforced server-side. `organisations.bio` is an unbounded `db.Text`, so a UI character counter over an uncapped server would have been a limit only the browser respected (T-04-04).
- `test_blueprint_registration.py` walks the controllers package and fails if any Blueprint is missing from `ALL_BLUEPRINTS`, or if any `ALL_BLUEPRINTS` entry never reaches the app. The negative control was demonstrated, not assumed. This closes 04-RESEARCH Pitfall 1 permanently and will catch 04-03's `upload_bp` automatically.
- The read route is deliberately open to any signed-in user and returns a payload byte-identical for a reader who may edit and one who may not, so the frontend cannot render a padlock the caller has no way to open (P-06).
- Suite went 201 → 216 passing. `test_rbac_enforcement.py` green with no new `LEGACY_COARSE_ROUTES` entry; `test_migrations.py` green with no model column and no new Alembic revision.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer, TDD): End-to-end House Secretary edits own bio** — `4125be8` (test, RED) then `50b9518` (feat, GREEN)
2. **Task 2: All four organisation types and the full denial matrix** — `5b37f50` (test)
3. **Task 3: Close the unregistered-blueprint hole permanently** — `f0ff0ad` (test)

No REFACTOR commit — the GREEN implementation needed no cleanup.

## Files Created/Modified

- `backend/app/controllers/org_profile_controller.py` (new) — `org_profile_bp` with `GET` (`auth_required`, loads the org itself and 404s) and `PATCH` (`can_manage_org_required`, reads `g.org`). Never touches `db.session`.
- `backend/app/services/org_profile_service.py` (new) — `public_profile(org)` and `update_profile(org, data, actor)`. Takes the Organisation object, applies only keys in the `EDITABLE_FIELDS` allowlist, records the audit row, commits exactly once.
- `backend/tests/test_org_profile_brand_kit.py` (new) — 13 tests: the round trip, the bio bound, the 404s, the audit row, all four types, cross-org 403, POR-less 403, unauthenticated 401, admin-anywhere, and read-payload identity.
- `backend/tests/test_blueprint_registration.py` (new) — two structural tests over the controllers package, no controller named in the file.
- `backend/app/controllers/__init__.py` — both halves of the registration: the import and the `ALL_BLUEPRINTS` entry.
- `backend/app/models/__init__.py` — `Organisation.to_dict(self, detail=False)`. Base keys unchanged, so `GET /api/v1/orgs` is unaffected. No column added.
- `backend/app/schemas/__init__.py` — `OrgProfileSchema` with `bio` bounded at 1000 characters.
- `backend/tests/conftest.py` — a second house (`Kanha House`), a council org (`Student Executive Council`), three POR holders built directly (never through `assign_por`), three header fixtures, and the `house_org()` / `council_org()` / `secretary_user()` lookup helpers.

## Decisions Made

- **The Phase 4 secretary lives on a second house, not on Nilgiri.** `org_service.assign_por` enforces one active House Secretary per house, and three existing tests assign that role to `filter_by(type="house").first()`. Seeding a secretary there would have filled the slot those tests need free. Adding a second house preserves both premises; reshaping the existing tests to accommodate new fixture data would not have. `house_org()` therefore fetches by name (`SECRETARY_HOUSE`) — still not by insertion position, which is what conftest's convention actually forbids.
- **`GET` loads the organisation itself rather than routing through `org_scoped` with an always-true predicate.** The read is open by design (T-04-03, accepted), so wrapping it in a scoped guard would put an authorization shape around a decision that is not an authorization decision. `auth_required` satisfies `test_every_scoped_route_carries_at_least_one_guard`; the 404 is three explicit lines in the view.
- **`Coordinator` for the council, no new POR constant.** Already in `ORG_MANAGER_PORS`, already defined by AUTH-03 as council-scoped, and not in `HOUSE_ONLY_POR_TYPES`.
- **`to_dict(detail=True)` returns exactly the base dict today.** The branch is present but empty with a comment, per plan — `social_links` (04-02) and `brand_kit` (04-04) both need filtered queries, so the declared home exists rather than a placeholder value that would read as real data.
- **The service owns an `EDITABLE_FIELDS` allowlist.** Absent keys are left alone rather than nulled, so a partial PATCH cannot erase a field the client never mentioned — which matters as soon as 04-02 and 04-03 add their own keys.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Seeded House Secretary POR collided with `assign_por`'s one-per-house guardrail**

- **Found during:** Task 1 (GREEN phase, full-suite run)
- **Issue:** The plan specifies a `house_secretary_headers` fixture holding `House Secretary` on the house org. `_seed_minimal` had exactly one house, and `org_service.assign_por` Guardrail 1 permits only one active House Secretary per house. `tests/test_org_service_unit.py::test_assign_por_success` assigns that exact role to `filter_by(type="house").first()` and began failing with `slot_already_filled`. Two consumers wanting one singular resource.
- **Fix:** Appended a second house (`Kanha House`, city Pune) to `_seed_minimal` after the society row — the same move the codebase already made for the society "Org B" — and put the Phase 4 POR holders there, leaving the first house's slot free. `house_org()` fetches by the `SECRETARY_HOUSE` constant. The alternative, editing the three existing tests to accommodate new fixture data, would have dissolved the business rule those tests exist to assert.
- **Files modified:** `backend/tests/conftest.py`
- **Verification:** `cd backend && pytest -q` — 205 passed at that point, including `test_assign_por_success` and the two other House-Secretary assignment tests. `test_seed_guard.py`'s 12-house count assertion is unaffected: it runs against the separate `clean_app` fixture, not `_seed_minimal`.
- **Committed in:** `50b9518` (Task 1 GREEN commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep. The fix adds one seed row and touches no production code. Every plan artifact, symbol name and acceptance criterion is delivered as specified.

### Acceptance criteria: one literal-vs-intent note

Task 2's criterion `grep -c "assign_por" backend/tests/conftest.py` is unchanged from before this task reads **3**, not 0. All three occurrences are prose in comments and a docstring explaining *why* `assign_por` is deliberately not called (the house-only guardrail, and the one-secretary-per-house slot). `conftest.py` does not import `org_service` and makes no call to it — every POR row is constructed directly, which is the criterion's actual intent. The count changed because the explanation is written down rather than left implicit.

### Tracer feedback gate

Task 1 was `type="tracer"`. The gate ran after its commit: the tracer's `<verify>` was re-run end to end (`test_org_profile_brand_kit.py` selectors plus `test_rbac_enforcement.py` and `test_migrations.py`, then the whole suite at 205 passed) before any expansion task started. The plan carries `autonomous: true` and the tracer's `<verify>` block contains only an `<automated>` entry with no human-judgment content, so the passing run discharged the gate rather than a checkpoint being raised for a human to run pytest.

## Issues Encountered

- **The `unknown_org_404` test would have passed vacuously in RED.** With no blueprint registered, every URL 404s with `code == "not_found"` — including the correct one — so the test would have been green before a line of implementation existed and told us nothing. Fixed by asserting first that `/api/v1/orgs/<org_id>/profile` is in `app.url_map`. That makes the test fail properly in RED, and it doubles as the T-04-02 guard: it pins the parameter spelling, which is the phase's one silent, test-invisible failure mode (`org_scoped` reads `kwargs.get("org_id")`, and any other spelling 404s every caller including admins while the RBAC suite stays green).
- No other issues. The `can_manage_org_required` seam worked exactly as its docstring claimed on first use.

## Known Stubs

`Organisation.to_dict(detail=True)` currently returns the same dict as `detail=False` — the `if detail:` branch is present, commented and empty. This is intentional and planned: the plan's Task 1 `<action>` specifies it explicitly, because `social_links` and `brand_kit` both require filtered queries that 04-02 and 04-04 own. Nothing renders a `detail` field today, so no surface promises data it does not have.

## User Setup Required

None — no external service configuration required. No new dependencies, no new environment variables, no schema change (so `seed.py` need not be re-run).

## Next Phase Readiness

Ready. What the rest of Wave 1+ inherits:

- **04-02 (social links)** — add the key to `EDITABLE_FIELDS` and widen the `if detail:` branch in `Organisation.to_dict`. The URL shape, the guard and the audit call are already proven.
- **04-03 (logo upload)** — creates `upload_bp`. `test_blueprint_registration.py` will fail loudly if only one half of the registration is written, which is the specific failure this plan was asked to make impossible.
- **04-04 (brand kit)** — same `if detail:` home, same service allowlist.
- **04-05+ (frontend)** — the read payload is stable and identical for every authenticated caller, so the profile page needs no editability field from the server; it should derive the edit affordance from the caller's own capabilities and render nothing at all when absent (P-06).
- **Fixtures** — `house_secretary_headers`, `society_deputy_headers`, `council_coordinator_headers`, `house_org()`, `council_org()`, `secretary_user()` are in conftest for every later plan. Note for anyone adding a house-scoped POR fixture: the first house's House Secretary slot is deliberately reserved for `assign_por`'s uniqueness tests, so use `house_org()` (`SECRETARY_HOUSE`), not `filter_by(type="house").first()`.

No blockers.

---
*Phase: 04-organisation-profile-brand-kit*
*Completed: 2026-08-13*
