---
phase: 02-identity-session-dashboard-shell
plan: 04
subsystem: auth
tags: [jwt, rbac, por, flask, pytest, sqlalchemy]

requires:
  - phase: 01-migration-authorization-foundation
    provides: "rbac.is_organiser / manageable_orgs / manageable_activities predicates, ORGANISER_PORS + ORG_MANAGER_PORS, the url_map enforcement gate"
  - phase: 02-identity-session-dashboard-shell
    provides: "02-03's refresh rotation, reuse detection and CSRF enforcement on the session endpoints these tests authenticate through"
provides:
  - "Executable proof of the AUTH-02 capability contract: shape, live recomputation, and a capability-free access token"
  - "Executable proof of the AUTH-03 POR taxonomy, per POR type, with negative controls"
  - "A D-14 POR audit that reports only unrecognised por_type rows, through the service and repository layers"
affects: [dashboard-shell, organiser-surfaces, admin-governance, phase-03-proposals]

actuals:
  tokens: 4040
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Mutation verification as the RED substitute when a plan adds tests to already-correct code"
    - "Bounded-query assertion via a SQLAlchemy before_cursor_execute listener, with a generous ceiling instead of an exact count"

key-files:
  created:
    - backend/tests/test_capabilities.py
    - backend/tests/test_por_audit.py
  modified:
    - backend/app/controllers/auth_controller.py
    - backend/app/services/auth_service.py
    - backend/app/repositories/repos.py
    - backend/tests/test_rbac_predicates.py

key-decisions:
  - "AUTH-03's constants work was already correct from Phase 1 — this plan added its proof only, and constants.py is unchanged"
  - "The recognised-POR union lives in the service, not the repository: which positions confer authority is a business rule"
  - "The no-claims test is named ...no_claims_about_capabilities so the plan's `-k no_claims` selector resolves to exactly one test"

patterns-established:
  - "Audit endpoints report anomalies only, never the full table — a diagnostic that lists healthy rows buries the defect and doubles as a bulk export"
  - "Capability liveness is tested by reusing the same access token across both calls; re-logging in would mask a token-baked capability"

requirements-completed: [AUTH-02, AUTH-03]

coverage:
  - id: D1
    description: "GET /auth/me returns is_organiser plus manageable_org_ids and manageable_activity_ids, computed server-side from live PORs, with a bounded query count"
    requirement: "AUTH-02"
    verification:
      - kind: integration
        ref: "backend/tests/test_capabilities.py::test_me_returns_the_three_capability_keys"
        status: pass
    human_judgment: false
  - id: D2
    description: "Deactivating a POR flips is_organiser on the very next /auth/me with no new token issued"
    requirement: "AUTH-02"
    verification:
      - kind: integration
        ref: "backend/tests/test_capabilities.py::test_capabilities_are_recomputed_live_when_a_por_is_deactivated"
        status: pass
      - kind: other
        ref: "mutation: get_capabilities reads is_organiser from a JWT claim -> test red, reverted"
        status: pass
    human_judgment: false
  - id: D3
    description: "No capability data is embedded in the access token"
    requirement: "AUTH-02"
    verification:
      - kind: unit
        ref: "backend/tests/test_capabilities.py::test_access_token_carries_no_claims_about_capabilities"
        status: pass
      - kind: other
        ref: "mutation: is_organiser added to _token additional_claims -> test red, reverted"
        status: pass
    human_judgment: false
  - id: D4
    description: "Society Deputy Secretary and Coordinator are present in both ORGANISER_PORS and ORG_MANAGER_PORS"
    requirement: "AUTH-03"
    verification:
      - kind: unit
        ref: "backend/tests/test_rbac_predicates.py::test_new_por_types_are_in_both_por_sets"
        status: pass
    human_judgment: false
  - id: D5
    description: "Deputy House Secretary, Web Admin, Society Deputy Secretary and Coordinator each receive the organiser surface, with a no-POR and an invented-POR negative control"
    requirement: "AUTH-03"
    verification:
      - kind: integration
        ref: "backend/tests/test_capabilities.py::test_por_matrix_all_four_por_types_get_the_organiser_surface (6 cases)"
        status: pass
      - kind: other
        ref: "mutation: Coordinator removed from ORGANISER_PORS -> exactly that case red, other five pass, reverted"
        status: pass
    human_judgment: false
  - id: D6
    description: "GET /auth/por-audit reports only POR assignments whose por_type matches neither POR set, reaching the database through a service and a repository"
    verification:
      - kind: integration
        ref: "backend/tests/test_por_audit.py (4 tests)"
        status: pass
      - kind: other
        ref: "grep -v '^\\s*#' backend/app/controllers/auth_controller.py | grep -cE 'PORAssignment|joinedload|\\.query\\.' == 0"
        status: pass
    human_judgment: false
  - id: D7
    description: "Capabilities remain a rendering projection — Phase 1's url_map enforcement gate stays green"
    verification:
      - kind: integration
        ref: "backend/tests/test_rbac_enforcement.py (3 tests)"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-08-12
status: complete
---

# Phase 02 Plan 04: Capability Contract and POR Taxonomy Summary

**AUTH-02's server-side capability contract and AUTH-03's POR taxonomy are now enforced by tests including three mutation checks, and D-14's audit endpoint was rewritten to report only the POR rows no authorization predicate can read.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-08-12T15:05Z
- **Completed:** 2026-08-12T15:35Z
- **Tasks:** 3
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- **D-14's audit now answers the question it was written for.** It previously returned *every* POR assignment, so a misspelled `por_type` — the one thing the audit exists to catch — was buried in a list of healthy rows. It now returns only assignments whose type is in neither POR set, and reaches the database through `PORRepository` and `auth_service` instead of a `PORAssignment.query` inside the controller.
- **AUTH-02 is proved, not assumed.** Three tests pin the capability payload's shape (with a plain student as the control), its live recomputation when a POR is deactivated, and the absence of any capability claim in the access token. The two D-11 guarantees are mutation-verified: baking `is_organiser` into the token turns the no-claims test red, and reading it back out of the claim turns the liveness test red.
- **AUTH-03 is proved per POR type.** All four POR types from ROADMAP criterion 3 get the organiser surface through `/auth/me`, asserted as a six-case parametrisation that includes a no-POR user and an invented POR type so the matrix cannot pass by returning true unconditionally. Removing `Coordinator` from `ORGANISER_PORS` reddens exactly that one case.
- **The confidentiality side-effect.** Narrowing the audit also closed T-02-21: an admin-only diagnostic had been doubling as a bulk export of the whole POR table.

## Task Commits

1. **Task 1: D-14 POR audit through the service layer** — `494a75d` (test, RED) then `24c27aa` (fix, GREEN)
2. **Task 2: AUTH-02 capability contract** — `95e11a2` (test)
3. **Task 3: AUTH-03 taxonomy and POR matrix** — `4e8ddc8` (test)

## Files Created/Modified

- `backend/tests/test_por_audit.py` — created; four tests covering the unrecognised-only report, the empty healthy case, the admin gate and inactive rows.
- `backend/tests/test_capabilities.py` — created; the capability shape/liveness/no-claims trio plus the parametrised POR matrix.
- `backend/app/repositories/repos.py` — added `PORRepository.unrecognised_por_types(recognised)`, filtering with `notin_` in SQL and eager-loading the membership chain the serialiser walks.
- `backend/app/services/auth_service.py` — added `unrecognised_por_assignments()`, which owns the business rule that "recognised" is the union of the two POR sets.
- `backend/app/controllers/auth_controller.py` — `por_audit` now calls the service; the model, session and `joinedload` imports are gone from the function body and the bare `# D-14 audit` comment became a docstring explaining why an unrecognised type presents as silent access loss.
- `backend/tests/test_rbac_predicates.py` — added `test_new_por_types_are_in_both_por_sets`.

## Decisions Made

- **The recognised-POR union lives in the service.** The repository takes the set as a parameter and only asks the database. Which positions confer authority is a business rule, and business rules sit above the persistence layer.
- **No database enum or check constraint on `por_type`.** Explicitly deferred in 02-CONTEXT.md; the audit exists precisely because the column stays free text.
- **`constants.py` was not touched.** Phase 1 already landed both AUTH-03 POR types in both sets correctly. This plan added the proof only, and the mutation check confirms the proof would catch a regression.

## Deviations from Plan

### 1. [Rule 3 - Blocking] Test name changed so the plan's own selector resolves

- **Found during:** Task 2
- **Issue:** The plan's artifact list names the test `test_access_token_carries_no_capability_claims`, but its acceptance criterion requires `pytest -k no_claims` to collect exactly one test. That name does not contain the substring `no_claims`, so the two halves of the plan contradicted each other.
- **Fix:** Named it `test_access_token_carries_no_claims_about_capabilities`, satisfying the selector while keeping the plan's intent.
- **Files modified:** `backend/tests/test_capabilities.py`
- **Verification:** `pytest tests/test_capabilities.py -k no_claims` collects and passes exactly one test.
- **Committed in:** `95e11a2`

### 2. [CLAUDE.md] No AI-attribution trailers on commits

- **Found during:** Task 1
- **Issue:** The executor's default commit format appends `Co-Authored-By: Claude` and a session trailer. The project's CLAUDE.md forbids any AI attribution trailer outright — a past commit carrying one was flagged by graders and blocked deploys.
- **Fix:** Omitted both trailers on all four commits; author is the repo-local `22f1001645` identity as required.
- **Verification:** `git log --format='%an %b'` over this plan's commits shows no trailer.

---

**Total deviations:** 2 (1 Rule 3, 1 CLAUDE.md precedence)
**Impact on plan:** None on scope. Both are naming/metadata corrections; no behaviour changed beyond the planned work.

## Issues Encountered

- **Session visibility across app contexts.** Rows seeded in a test's app context are invisible to a `test_client()` request, which runs in its own context and therefore its own scoped session. The Phase 1 helper `_give_por` only flushes, so every request-driven test here commits explicitly after seeding. Worth knowing for any future test that seeds and then calls an endpoint.
- **Full-suite runtime is ~4m45s** (123 tests). Long enough that it was run in the background rather than inline; the per-module runs are seconds.

## Verification Results

| Check | Result |
|---|---|
| `pytest tests/test_por_audit.py` | 4 passed |
| `pytest tests/test_capabilities.py` | 9 passed (3 + 6 parametrised) |
| `pytest tests/test_rbac_predicates.py -k new_por` | 1 passed |
| `pytest tests/test_capabilities.py -k live` / `-k no_claims` | 1 each |
| `pytest tests/test_rbac_enforcement.py` (Phase 1 url_map gate) | 3 passed |
| `pytest` (full backend suite) | **123 passed** |
| Controller ORM-symbol grep | `0` |
| `git diff --name-only` | no `backend/migrations/`, no `backend/app/constants.py` |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

The `/auth/me` capability payload is now a contract the frontend can build the dashboard shell against, with the guarantee that revoking a POR takes effect on the next request rather than at token expiry. Nothing here should be read as licence to authorize on capabilities: every mutating endpoint keeps the Phase 1 scoped guards, and `tests/test_rbac_enforcement.py` still fails the suite if a new activity- or org-scoped route skips them.

One open thread for a later phase: the audit surfaces unrecognised `por_type` values but nothing yet *notices* them — no alert, no dashboard tile. An admin has to visit the endpoint. If Phase 9's admin analytics grows a health panel, this is the natural feed for it.

## Self-Check: PASSED

All created files present on disk; all four task commits present in git history.

---
*Phase: 02-identity-session-dashboard-shell*
*Completed: 2026-08-12*
