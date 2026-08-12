---
phase: 01-migration-authorization-foundation
plan: 04
subsystem: database
tags: [alembic, flask-migrate, batch-migration, sqlite, seed, safety-guard, idempotence, pytest]

requires:
  - "01-01 — Flask-Migrate wired with render_as_batch=True, NAMING_CONVENTION on db.metadata, baseline revision 312ea9fc2c96"
  - "01-02 — 7 spine tables + PENDING_BATCH_TABLES allowlist"
  - "01-03 — 9 identity/close-out tables + 11 columns + PENDING_BATCH_COLUMNS allowlist"
provides:
  - "Revision 213804635519 — the single milestone v1.1 batch: 16 create_table + 11 add_column, chained onto the baseline"
  - "A LIVE development database at backend/instance/ekatva.db carrying all 34 application tables (35 with alembic_version)"
  - "require_dev_database() — refuses any non-SQLite scheme and any SQLite file outside backend/, with no override of any kind"
  - "reset_destructive() — drop_all + explicit alembic_version drop + flask_migrate.upgrade(), never create_all()"
  - "seed_reference_data() — idempotent get-or-create for 12 Houses / 10 Regions / 46 Cities, deliberately unguarded"
  - "seed_demo_data(), main() with --reference-only"
  - "backend/tests/test_seed_guard.py (8 tests), backend/tests/test_schema_batch.py (3 tests)"
  - "PENDING_BATCH_TABLES and PENDING_BATCH_COLUMNS emptied — the drift gate covers the ENTIRE schema again with zero exceptions"
  - "backend/README.md 'Database migrations & seeding' section"
affects:
  - "01-05 — runs against a live migrated database; its RBAC predicates read tables that now physically exist"
  - "Every later phase (2-8) — picks up the milestone schema with `flask db upgrade`, never another reseed"

actuals:
  tokens: 15600    # chars/4 over the realized 62,370-char diff (estimate was 58,000)
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "One batch revision per milestone, read line-by-line against recorded name lists before `flask db upgrade` runs it"
    - "Destructive operations gated on the RESOLVED database URI, with no environment override and a test asserting none exists"
    - "A destructive reset rebuilds through the migration chain, never through create_all(), so alembic_version stays truthful"
    - "Get-or-create on natural keys wherever the database has no unique constraint to fall back on"
    - "Path containment checks written for both POSIX and Windows conventions, because Path.is_absolute() is platform-dependent"

key-files:
  created:
    - backend/migrations/versions/213804635519_milestone_v1_1_batch_16_tables_11_.py
    - backend/tests/test_seed_guard.py
    - backend/tests/test_schema_batch.py
  modified:
    - backend/seed.py
    - backend/app/models/__init__.py
    - backend/tests/test_migrations.py
    - backend/README.md

key-decisions:
  - "Settled 01-02's deferred 65-character FK name by naming it explicitly in the model BEFORE autogenerate ran — the last moment it was free, since the table had not been migrated yet."
  - "Emptied both PENDING_BATCH_TABLES and PENDING_BATCH_COLUMNS in the same commit as the batch revision, retiring the deliberate hole in the drift gate exactly as 01-02 and 01-03 designed it to be retired."
  - "The dev guard resolves EVERY SQLite path and requires containment in backend/, rather than only checking paths that look absolute — a relative path can escape via '../..' just as well."
  - "Demo-only organisations (Rhythm Dance Society, Student Executive Council) moved into seed_demo_data rather than reference data, so a real deployment seeded with --reference-only does not acquire a fake dance society."
  - "Guard tests set the database URI on an already-built app instead of through a Config subclass, because create_app builds the engine eagerly and a Postgres URI dies on a missing driver before the guard is reached."

patterns-established:
  - "A safety guard is only real if a test proves it fails when removed. The scheme check was disabled, three tests failed with DID NOT RAISE, and it was restored."
  - "A test that names a non-existent bypass variable (EKATVA_ALLOW_DESTRUCTIVE_RESET) is how you stop someone adding one later."
  - "Schema existence is proven by inspecting the live file database, not by passing pytest — the suite builds its own schema and would pass either way."

requirements-completed: [SCHEMA-02, SCHEMA-03]

coverage:
  - id: D1
    description: "Exactly one new revision covers the whole milestone batch, chained onto the baseline, with exactly one head"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "tests/test_schema_batch.py::test_exactly_one_migration_head + ::test_exactly_two_revisions"
        status: pass
      - kind: integration
        ref: "ls migrations/versions/*.py | wc -l -> 2; flask db heads -> 213804635519 (head), single line"
        status: pass
    human_judgment: false
  - id: D2
    description: "The LIVE backend/instance/ekatva.db physically contains all 34 tables, all 16 new ones, all 11 new columns and all 4 named indexes"
    requirement: "SCHEMA-02"
    verification:
      - kind: integration
        ref: "SQLAlchemy inspector against the live engine (url confirmed as backend\\instance\\ekatva.db) -> 'LIVE schema ok: 35 tables'"
        status: pass
    human_judgment: false
  - id: D3
    description: "A fresh/empty database reaches the full schema in one upgrade, and a second upgrade is a no-op"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "tests/test_schema_batch.py::test_fresh_database_upgrades_to_full_schema_in_one_run"
        status: pass
      - kind: integration
        ref: "flask db upgrade run twice on the dev database, both exit 0, second ran 0 revisions"
        status: pass
    human_judgment: false
  - id: D4
    description: "The 11 columns applied to a POPULATED database without rejecting a row, and the two server_defaults backfilled truthfully"
    requirement: "SCHEMA-02"
    verification:
      - kind: integration
        ref: "post-upgrade query on the live db — 3 pre-existing attendance rows all read method='manual'; 7 users and 8 registrations survived four batch table-copies"
        status: pass
    human_judgment: false
  - id: D5
    description: "The destructive path refuses every non-SQLite scheme and any SQLite file outside backend/"
    requirement: "SCHEMA-03"
    verification:
      - kind: unit
        ref: "test_guard_refuses_postgres_url + test_guard_refuses_mysql_url + test_guard_refuses_sqlite_file_outside_the_backend_tree"
        status: pass
      - kind: other
        ref: "negative control — scheme check disabled, three tests failed with 'DID NOT RAISE SystemExit', check restored, seed.py byte-identical afterwards"
        status: pass
    human_judgment: false
  - id: D6
    description: "No environment variable can re-enable the destructive path, and an unset DATABASE_URL is still allowed"
    requirement: "SCHEMA-03"
    verification:
      - kind: unit
        ref: "test_guard_cannot_be_bypassed_by_environment (3 permissive vars incl. an invented override, plus app.debug/TESTING) + test_guard_allows_unset_database_url_default"
        status: pass
      - kind: other
        ref: "source assertion — require_dev_database contains SQLALCHEMY_DATABASE_URI and none of FLASK_ENV / FLASK_DEBUG / os.getenv / os.environ / app.debug"
        status: pass
    human_judgment: false
  - id: D7
    description: "Reference data is idempotent and unguarded; demo data is guarded"
    requirement: "SCHEMA-03"
    verification:
      - kind: unit
        ref: "test_reference_data_is_idempotent (counts AND distinctness) + test_reference_data_does_not_consult_the_dev_guard + test_demo_data_does_consult_the_dev_guard"
        status: pass
      - kind: integration
        ref: "python seed.py --reference-only after a full seed -> 'houses +0 (12 already present), regions +0 (10), cities +0 (46)'"
        status: pass
    human_judgment: false
  - id: D8
    description: "The destructive reset leaves alembic_version consistent with the schema"
    requirement: "SCHEMA-03"
    verification:
      - kind: integration
        ref: "after a full reseed: exactly one alembic_version row = 213804635519, and the immediately following flask db upgrade ran 0 revisions"
        status: pass
      - kind: other
        ref: "AST assertion — reset_destructive calls db.drop_all + alembic_upgrade and never calls create_all"
        status: pass
    human_judgment: false
  - id: D9
    description: "The drift gate is live again for the entire schema, with no allowlisted exceptions"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "test_models_match_migrations_no_drift + test_pending_batch_list_is_accurate, both passing with PENDING_BATCH_TABLES and PENDING_BATCH_COLUMNS empty"
        status: pass
    human_judgment: false
  - id: D10
    description: "The seeded world is unchanged by the restructure"
    verification:
      - kind: integration
        ref: "python seed.py -> 'Users: 7  Activities: 3  Registrations: 8  Expenses: 2' — identical to the pre-restructure output recorded in 01-01's summary"
        status: pass
      - kind: unit
        ref: "pytest -q — 64 passed before this plan, 75 after (64 + 11 new), exit 0"
        status: pass
    human_judgment: false

duration: 30min
completed: 2026-08-06
status: complete
---

# Phase 01 Plan 04: Schema Push & Guarded Seed Summary

**The milestone schema stopped being a Python declaration and became a real database: one revision, `213804635519`, created all 16 tables and 11 columns in a single batch, and a SQLAlchemy inspector confirms all 34 tables physically exist in `backend/instance/ekatva.db` — while `seed.py` can no longer destroy anything that is not a local SQLite development file, with no environment variable able to say otherwise.**

## Performance

- **Duration:** ~30 min
- **Completed:** 2026-08-06
- **Tasks:** 3 of 3, all autonomous (no checkpoints in this plan)
- **Files:** 7 (3 created, 4 modified)
- **Estimate accuracy:** 58,000 tokens estimated, ~15,600 actual (chars/4 over a 62,370-char diff). ~3.7x high — the same direction as 01-02 (7.5x) and 01-03 (5x), but noticeably closer, because this plan had real execution surface (running migrations, reseeding, debugging a guard) rather than being pure declaration. Three plans now agree the estimator overshoots schema work in this codebase; the overshoot shrinks as the plan gets more operational.

## The batch revision

**Revision id: `213804635519`** — "milestone v1.1 batch: 16 tables, 11 columns", `down_revision = '312ea9fc2c96'`.

It was read end to end before `flask db upgrade` was allowed to touch anything, and checked line by line against the name tables recorded in the 01-02 and 01-03 summaries rather than against memory. What the review confirmed:

| Check | Result |
|---|---|
| `op.create_table` count | 16, matching the expected list exactly, no extras |
| `add_column` count | 11, every one rendered inside `op.batch_alter_table` (so `render_as_batch=True` took effect) |
| `uq_team_meetup_head` | present **with** `sqlite_where` / `postgresql_where` on `role = 'Meetup Head'` |
| `uq_activity_primary_org` | present **with** `sqlite_where='is_primary = 1'` / `postgresql_where='is_primary'` |
| `ix_event_query_cursor`, `ix_announcement_cursor` | both present |
| `reports.status` / `attendance.method` | both rendered with their `server_default` (`'submitted'` / `'manual'`) |
| `drop_table` / `drop_column` in `upgrade()` | **zero** (they appear only in `downgrade()`, which is correct) |

**No hand-correction of the generated DDL was required.** Alembic preserved both partial-index predicates and both server defaults on its own. This was the plan's single biggest risk — a silently dropped WHERE predicate would have removed the Meetup Head and primary-org singletons without any test noticing, because the constraint tests from 01-02 run against a `create_all()` schema, not against the migration. The predicates are also confirmed present in the live database by inspector.

**Final live table count: 35** — 34 application tables plus `alembic_version`.

## Accomplishments

- **The schema-push gate actually ran, and the evidence is from the live file.** The inspector was opened against the real engine (URL confirmed as `...\backend\instance\ekatva.db`) and asserted all 16 new tables, all 11 new columns and all four named indexes. `pytest` alone could never have shown this: the suite builds its schema with `db.create_all()` on an in-memory database and passes identically whether or not a migration ever ran. This distinction is the whole reason the task was marked [BLOCKING].
- **The upgrade was applied to a database with real rows in it, and nothing was lost.** The three pre-existing `attendance` rows all came out reading `method='manual'`, which is the `server_default` doing exactly the backfill 01-03 designed it for, and 7 users / 8 registrations survived four separate SQLite batch table-copies. This is ROADMAP Phase 1 criterion 1 demonstrated on real data rather than on a probe row.
- **`flask db upgrade` is genuinely idempotent.** Run twice back to back, both exit 0 and the second performs zero revisions. Run again after a full destructive reseed, it still performs zero revisions — which is the proof that the reset left `alembic_version` and the schema in agreement.
- **The guard cannot be talked out of it.** `test_guard_cannot_be_bypassed_by_environment` sets `FLASK_ENV=development`, `FLASK_DEBUG=1`, an invented `EKATVA_ALLOW_DESTRUCTIVE_RESET=1`, `app.debug = True` and `TESTING = True`, and the Postgres URL is still refused with exit code 1. A companion source assertion rejects any reference to the environment appearing in the guard later.
- **The guard was proven non-vacuous.** With the scheme check disabled, all three refusal tests failed with `DID NOT RAISE SystemExit`. The check was restored and `git diff backend/seed.py` is empty against the committed version.
- **The drift gate is fully live again.** Both `PENDING_BATCH_TABLES` and `PENDING_BATCH_COLUMNS` are now empty frozensets. 01-02 and 01-03 deliberately opened that hole and built `test_pending_batch_list_is_accurate` to fail until this commit closed it; it closed cleanly, and the gate now covers all 34 tables with zero exceptions.
- **The seeded world is byte-identical in outcome.** `Users: 7  Activities: 3  Registrations: 8  Expenses: 2` — the same four numbers 01-01 recorded before any of this. The restructure moved code between functions; it did not redesign the demo data.

## Task Commits

1. **Task 1: [BLOCKING] Generate and apply the one-batch migration** — `d463b2b` (feat)
2. **Task 2: Split seed.py into a guarded reset and an idempotent reference seeder** — `90c479b` (feat)
3. **Task 3: Tests for the guard, idempotence and the one-batch invariant** — `09cf479` (test)

## Decisions Made

- **The deferred 65-character FK name was settled before autogenerate, not after.** `fk_registration_field_responses_field_id_registration_form_fields` is 65 characters, over PostgreSQL's 63-byte identifier limit. Both 01-02 and 01-03 flagged it as needing 01-04's decision *before* the revision existed, and they were right: naming it explicitly in the model was a one-line edit while the table was unmigrated, and would have been an `ALTER TABLE ... RENAME CONSTRAINT` plus a follow-up revision afterwards. It is now `fk_registration_field_responses_field_id` (39 chars). Every identifier in the schema is now under the limit; the longest remaining is 61.
- **Reference data excludes the demo-only organisations.** The plan's line-range description put "Rhythm Dance Society" and "Student Executive Council" inside the reference block, but they exist only to host the three seeded demo activities. `seed_reference_data()` is explicitly meant to be safe to run against a real deployment, and a real deployment acquiring a fake dance society is not reference data. They moved into `seed_demo_data()`. This does not affect any asserted count (the verify command counts `type='house'`, `type='region'` and cities).
- **The path containment check resolves every path, not just absolute-looking ones.** A relative SQLite path can escape the project via `../../prod.db` just as effectively as an absolute one. Relative paths are resolved against `app.instance_path` (which is what Flask does) and then required to sit inside `backend/`. `sqlite:///../../prod.db` is refused.
- **`--reference-only` skips the guard entirely, by design.** It creates no accounts and drops nothing. ROADMAP Phase 1 success criterion 2 requires reference data to be seedable anywhere, and a test asserts the guard is absent from that function so nobody "hardens" it later and breaks that.

## Deviations from Plan

### 1. [Rule 2 - Missing critical fix] The 65-character FK name was renamed before autogenerate

- **Found during:** Task 1, precondition work
- **Issue:** Carried forward from 01-02's `deferred-items.md` and re-flagged by 01-03 as "still needs 01-04's decision before autogenerate runs". The convention-derived name exceeded PostgreSQL's 63-byte limit, so the production store would have silently truncated it, leaving Alembic unable to address the constraint by name in any later revision.
- **Fix:** An explicit `name="fk_registration_field_responses_field_id"` on the `ForeignKey` in `RegistrationFieldResponse`, with a comment recording why. Verified every constraint and index name in `db.metadata` is now ≤ 63 bytes (longest: 61).
- **Files modified:** `backend/app/models/__init__.py` (outside this plan's declared `files_modified`)
- **Committed in:** `d463b2b`

### 2. [Rule 3 - Blocking] Both batch-window allowlists had to be emptied for the suite to pass

- **Found during:** Task 1
- **Issue:** `test_pending_batch_list_is_accurate` fails once a listed table or column reaches the migration chain — deliberately, so the deliberate hole in the drift gate could not outlive its purpose. Task 1's acceptance criteria require `pytest -q` to exit 0, so this had to happen in the same commit as the revision. Exactly as 01-02 and 01-03 predicted.
- **Fix:** `PENDING_BATCH_TABLES` and `PENDING_BATCH_COLUMNS` are now empty frozensets, with a comment recording that the window is closed and that re-populating either set reopens a hole that the accuracy test will force closed again.
- **Files modified:** `backend/tests/test_migrations.py` (outside this plan's declared `files_modified`, same as 01-02's and 01-03's equivalent deviations)
- **Committed in:** `d463b2b`

### 3. [Rule 1 - Bug] The path containment check silently did nothing on Windows

- **Found during:** Task 2, sanity-checking the guard before committing
- **Issue:** My first version used `Path(database).is_absolute()` to decide whether to check containment. On Windows, `Path('/var/lib/prod.db').is_absolute()` returns **False** because the string carries no drive letter — so `sqlite:////var/lib/prod.db` was accepted as a resettable development database. A guard that quietly stops enforcing on one platform while still reading like protection is worse than no guard, and this is the platform the whole team is on.
- **Fix:** `_is_absolute_path()` tests both conventions explicitly (leading `/`, leading `\`, a `PureWindowsPath` drive, or `PurePosixPath.is_absolute()`), and every path — absolute or not — is resolved and required to live inside `backend/`. `test_guard_refuses_sqlite_file_outside_the_backend_tree` covers both forms permanently.
- **Verification:** all five hostile URIs now refuse with exit 1 (`postgresql://`, `mysql://`, `sqlite:////var/lib/prod.db`, `sqlite:///C:/Windows/Temp/prod.db`, `sqlite:///../../prod.db`); the SQLite default and `:memory:` are still allowed.
- **Committed in:** `90c479b`

### 4. [Rule 3 - Blocking] Guard tests set the URI on a built app, not through a Config subclass

- **Found during:** Task 3
- **Issue:** The plan specifies building a `Config` subclass with a Postgres URI and passing it to `create_app`. Flask-SQLAlchemy builds the engine inside `db.init_app()`, which imports the DBAPI driver — so `create_app` raised `ModuleNotFoundError: No module named 'psycopg2'` before `require_dev_database` was ever called. The plan's own instruction says these tests must not depend on a Postgres server existing; they must not depend on a Postgres *driver* existing either.
- **Fix:** `_app_with_uri()` builds the app with `TestConfig` and then sets `app.config["SQLALCHEMY_DATABASE_URI"]`. The guard reads that key at call time, so this is exactly the value it inspects in production, and the docstring records why the indirection exists.
- **Note for production behaviour:** where `psycopg2` IS installed (a real deployment), `create_app` succeeds and the guard fires normally — which is the environment that matters. Where it is not, `seed.py` fails earlier with an import error, which is also a refusal, just a less legible one.
- **Committed in:** `09cf479`

### 5. [Rule 2 - Additional coverage] Eight guard tests instead of six

- **Found during:** Task 3
- **Issue:** The plan names six behaviours. Two more were warranted: the SQLite-outside-the-tree refusal (which is a real branch of the guard, and the branch that carried the Windows bug in deviation 3), and the positive assertion that `seed_demo_data` *does* consult the guard — the other half of the "reference unguarded / demo guarded" rule, without which only one direction is locked down.
- **Impact:** The acceptance criterion said 6 tests; there are 8, a superset covering all six named behaviours. `test_schema_batch.py` has exactly the specified 3.
- **Committed in:** `09cf479`

---

**Total deviations:** 5 (1× Rule 1, 2× Rule 3, 2× Rule 2)
**Impact on plan:** No change to schema shape, no change to any name another plan depends on, no scope creep. Deviations 1 and 2 were both explicitly handed to this plan by its predecessors. Deviation 3 is the only genuine defect found, and it was found and fixed before the code was committed.

## Issues Encountered

- **`flask` is not on PATH in this shell**, though `python -m flask` works and resolves the same CLI. Every plan command written as `flask db ...` was run as `python -m flask db ...`. No behavioural difference; flagged because `backend/README.md` documents the bare `flask` form, which is correct for a shell with the venv activated (this environment still has no `backend/.venv` — carried over from 01-01 and 01-02).
- **`pytest`'s final summary line still does not reach stdout on this Windows shell** (carried over from 01-02 and 01-03). Counts were read from the progress-dot line in a redirected log file and from `-v` runs; exit codes are reliable throughout.
- **The dev database was backed up to the session scratchpad before the migration ran.** It was not needed — the upgrade applied cleanly on the first attempt — but the alternative was an irreversible operation on the only copy of the demo world.

## Known Stubs

None. No placeholder values, TODO markers, or unwired data paths were introduced. `seed.py` creates no rows in any of the 16 new tables, which is deliberate and permitted (01-03's notes: "01-04's seed data can now populate the new tables, but nothing requires it to") — an empty new table is an empty table, not a stub.

## Threat Flags

None new. This plan adds no network endpoint and no auth path. Its own register was implemented as specified:

| Threat | Disposition | Where it landed |
|---|---|---|
| T-01-19 (destructive path against production) | mitigated | `require_dev_database` refuses any non-SQLite scheme and any SQLite file outside `backend/`, before a connection is opened; three refusal tests, negative-control verified |
| T-01-20 (guard bypass via environment) | mitigated | guard reads only `SQLALCHEMY_DATABASE_URI`, has no override parameter; `test_guard_cannot_be_bypassed_by_environment` sets three permissive variables including an invented override name, plus a source assertion banning `os.getenv` / `os.environ` / `app.debug` from the function |
| T-01-21 (stale or absent `alembic_version` after a reset) | mitigated | `reset_destructive` drops it explicitly and rebuilds via `flask_migrate.upgrade()`; verified as exactly one row at the batch head, with the following `flask db upgrade` running zero revisions |
| T-01-22 (unreviewed drop in autogenerated DDL) | mitigated | revision read end to end before upgrade; zero `drop_table`/`drop_column` in `upgrade()`, asserted by grep over the `upgrade()` body |
| T-01-23 (Alembic discarding a partial-index predicate) | mitigated | both predicates verified present in the revision AND in the live database by inspector; no hand-correction was needed |
| T-01-24 (demo passwords created outside development) | mitigated | `seed_demo_data` calls the guard first; `test_demo_data_does_consult_the_dev_guard` asserts it permanently |
| T-01-25 (reset with no record of which database) | mitigated | `main()` prints `DESTRUCTIVE RESET — rebuilding <resolved path>` before the destructive step |

## Verification

| Plan verification step | Result |
|---|---|
| 1. `ls migrations/versions/*.py \| wc -l` returns 2; `flask db heads` prints one line | 2; `213804635519 (head)` |
| 2. Live-database inspector prints `LIVE schema ok:` with ≥ 34 tables | `LIVE schema ok: 35 tables` (34 + `alembic_version`) |
| 3. `pytest -q` full suite green | 75 passed (64 + 11 new), exit 0, 91% coverage |
| 4. `python seed.py --reference-only` twice leaves 12 / 10 / 46 | `houses +0 (12 already present), regions +0 (10), cities +0 (46)`; assertion command prints `seed ok 12 10 46` |
| 5. `flask db upgrade` immediately after a full reseed is a clean no-op | exit 0, 0 revisions run |
| Task 1: `grep -c batch_alter_table` on the revision | 38 (criterion: ≥ 1) |
| Task 1: partial + cursor index greps | `uq_team_meetup_head`, `uq_activity_primary_org`, `ix_event_query_cursor`, `ix_announcement_cursor` — 2 occurrences each (upgrade + downgrade) |
| Task 1: `drop_table`/`drop_column` inside `upgrade()` | 0 |
| Task 1: `test_models_match_migrations_no_drift` | passes with both allowlists empty |
| Task 2: five function greps | `require_dev_database`, `reset_destructive`, `seed_reference_data`, `seed_demo_data`, `main` — 1 each; `sys.exit(1)` — 1 |
| Task 2: guard source assertion | contains `SQLALCHEMY_DATABASE_URI`, contains neither `FLASK_ENV` nor `FLASK_DEBUG` |
| Task 2: reference-data source assertion | `require_dev_database` absent from `seed_reference_data` |
| Task 2: `alembic_version` after reseed | exactly one row, `213804635519` |
| Task 3: `pytest tests/test_seed_guard.py tests/test_schema_batch.py -v` | 11 passed (8 + 3), exit 0 |
| Task 3: `grep -c SystemExit` / `grep -c EKATVA_ALLOW_DESTRUCTIVE_RESET` | 4 / 3 (criteria: ≥ 3 and ≥ 1) |
| Task 3: negative control | scheme check disabled → 3 tests failed `DID NOT RAISE SystemExit`; restored, `git diff backend/seed.py` empty |
| Seeded world unchanged | `Users: 7  Activities: 3  Registrations: 8  Expenses: 2` — identical to 01-01's recorded output |

## Deferred Items

Nothing new. **`deferred-items.md`'s open 65-character FK item is now closed** by deviation 1 — it was the only item awaiting a decision from this plan.

## Notes for Next Plan

- **01-05 now runs against a live, fully migrated database.** `ActivityTeamMember` and `ActivityCollaborator` physically exist in `backend/instance/ekatva.db`, so its RBAC predicates can be exercised by hand as well as by test.
- **The drift gate has no exceptions any more.** Any model 01-05 or a later phase changes without generating a migration fails `test_models_match_migrations_no_drift` immediately. That is now the normal workflow: edit the model, run `flask db migrate`, review the DDL, commit both together.
- **Do not reseed to pick up a schema change.** `flask db upgrade` is the path. `python seed.py` exists to build a demo world from nothing, and it will refuse to run anywhere that is not a local SQLite file.
- **`test_schema_batch.py::EXPECTED_REVISION_COUNT` is 2.** A future phase that legitimately adds a revision updates that number deliberately in review, alongside a note saying which revision and why. It is not to be deleted — the count is what stops a schema change arriving as three half-reviewed revisions.
- **Neither `PENDING_BATCH_TABLES` nor `PENDING_BATCH_COLUMNS` should be re-populated** without a plan that also commits to emptying it again in the same phase.

## Self-Check: PASSED

All claimed files exist on disk and all three claimed commits exist in `git log`:

- `backend/migrations/versions/213804635519_milestone_v1_1_batch_16_tables_11_.py` — FOUND
- `backend/seed.py` — FOUND
- `backend/app/models/__init__.py` — FOUND
- `backend/tests/test_migrations.py` — FOUND
- `backend/tests/test_seed_guard.py` — FOUND
- `backend/tests/test_schema_batch.py` — FOUND
- `backend/README.md` — FOUND
- Commit `d463b2b` — FOUND
- Commit `90c479b` — FOUND
- Commit `09cf479` — FOUND
