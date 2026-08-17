---
phase: 02-identity-session-dashboard-shell
plan: 05
subsystem: api
tags: [flask, blueprints, marshmallow, alembic, sqlite, audit-log, pytest]

requires:
  - phase: 02-04
    provides: POR taxonomy and the capability contract on the session endpoint
  - phase: 01-04
    provides: revision 213804635519, the academic columns, and the seed.py destructive guard
provides:
  - A routable PATCH /api/v1/admin/users/{id}/academic-status (previously a 404)
  - An admin override that writes a real, attributed audit_log row
  - Marshmallow validation for both academic-status payloads, 422 in the uniform envelope
  - AUTH-04's decoupling proven behaviourally and at source level
  - Migration-safety coverage for the Phase 2 revision on a populated database
affects: [07-progression-gating, 05-organiser-workspace]

actuals:
  tokens: 7300
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Encode structured audit detail as JSON in the existing note column rather than widening the shared audit table"
    - "Negative requirements get a source-level assertion alongside the behavioural one"
    - "Revision metadata read through Alembic ScriptDirectory, never a subprocess"

key-files:
  created:
    - backend/tests/test_academic_status.py
  modified:
    - backend/app/controllers/__init__.py
    - backend/app/controllers/auth_controller.py
    - backend/app/schemas/__init__.py
    - backend/app/services/auth_service.py
    - backend/tests/test_migrations.py

key-decisions:
  - "AuditLog detail is JSON inside the existing note column — the model has no changes column and widening a shared audit table is broader than this phase warrants"
  - "_admin_bp renamed to admin_auth_bp: the leading underscore is what made it read as intentionally unexported and got it skipped"
  - "Enum validation lives only in the Marshmallow schemas; the duplicated tuples in the service were deleted rather than kept as defence in depth, because two allowlists drift"
  - "is_academic_status_stale keeps its fail-open on an empty terms table, now documented and tested rather than incidental"

patterns-established:
  - "A controller module may contribute more than one blueprint, and ALL_BLUEPRINTS carries a comment where it does"
  - "Mutation verification is required before a test counts as evidence"

requirements-completed: [AUTH-04]

coverage:
  - id: D1
    description: "PATCH /api/v1/admin/users/{id}/academic-status is routable and returns 200 for an admin, 403 otherwise"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "backend/tests/test_academic_status.py#test_non_admin_cannot_override"
        status: pass
      - kind: unit
        ref: "app.url_map contains /api/v1/admin/users/<user_id>/academic-status"
        status: pass
    human_judgment: false
  - id: D2
    description: "An admin override writes exactly one attributed audit_log row carrying actor, target, and old/new values for both fields"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "backend/tests/test_academic_status.py#test_admin_override_audit_row_is_attributed_and_complete"
        status: pass
    human_judgment: false
  - id: D3
    description: "Staleness is computed from the terms table, not a rolling window, and survives the seeded date-object row shape"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "pytest tests/test_academic_status.py -k stale"
        status: pass
    human_judgment: false
  - id: D4
    description: "Neither login nor refresh branches on any academic field — a withdrawn, stale user still logs in and refreshes"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "pytest tests/test_academic_status.py -k decoupled"
        status: pass
    human_judgment: false
  - id: D5
    description: "Invalid academic enums are rejected with 422 in the project's error envelope"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "backend/tests/test_academic_status.py#test_invalid_enum_values_are_rejected"
        status: pass
    human_judgment: false
  - id: D6
    description: "A user can still self-confirm after an admin override — an override is a correction, not a lock"
    requirement: AUTH-04
    verification:
      - kind: integration
        ref: "backend/tests/test_academic_status.py#test_user_can_self_confirm_after_an_admin_override"
        status: pass
    human_judgment: false
  - id: D7
    description: "The Phase 2 migration applies on a populated database, downgrades cleanly, keeps a single head, and both new blocklist columns are nullable"
    verification:
      - kind: integration
        ref: "pytest tests/test_migrations.py -q --no-cov"
        status: pass
    human_judgment: false

duration: 52min
completed: 2026-08-12
status: complete
---

# Phase 2 Plan 05: Academic Status & Admin Override Summary

**A previously unreachable admin override endpoint registered, its crashing audit write repaired against the columns that actually exist, and AUTH-04's decoupling promise pinned both behaviourally and at source level**

## Performance

- **Duration:** 52 min
- **Started:** 2026-08-12T16:31:00Z
- **Completed:** 2026-08-12T17:23:00Z
- **Tasks:** 3
- **Files modified:** 6 (1 created, 5 modified)

## Accomplishments

- **Made the admin override reachable at all.** `auth_controller.py` defined `_admin_bp` and hung the override handler on it, but `ALL_BLUEPRINTS` never listed it, so `PATCH /api/v1/admin/users/{id}/academic-status` returned 404 in every environment. Renamed to `admin_auth_bp` and registered, with a comment on the list entry recording that this is the one controller contributing two blueprints — the asymmetry that made it easy to miss.
- **Repaired an audit write that could never have run.** The service constructed `AuditLog(entity_type=..., changes={...})`; the model has neither column, so any override would have raised `TypeError` and D-22's audit trail would have been silently absent. It now uses the six real columns with old and new values encoded as JSON in `note`.
- **Collapsed three copies of the academic enums into one.** Validation moved to `AcademicStatusSchema` / `AdminAcademicOverrideSchema`, both sourcing `validate.OneOf` from `constants`, and the duplicated inline tuples were deleted from the service. Invalid input is now a 422 in the project's envelope instead of a hand-rolled 400.
- **Proved AUTH-04's negative claim two ways.** A withdrawn user with a stale confirmation is driven through login → refresh → `/auth/me`, and the source of `login` and `refresh` is read and asserted to contain no academic identifier. The behavioural half alone would pass against a branch that merely did not fire.
- **Covered the Phase 2 migration on populated data** — single head, correct parent revision, both new columns nullable, values preserved across upgrade, and a clean downgrade — without generating a revision or reopening either batch allowlist.

## Task Commits

1. **Task 1: Register the blueprint, fix the audit write, move validation to Marshmallow** - `531d19a` (fix)
2. **Task 2: Staleness, decoupling and override-audit tests** - `f684471` (test)
3. **Task 3: Extend the migration safety gate to the Phase 2 revision** - `d10b3e6` (test)

**Plan metadata:** see the docs commit accompanying this file.

## Files Created/Modified

- `backend/app/controllers/__init__.py` - Imports and registers `admin_auth_bp`, with a comment on why this entry is easy to miss
- `backend/app/controllers/auth_controller.py` - `_admin_bp` → `admin_auth_bp`; both views load through their schema; the hand-built 404 raises `ApiError`; `UserRepository` moved to module imports
- `backend/app/schemas/__init__.py` - `AcademicStatusSchema` and `AdminAcademicOverrideSchema`, both sourcing enums from `constants`
- `backend/app/services/auth_service.py` - `AuditLog` rebuilt against real columns with a JSON `note`; duplicated enum tuples deleted; `is_academic_status_stale` gains a docstring recording the fail-open
- `backend/tests/test_academic_status.py` - 16 tests covering rows 13, 14 and 15
- `backend/tests/test_migrations.py` - 4 tests appended for row 20; the existing 5 untouched

## Decisions Made

- **Audit detail as JSON in `note`.** `AuditLog` carries `entity`, `entity_id`, `action`, `actor_id`, `actor_name`, `note` and nothing else. Adding a `changes` column would alter a table every module in the app writes to, for one caller's benefit. JSON in `note` round-trips through `json.loads` in the test and leaves the shared table alone.
- **The enum tuples were deleted, not kept as defence in depth.** Two allowlists for one rule drift, and the schema layer is where the project validates. The admin role check in the service was kept, because that is authorization rather than validation and genuinely is defence in depth behind `admin_required`.
- **The fail-open on an empty `terms` table was preserved.** No current term means nobody is nudged rather than everybody. It is now a documented, tested behaviour rather than an accident of control flow.

## Deviations from Plan

None - plan executed exactly as written.

The two mutation verifications the plan mandated were both performed and both revealed something worth recording; see Issues Encountered.

## Issues Encountered

- **My first mutation attempt was silently a no-op.** A `cp` backup failed on an unset `$TMPDIR`, which short-circuited the `&&` chain that applied the mutation, so the test suite ran green against unmutated source. A green mutation run is indistinguishable from a passing test unless you check the file actually changed — I did, caught it, and re-ran properly. Mutation A (making `login` read an academic field) then failed both decoupling tests as intended.
- **My second mutation was red for the wrong reason.** Blanking the audit note by introducing an invalid `_unused=` keyword made the test fail with `TypeError` — which is the *original* bug's failure mode, not the "note is blank" case I meant to probe. Rewritten to keep the `AuditLog` call valid and set `note=""`, it failed with `JSONDecodeError` in the assertion that parses the note, which is the correct signal. The service file was afterwards confirmed byte-identical to its committed state.
- **The seeded-shape staleness test passed rather than exposing a crash.** The plan predicted a latent `date` vs `datetime` comparison failure from `seed.py` inserting `.date()` objects into a `db.DateTime` column. On SQLite, SQLAlchemy converts the stored value back to a `datetime` on read, so the comparison never sees a bare `date`. The test is kept as a guard: the mismatch is real at the schema level and would surface on PostgreSQL or on a change of driver.

## Known Stubs

None.

## Deferred Items

- **`Term.start_date` / `end_date` are `db.DateTime` but `seed.py` writes `date` objects.** Harmless under SQLite today and now guarded by a test, but the column type and the seed disagree. Correcting one to match the other is a small, separate change — a Phase 3 candidate rather than an in-scope fix here.
- **The dev database still has no `terms` rows**, so `academic_status_stale` is `false` for every user and the academic banner does not render locally. This is a seeding gap, not a code defect, and it is **not** destructive to fix: `seed_reference_data()` is idempotent and deliberately bypasses the destructive-reset guard.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AUTH-04 is complete: the override is routable, validated, audited, and reversible by the user.
- Phase 7's progression gating can read `academic_status` knowing every change to it is reconstructable from `audit_log`.
- With 02-05 and 02-07 both landed, all seven Phase 2 plans have summaries.

---
*Phase: 02-identity-session-dashboard-shell*
*Completed: 2026-08-12*

## Self-Check: PASSED

All claimed files exist on disk; all 3 task commits resolve in git history.
