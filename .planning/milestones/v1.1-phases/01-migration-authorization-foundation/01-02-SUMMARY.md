---
phase: 01-migration-authorization-foundation
plan: 02
subsystem: database
tags: [sqlalchemy, schema, partial-unique-index, rbac-data, collaboration, campaign, pytest]

requires:
  - "01-01 — Flask-Migrate wired, NAMING_CONVENTION on db.metadata, baseline revision 312ea9fc2c96"
provides:
  - "7 models: ActivityCollaborator, ActivityTeamMember, ActivityTask, EventScheduleItem, RegistrationFormField, RegistrationFieldResponse, CampaignPackage"
  - "Partial unique index uq_activity_primary_org — exactly one primary collaborating org per Activity"
  - "Partial unique index uq_team_meetup_head — exactly one Meetup Head per Activity, enforced by the database"
  - "Constant vocabularies: TEAM_ROLES, COLLAB_STATES, TASK_STATUSES, CAMPAIGN_STATES, FORM_FIELD_TYPES"
  - "backend/tests/test_schema_spine.py — 6 constraint tests asserting IntegrityError, not service behaviour"
  - "PENDING_BATCH_TABLES in test_migrations.py — a self-retiring allowlist that keeps the drift gate live during the SCHEMA-02 batch window"
affects:
  - "01-03 — declares the remaining 9 tables + 11 columns; must append its tables to PENDING_BATCH_TABLES"
  - "01-04 — emits the single batch revision covering 01-02 + 01-03, and must empty PENDING_BATCH_TABLES in the same commit"
  - "01-05 — is_meetup_head / can_manage_activity read ActivityTeamMember and ActivityCollaborator declared here"
  - "Phase 3 (PROPOSAL-01/02/06), Phase 5 (CAMPAIGN-01..06), Phase 7 (PROG-02)"

actuals:
  tokens: 6900     # chars/4 over the realized 27,517-char diff (estimate was 52,000)
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Partial unique indexes (sqlite_where / postgresql_where) to make an authorization singleton physically impossible to violate"
    - "Attach new child tables to existing parents by db.backref, leaving the parent class byte-identical"
    - "Ordering declared once on the relationship's order_by (position, created_at, id) rather than remembered by each caller"
    - "Import-time assert tying a static SQL literal in a partial-index predicate back to its constant"

key-files:
  created:
    - backend/tests/test_schema_spine.py
  modified:
    - backend/app/constants.py
    - backend/app/models/__init__.py
    - backend/tests/test_migrations.py

key-decisions:
  - "Resolved the 01-01 drift gate vs 01-02 no-migration conflict by scoping the gate to a named, self-retiring batch window rather than by generating a revision or weakening the gate."
  - "activity_collaborators is promoted to the source of truth for activity ownership; activities.org_id survives as a denormalised pointer to the is_primary row (assumption_delta_decision, carried out as planned)."
  - "The uq_team_meetup_head predicate keeps the literal 'Meetup Head' as static SQL, guarded by an import-time assert against TEAM_ROLE_MEETUP_HEAD."
  - "Test helper commits the Activity instead of flushing it, because four tests roll back a deliberate IntegrityError and a flushed row would not survive."

patterns-established:
  - "Authorization-relevant singletons are database constraints, not service checks — and their tests assert IntegrityError so they cannot be satisfied by a service that merely looks correct."
  - "A deliberate gap in a safety gate must carry its own retirement test. PENDING_BATCH_TABLES fails the moment it names an undeclared table or a table already migrated."
  - "Constraint tests cover the positive half too: every singleton test also proves a legitimate sibling row still commits."

requirements-completed: [SCHEMA-02]

coverage:
  - id: D1
    description: "All seven spine tables are importable from app.models and registered in db.metadata"
    requirement: "SCHEMA-02"
    verification:
      - kind: other
        ref: "python -c import of all 7 classes + metadata table check -> 'spine models ok'"
        status: pass
      - kind: unit
        ref: "backend/tests/test_schema_spine.py (all 6 tests build rows on a db.create_all() schema)"
        status: pass
    human_judgment: false
  - id: D2
    description: "An Activity cannot hold two primary collaborating organisations (threat T-01-07)"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "test_schema_spine.py::test_only_one_primary_collaborator_per_activity"
        status: pass
      - kind: other
        ref: "negative control — uq_activity_primary_org removed, test failed 'DID NOT RAISE IntegrityError' at line 91, index restored"
        status: pass
    human_judgment: false
  - id: D3
    description: "An Activity cannot hold two Meetup Head rows; RBAC-03's singleton is enforced at database level (threat T-01-06)"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "test_schema_spine.py::test_only_one_meetup_head_per_activity (incl. the positive half — a Co-Head still commits)"
        status: pass
      - kind: other
        ref: "negative control — uq_team_meetup_head removed, test failed 'DID NOT RAISE' at line 153, index restored"
        status: pass
    human_judgment: false
  - id: D4
    description: "The same org cannot be named twice on one Activity, and the same user cannot hold the same role twice"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "test_same_org_cannot_be_named_twice + test_same_user_can_hold_two_different_roles"
        status: pass
      - kind: other
        ref: "negative control — uq_activity_collaborator removed, test failed 'DID NOT RAISE' at line 129"
        status: pass
    human_judgment: false
  - id: D5
    description: "Ordered collections carry `position` and their relationships declare order_by, so equal positions still resolve to a stable order"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "test_ordered_collections_break_ties_deterministically — two expire_all()-separated reads return identical id lists"
        status: pass
      - kind: other
        ref: "Activity.tasks.property.order_by resolved to (position, created_at, id) after configure_mappers()"
        status: pass
    human_judgment: false
  - id: D6
    description: "No Phase 3+ business constant (budget ceiling, Mega-Meetup threshold, fest minimum, custom-field cap) was introduced"
    verification:
      - kind: other
        ref: "constants.py diff is 45 insertions / 0 deletions, all enum vocabularies; thresholds recorded as comments naming their owning phase"
        status: pass
    human_judgment: false
  - id: D7
    description: "Adding tables changed no existing behaviour and generated no migration"
    verification:
      - kind: unit
        ref: "pytest -q — 50 passed before, 57 after (50 + 6 spine + 1 batch-window guard), exit 0"
        status: pass
      - kind: other
        ref: "ls backend/migrations/versions/*.py | wc -l -> 1 (still only the 01-01 baseline)"
        status: pass
    human_judgment: false

duration: 35min
completed: 2026-08-06
status: complete
---

# Phase 01 Plan 02: Proposal-to-Campaign Schema Spine Summary

**The seven tables carrying a proposal from multi-entity collaboration to a live campaign are declared, with the two authorization singletons — one primary organisation and one Meetup Head per Activity — made physically impossible to violate by partial unique indexes rather than by service convention.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-08-06
- **Tasks:** 3 of 3, all autonomous (no checkpoints in this plan)
- **Files:** 4 (1 created, 3 modified) + 1 deferred-items entry
- **Estimate accuracy:** 52,000 tokens estimated, ~6,900 actual (chars/4 over a 27,517-char diff). The estimate was ~7.5x high — this plan was pure declarative schema with no service, controller, or integration surface, so there was little to iterate on.

## Exact names created (for 01-04's revision review and 01-05's predicates)

Recorded verbatim so no later plan has to guess. Names shown as they appear in `db.metadata`.

| Table | Explicit constraints / indexes |
|---|---|
| `activity_collaborators` | `uq_activity_collaborator` (UniqueConstraint: activity_id, org_id) · **`uq_activity_primary_org`** (partial UNIQUE index on activity_id WHERE is_primary) |
| `activity_team_members` | `uq_team_member_role` (UniqueConstraint: activity_id, user_id, role) · **`uq_team_meetup_head`** (partial UNIQUE index on activity_id WHERE role = 'Meetup Head') |
| `activity_tasks` | none beyond convention-derived PK/FK/index |
| `event_schedule_items` | none beyond convention-derived PK/FK/index |
| `registration_form_fields` | `uq_form_field_label` (UniqueConstraint: activity_id, label) |
| `registration_field_responses` | `uq_field_response` (UniqueConstraint: registration_id, field_id) |
| `campaign_packages` | `uq_campaign_packages_activity_id` (convention-derived, from `unique=True`) · `ix_campaign_packages_registration_slug` (UNIQUE index) |

New `Activity` backrefs (added without editing the `Activity` class): `collaborators`, `team_members`, `tasks`, `schedule_items`, `form_fields`, `campaign` (`uselist=False`).
New `Registration` backref: `field_responses`.

Constants added: `TEAM_ROLE_MEETUP_HEAD`, `TEAM_ROLES` (8) · `COLLAB_PENDING/ACCEPTED/DECLINED`, `COLLAB_STATES` · `TASK_TODO/IN_PROGRESS/DONE`, `TASK_STATUSES` · `CAMPAIGN_DRAFT/PENDING_APPROVAL/LIVE`, `CAMPAIGN_STATES` · `FORM_FIELD_TEXT/DROPDOWN`, `FORM_FIELD_TYPES`.

## Accomplishments

- **Both singletons are enforced by the database, and proven so by negative control.** Removing `uq_activity_primary_org` and `uq_team_meetup_head` from the models made the corresponding tests fail with `DID NOT RAISE <class 'sqlalchemy.exc.IntegrityError'>` at lines 91 and 153; restoring them returned the suite to green. The tests are not vacuous — they would catch a schema that merely looked right.
- **The positive half is asserted too.** A constraint that blocks legitimate rows is as broken as one that permits illegitimate ones, so `test_only_one_meetup_head_per_activity` also proves a `Co-Head` for a different user still commits, and `test_only_one_primary_collaborator_per_activity` proves a second *non-primary* collaborator (the normal multi-entity case) still commits.
- **Ordering is structural, not remembered.** `Activity.tasks.property.order_by` resolves to `(position, created_at, id)` after `configure_mappers()`, and two `expire_all()`-separated reads of three schedule items — two of them tied at position 1 — return identical id lists with the position-0 item first.
- **`Activity` and `Registration` are byte-identical.** The whole 304-line models diff is insertions only (`git diff --numstat` → `304  0`; zero lines beginning with `-`). All new wiring rides on `db.backref`, following the `Announcement` precedent.
- **No migration was generated.** `ls backend/migrations/versions/*.py | wc -l` still returns 1. SCHEMA-02's "one batch, not per-feature" promise is intact.
- **No Phase 3+ policy numbers leaked in.** Budget ceilings, the Mega-Meetup threshold, the fest collaborator minimum and the custom-field cap are all absent; where the vocabulary implies them, a comment names the phase that owns the number instead.

## Task Commits

1. **Task 1: Team / collaborator / task / campaign / form vocabularies** — `66cf4da` (feat)
2. **Task 2: The seven spine models** — `ac6be56` (feat)
3. **Task 3: Constraint tests for the singletons and the ordering tie-break** — `f719dcb` (test)

## Decisions Made

- **The drift gate was scoped, not disabled or satisfied.** See the deviation below. The alternatives were to generate a revision (breaking SCHEMA-02's one-batch promise, which this plan exists to keep) or to skip/xfail the drift test (creating a hole with no expiry). A named allowlist with its own retirement test keeps the gate live for every table outside the deliberate batch window.
- **`uq_team_meetup_head` keeps the literal `'Meetup Head'` in its predicate.** A partial-index predicate must be static SQL, not a bound parameter. To stop the literal silently diverging from `TEAM_ROLE_MEETUP_HEAD` — which would leave the index enforcing a role no longer used, i.e. not enforcing RBAC-03 at all — a module-level `assert` ties the two together and fails at import time.
- **The test helper commits the Activity rather than flushing it.** The plan said flush; four tests roll back a deliberate `IntegrityError`, and a flushed-but-uncommitted Activity would be discarded by that rollback, breaking every assertion after it.
- **`ActivityTeamMember.user` declares `foreign_keys=[user_id]`.** The table has two FKs to `users` (`user_id`, `added_by`), so the relationship is ambiguous without it.

## Deviations from Plan

### 1. [Rule 3 - Blocking] The 01-01 drift gate had to be scoped to the SCHEMA-02 batch window

- **Found during:** Task 2
- **Issue:** Plan 01-01 installed `test_models_match_migrations_no_drift`, which fails on any model declared without a migration. This plan is required *not* to generate one (01-04 owns the single batch revision) while its own acceptance criteria require `pytest -q` to exit 0. Adding the seven models failed two tests: `test_upgrade_from_empty_creates_full_schema` and `test_models_match_migrations_no_drift`. 01-01's own summary predicted this exact collision.
- **Fix:** Added `PENDING_BATCH_TABLES` to `backend/tests/test_migrations.py` — a frozenset naming exactly the seven tables this plan declares — and filtered both tests against it. Added `test_pending_batch_list_is_accurate`, which fails if the list names a table no model declares, **or** if it still names a table the migration chain has already created. That second assertion is what forces plan 01-04 to empty the list in the same commit as the batch revision, so the gap cannot outlive its purpose.
- **Why not just generate the migration:** it would defeat the single requirement (SCHEMA-02) this plan exists to satisfy, and the orchestrator's brief for this plan forbids it explicitly.
- **Verification:** three negative controls, each reverted afterwards — (a) removing `campaign_packages` from the list made both gates fire, naming that table; (b) adding a table no model declares tripped the accuracy guard at line 238; (c) adding an already-migrated table (`users`) tripped it at line 244. Full suite green afterwards.
- **Files modified:** `backend/tests/test_migrations.py` (+66/-2 — outside the plan's declared `files_modified`)
- **Committed in:** `ac6be56`

### 2. [Rule 2 - Missing critical safeguard] Import-time guard on the Meetup Head literal

- **Found during:** Task 2
- **Issue:** The plan asks for `TEAM_ROLE_MEETUP_HEAD` to be imported and referenced only in a docstring, while the index predicate hard-codes `'Meetup Head'`. A docstring is not a reference — the import would be dead, and worse, editing the constant later would leave the index enforcing uniqueness on a role string nothing writes any more. The RBAC-03 singleton would silently stop being enforced, with no test failing.
- **Fix:** A module-level `assert TEAM_ROLE_MEETUP_HEAD == "Meetup Head"` immediately after the class, with a message naming the predicate to update. This makes the import load-bearing and turns a silent security regression into an import-time failure.
- **Committed in:** `ac6be56`

---

**Total deviations:** 2 (1× Rule 3, 1× Rule 2)
**Impact on plan:** No change to scope, schema shape, or any name another plan depends on. Deviation 1 touches a file outside `files_modified`, which is recorded above and flagged to 01-03 and 01-04 in "Notes for Next Plan".

## Issues Encountered

- **`pytest`'s final summary line is not reaching stdout on this Windows shell.** The progress dots and exit code are reliable, and `-v` output shows the count correctly, so pass/fail counts in this summary were read from the dot line (`57` dots) and from `-v` runs. Cosmetic; noted because it makes `grep "passed"` an unreliable verification idiom in this environment.
- **No `.venv` at `backend/.venv`** — still the global Python 3.12.10, unchanged from 01-01. Flagged again only because `backend/README.md` documents a venv workflow nobody is using.

## Known Stubs

None. Every column declared here is either written by a future phase's service (documented in the owning class's docstring) or has a working default. No placeholder values, TODO markers, or unwired data paths were introduced.

## Threat Flags

None new. The plan's own register was implemented as specified, and the two high-severity Elevation-of-Privilege entries are now database constraints with negative-control-verified tests:

| Threat | Disposition | Where it landed |
|---|---|---|
| T-01-06 (two Meetup Heads) | mitigated | `uq_team_meetup_head` + `test_only_one_meetup_head_per_activity` + import-time constant guard |
| T-01-07 (two primary orgs) | mitigated | `uq_activity_primary_org` + `test_only_one_primary_collaborator_per_activity` |
| T-01-08 (unilateral collaborator claim) | mitigated | `status` defaults to `COLLAB_PENDING`; `responded_by` / `responded_at` present for Phase 3's consent flow |
| T-01-09 (campaign live without approval) | mitigated | `approved_by` / `approved_at` kept separate from `pushed_live_at`, so the gate is auditable after the fact |
| T-01-10 (poster path traversal) | transferred | `poster_name` stores a name only, per the `Expense.bill_name` precedent; Phase 5 owns storage and sanitisation |
| T-01-11 (unattributable rows) | mitigated | `created_by`, `invited_by`, `added_by`, `responded_by` declared where a row represents a decision |

## Verification

| Plan verification step | Result |
|---|---|
| 1. `pytest tests/test_schema_spine.py -v` | 6 passed, exit 0 |
| 2. `pytest -q` full suite | 57 passed (50 baseline + 6 spine + 1 batch-window guard), exit 0, 90% coverage |
| 3. `ls backend/migrations/versions/*.py \| wc -l` | 1 — no revision generated, as required |
| 4. `git diff --numstat` on models + constants | `304  0` and `45  0` — insertions only, zero deletions |
| Task 1 assertion command | prints `constants ok`; `grep -c "Volunteer Coordinator"` → 1 |
| Task 2 assertion command | prints `spine models ok`; both partial indexes present in metadata |
| `grep -c "def to_dict"` on models | 15 → 22 (+7, one per new model) |
| `grep -c "class Activity(Base)"` | 1 |
| `grep -c "def test_"` / `grep -c "IntegrityError"` on the spine tests | 6 / 8 (criteria: 6 and ≥4) |

## Deferred Items

Logged to `.planning/phases/01-migration-authorization-foundation/deferred-items.md`:

- **Needs a decision before 01-04 writes the revision.** The convention-derived FK name `fk_registration_field_responses_field_id_registration_form_fields` is 65 characters, over PostgreSQL's 63-byte identifier limit. It is the only name in the entire schema over the limit, so truncation cannot collide, and SQLite is unaffected — but renaming it is free now and an `ALTER TABLE ... RENAME CONSTRAINT` after the revision exists.

## Notes for Next Plan

- **01-03 must append its new tables to `PENDING_BATCH_TABLES`** in `backend/tests/test_migrations.py`, or the drift gate will fail the suite. If 01-03 adds *columns* to existing tables, `_entry_table()` already resolves `add_column` entries to their table name, so listing the table covers its columns too — but a column added to a table that is otherwise fully migrated (e.g. `users`) cannot be allowlisted without opening a hole in that whole table. Prefer extending the filter to a `(table, column)` pair at that point rather than listing `users`.
- **01-04 must empty `PENDING_BATCH_TABLES` in the same commit as the batch revision.** `test_pending_batch_list_is_accurate` will fail until it does — that is deliberate.
- **01-04: settle the 65-character FK name before autogenerating**, per Deferred Items.
- **01-05 reads `ActivityTeamMember.role == TEAM_ROLE_MEETUP_HEAD` scoped by `activity_id`** for `is_meetup_head`, and `ActivityCollaborator` (with `activities.org_id` as the denormalised fallback pointer) for `can_manage_activity`. Both are single-row lookups by the indexed `activity_id`. Note that no `is_meetup_head` name was defined on the model, so 01-05 owns that name cleanly.
- **Phase 3 owns writing both sides of the ownership pair.** `activity_collaborators` is the source of truth; `activities.org_id` must always equal the `org_id` of the `is_primary` row. Nothing enforces that cross-table equality today — it is a service invariant, and a candidate for a consistency test when PROPOSAL-01 lands.

## Self-Check: PASSED

All claimed files exist on disk and all three claimed commits exist in `git log`:

- `backend/app/constants.py` — FOUND
- `backend/app/models/__init__.py` — FOUND
- `backend/tests/test_migrations.py` — FOUND
- `backend/tests/test_schema_spine.py` — FOUND
- Commit `66cf4da` — FOUND
- Commit `ac6be56` — FOUND
- Commit `f719dcb` — FOUND
