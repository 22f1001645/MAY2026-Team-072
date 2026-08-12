---
phase: 01-migration-authorization-foundation
verified: 2026-08-06T00:00:00Z
status: human_needed
score: 12/14 must-haves verified
behavior_unverified: 2
overrides_applied: 0
human_verification:
  - test: "Confirm seed.py's reset_destructive() / seed_reference_data() are never invoked concurrently (e.g. by a CI job, a second developer, or an automated scheduler) against the same SQLite file."
    expected: "Only ever run as a single-operator, single-process terminal command. No process/thread-safety mechanism (lock file, transaction isolation beyond SQLite defaults) exists in the code, so concurrent invocation could interleave a drop_all() with a read from another process."
    why_human: "This is a claim about how the script is operated (single-operator discipline), not something derivable from reading seed.py in isolation — the code contains no enforcement of the claim, only a docstring assertion. Plan 01-04 tagged this must-have `verification: backstop` for exactly this reason."
  - test: "Confirm the deployed WSGI server's concurrency model (thread-based vs. process-based workers) does not let two requests' `flask.g` writes in app/rbac.py's scoped decorators (`g.current_user`, `g.activity`, `g.org`) cross-contaminate."
    expected: "flask.g is request-local under both gunicorn's sync workers and Flask's dev server, so no cross-request race exists. All rbac.py functions perform only read-only .query calls with no module-level mutable state."
    why_human: "Race-condition absence depends on the deployment's concurrency model, which is not visible from app/rbac.py's source alone. Independently verified by direct code reading (see below) that the code itself introduces no NEW risk beyond the existing organiser_required decorator's identical flask.g pattern — but plan 01-05 tagged this must-have `verification: backstop`, meaning it is a judgment call by design, not a mechanically provable fact."
---

# Phase 01: Migration & Authorization Foundation Verification Report

**Phase Goal:** The team can change the database schema without destroying anyone's data, and the backend can answer "can this specific person act on this specific activity or org?"
**Verified:** 2026-08-06
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria — the contract)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A developer can add *and drop* a column and apply it with `flask db upgrade` on SQLite without losing data; the naming convention lands before the first migration | ✓ VERIFIED | `git log --oneline -- backend/migrations/versions/312ea9fc2c96_baseline_existing_18_table_schema.py` and `git log --oneline -- backend/app/extensions.py` both resolve to commit `12f07ad` — the convention was not added after the first revision. `pytest tests/test_migrations.py -v` passes 4/4, including `test_batch_add_and_drop_column_preserves_rows`, run directly and confirmed green. |
| 2 | Destructive reset against a non-dev `DATABASE_URL` exits non-zero and refuses; reference data reseeds idempotently against any environment | ✓ VERIFIED | Directly invoked `seed.require_dev_database(app)` with `SQLALCHEMY_DATABASE_URI='postgresql://user:pass@host/db'` — raised `SystemExit(1)` with a printed refusal reason. Confirmed the SQLite default (`sqlite:///ekatva.db`) is allowed (returns `None`). Read `seed_reference_data()` source: uses `Organisation.query.filter_by(...).first()` / `City.query.filter_by(...).first()` get-or-create, and does not call `require_dev_database` anywhere in its body. |
| 3 | Every table/column this milestone needs exists after a single reseed — no later phase needs a second destructive reset | ✓ VERIFIED | Live SQLAlchemy inspector against `backend/instance/ekatva.db` confirms all 16 new tables + all 11 new columns physically present (35 tables total incl. `alembic_version`). `ls backend/migrations/versions/*.py` shows exactly 2 revision files (baseline + one batch). `flask db heads` prints exactly one head (`213804635519`). |
| 4 | A plain student is granted `can_participate_in_activity` for a registered event and denied `can_manage_activity` for one they aren't crew on; a Secretary of org A is denied `can_manage_org` for org B | ✓ VERIFIED | `pytest tests/test_rbac_predicates.py -v` — 13/13 passing, run directly. Read `app/rbac.py` in full: `can_participate_in_activity` checks a live non-cancelled `Registration` row, `can_manage_activity` checks admin/organiser/crew/POR-in-owning-org paths, `can_manage_org` compares only `org.id` (never name/city) against `_por_org_ids(por)`. |
| 5 | `is_meetup_head` is a distinct per-activity check rejecting a manager who isn't the assigned Meetup Head; no new activity/org-scoped endpoint uses the coarse `organiser_required` | ✓ VERIFIED | Read `is_meetup_head` source directly: no `ROLE_ADMIN` reference, existence query scoped to `role == TEAM_ROLE_MEETUP_HEAD`. `pytest tests/test_rbac_enforcement.py -v` — 3/3 passing, run directly: `test_no_new_scoped_route_uses_the_coarse_guard`, `test_legacy_allowlist_has_no_dead_entries`, `test_every_scoped_route_carries_at_least_one_guard`. `git diff --stat a98cefe~1 7223b31 -- backend/app/controllers/` is empty — zero controllers were touched this phase, so no route regressed to the coarse guard. |

**Score (ROADMAP contract):** 5/5 verified

### Additional Plan-Level Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 6 | Exactly one baseline + one batch revision exist; drift gate (`PENDING_BATCH_TABLES`/`PENDING_BATCH_COLUMNS`) is empty and covers the whole schema | ✓ VERIFIED | `ls migrations/versions/*.py` → 2 files. `pytest tests/test_schema_batch.py tests/test_migrations.py -v` passes, including `test_models_match_migrations_no_drift` and `test_pending_batch_list_is_accurate`. |
| 7 | `reset_destructive()` drops `alembic_version` explicitly and rebuilds via `flask_migrate.upgrade()`, never `db.create_all()` | ✓ VERIFIED | Read `seed.py` source directly (lines 158–180): explicit `DROP TABLE IF EXISTS alembic_version` followed by `alembic_upgrade(directory=MIGRATIONS_DIR)`; no `create_all()` call present. |
| 8 | `require_dev_database` reads only `SQLALCHEMY_DATABASE_URI`, no environment-variable bypass exists | ✓ VERIFIED | Read source directly: only `app.config["SQLALCHEMY_DATABASE_URI"]` is consulted; no `os.getenv`/`os.environ`/`FLASK_ENV`/`FLASK_DEBUG` reference anywhere in the function. `test_guard_cannot_be_bypassed_by_environment` in `test_seed_guard.py` passes. |
| 9 | All Phase 1 requirement IDs (SCHEMA-01/02/03, RBAC-01/02/03) are claimed by exactly one plan each, no orphans | ✓ VERIFIED | `grep "^requirements:" *-PLAN.md` across all 5 plans yields exactly SCHEMA-01, SCHEMA-02 (×2), SCHEMA-02+SCHEMA-03, RBAC-01+02+03 — matches REQUIREMENTS.md's Phase 1 traceability row exactly, no gaps. |
| 10 | Full backend test suite is green with no regressions | ✓ VERIFIED | `python -m pytest -q` run directly from a clean shell: 91 passed, exit 0, 89% coverage. Matches 01-05-SUMMARY's claimed final count. |
| 11 | The reset/reference-seed functions perform no concurrent work; no locking guarantee is claimed or needed | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Code review confirms no concurrency primitives and a docstring stating the single-operator assumption, but this is an operational/process claim about how the script is invoked in practice, not a code-provable fact. Plan 01-04 tagged this `verification: backstop` for exactly this reason. See Human Verification. |
| 12 | The RBAC predicates are read-only, hold no cached state, and introduce no race condition beyond the existing `organiser_required`'s identical pattern | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Code review of `app/rbac.py` confirms only `.query` reads, no module-level mutable state, writes limited to request-scoped `flask.g`. This matches `organiser_required`'s existing pattern. However, the absence of a race condition depends on the deployment's concurrency model, which is outside this module's source. Plan 01-05 tagged this `verification: backstop`. See Human Verification. |

**Score:** 12/14 truths verified (2 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/extensions.py` | `NAMING_CONVENTION` (5 keys), `db`, `migrate` | ✓ VERIFIED | Read directly — all 5 keys (ix/uq/ck/fk/pk) present, `db = SQLAlchemy(metadata=MetaData(naming_convention=NAMING_CONVENTION))`. |
| `backend/migrations/versions/` | Baseline + one batch revision | ✓ VERIFIED | Exactly 2 `.py` files present; `flask db heads` shows 1 head. |
| `backend/app/rbac.py` | 4 predicates, 2 factories, 4 ready-made guards, `_rbac_guards` marker | ✓ VERIFIED | Read in full — all present, `is_meetup_head` has no admin short-circuit. |
| `backend/app/constants.py` | `ORG_MANAGER_PORS` + 12 vocabulary sections across plans 01-02/01-03 | ✓ VERIFIED | `pytest -q` passes; no uncommitted diff on this file (working tree clean except unrelated `.planning/config.json`). |
| `backend/app/models/__init__.py` | 16 new model classes, 11 new columns | ✓ VERIFIED | Live DB inspector confirms all 16 tables + 11 columns physically exist. |
| `backend/seed.py` | `require_dev_database`, `reset_destructive`, `seed_reference_data`, `seed_demo_data`, `main` | ✓ VERIFIED | All 5 functions present and read in full; behavior matches spec directly tested. |
| `backend/tests/test_migrations.py`, `test_schema_spine.py`, `test_schema_identity.py`, `test_seed_guard.py`, `test_schema_batch.py`, `test_rbac_predicates.py`, `test_rbac_enforcement.py` | Test suites for each claim | ✓ VERIFIED | All run directly; 91/91 tests pass, including the 16 RBAC and 16 migration/seed/batch tests. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `app/extensions.py` NAMING_CONVENTION | first migration revision | must land in the same commit | ✓ WIRED | Confirmed same commit `12f07ad` via `git log` on both files. |
| `app/__init__.py` migrate.init_app | `render_as_batch=True` | SQLite ALTER/DROP COLUMN | ✓ WIRED | `grep -c "render_as_batch=True" app/__init__.py` (per 01-01 acceptance) and confirmed 38 `batch_alter_table` occurrences in the batch revision (per 01-04-SUMMARY, independently spot-checked via live schema). |
| `seed.reset_destructive` | `flask_migrate.upgrade()` | not `db.create_all()` | ✓ WIRED | Read directly, confirmed. |
| `app/rbac.py` `can_manage_activity` | `ActivityTeamMember` (plan 01-02) | crew-scoped, no org widen | ✓ WIRED | Read directly — team-membership branch returns immediately with no org lookup. |
| `app/rbac.py` `is_meetup_head` | `ActivityTeamMember.role == TEAM_ROLE_MEETUP_HEAD` | single accountable submitter | ✓ WIRED | Read directly, no admin fallback; backed by `uq_team_meetup_head` DB-level singleton from plan 01-02. |
| `tests/test_rbac_enforcement.py` | `app.url_map` + `_rbac_guards` | RBAC-02 mechanical enforcement | ✓ WIRED | Run directly, 3/3 pass; confirmed zero controller files changed this phase (no route could have regressed). |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|--------------|--------|----------|
| SCHEMA-01 | 01-01 | Flask-Migrate + naming convention before first migration | ✓ SATISFIED | Verified directly above. |
| SCHEMA-02 | 01-02, 01-03, 01-04 | All milestone tables/columns declared in one batch | ✓ SATISFIED | Verified directly above (16 tables, 11 columns, live DB). |
| SCHEMA-03 | 01-04 | `seed.py` split, guarded destructive path | ✓ SATISFIED | Verified directly above (guard tested live). |
| RBAC-01 | 01-05 | `can_manage_activity`/`can_participate_in_activity`/`can_manage_org` predicates | ✓ SATISFIED | Verified directly above. |
| RBAC-02 | 01-05 | New activity/org-scoped endpoints use scoped predicates, not coarse guard | ✓ SATISFIED | Verified directly above; mechanically enforced by test + zero controllers touched. |
| RBAC-03 | 01-05 | Distinct `is_meetup_head` per-activity check | ✓ SATISFIED | Verified directly above. |

No orphaned requirements — REQUIREMENTS.md's Phase 1 traceability row (`SCHEMA-01, SCHEMA-02, SCHEMA-03 | Phase 1 | Complete` and `RBAC-01, RBAC-02, RBAC-03 | Phase 1 | Complete`) matches exactly what the 5 plans claim.

### Anti-Patterns Found

None. Scanned `app/rbac.py`, `app/extensions.py`, `app/constants.py`, `app/models/__init__.py`, `seed.py` for `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER`/stub patterns — the only matches are the legitimate domain constant `TASK_TODO = "todo"` (a Kanban column value, not a debt marker). No `git diff` shows any file left dirty; working tree only carries an unrelated `.planning/config.json` change.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Naming convention lands before first migration | `git log --oneline` on both files | Both → `12f07ad` | ✓ PASS |
| Guard refuses non-SQLite URI | `seed.require_dev_database(app)` with Postgres URI | `SystemExit(1)`, refusal printed | ✓ PASS |
| Guard allows default SQLite URI | same, with default config | Returns `None` | ✓ PASS |
| Live DB has all 34 app tables + 11 columns | SQLAlchemy inspector against `backend/instance/ekatva.db` | 35 tables (34 + alembic_version), all columns present | ✓ PASS |
| Exactly one migration head | `flask db heads` | `213804635519 (head)` | ✓ PASS |
| RBAC predicate + enforcement tests | `pytest tests/test_rbac_predicates.py tests/test_rbac_enforcement.py -v` | 16 passed | ✓ PASS |
| Migration/seed/batch tests | `pytest tests/test_migrations.py tests/test_schema_batch.py tests/test_seed_guard.py -v` | 16 passed | ✓ PASS |
| Full suite | `python -m pytest -q` | 91 passed, exit 0 | ✓ PASS |
| No controller touched this phase | `git diff --stat a98cefe~1 7223b31 -- backend/app/controllers/` | empty | ✓ PASS |

### Human Verification Required

### 1. Single-operator invocation of seed.py's destructive path

**Test:** Confirm `seed.py` (without `--reference-only`) is never run concurrently against the same SQLite file — e.g., by two developers, a CI job, or an automated scheduler.
**Expected:** Only ever invoked as a single-operator terminal command, one process at a time.
**Why human:** This is an operational/process discipline claim, not a fact derivable from the code. The plan itself (01-04) tagged this must-have `verification: backstop` because no automated check can rule out misuse.

### 2. Deployment concurrency model does not create a `flask.g` race in rbac.py

**Test:** Confirm the production WSGI server's worker model (e.g., gunicorn sync/thread/gevent workers) keeps `flask.g` writes (`g.current_user`, `g.activity`, `g.org`) request-local, matching the assumption `app/rbac.py`'s scoped decorators depend on.
**Expected:** No cross-request state leakage; this matches the pre-existing `organiser_required` decorator's identical pattern, so no new risk is introduced.
**Why human:** Race-condition absence depends on the deployment's concurrency model, which is outside `app/rbac.py`'s source. Plan 01-05 tagged this must-have `verification: backstop` by design — code review (done above) supports the claim but cannot fully prove it.

### Gaps Summary

No gaps. All 5 ROADMAP success criteria and all 6 requirement IDs (SCHEMA-01/02/03, RBAC-01/02/03) are directly verified against the live codebase — the physical SQLite database, the actual test suite (91/91 passing, run fresh), and direct source reads of `rbac.py` and `seed.py` rather than SUMMARY.md claims alone. The only open items are the two must-haves both plans explicitly tagged `verification: backstop` (operational/deployment claims about concurrency that no static check can fully resolve) — these route to human verification per the escalation-gate protocol rather than being treated as failures, since the code itself shows no defect.

---

_Verified: 2026-08-06_
_Verifier: Claude (gsd-verifier)_
