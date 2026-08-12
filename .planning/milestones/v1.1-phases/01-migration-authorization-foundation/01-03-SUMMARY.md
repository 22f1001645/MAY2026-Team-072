---
phase: 01-migration-authorization-foundation
plan: 03
subsystem: database
tags: [sqlalchemy, schema, server-default, upgrade-safety, unique-constraint, auth, chat, pytest]

requires:
  - "01-01 — Flask-Migrate wired, NAMING_CONVENTION on db.metadata, baseline revision 312ea9fc2c96"
  - "01-02 — 7 spine tables + PENDING_BATCH_TABLES allowlist in test_migrations.py"
provides:
  - "9 models: OrganisationSocialLink, BrandKit, EventFeedback, EventPoll, EventPollVote, EventQuery, RefreshTokenBlocklist, OrgProgressionUnlock, ReimbursementRequest"
  - "11 columns on 4 already-populated tables (users, organisations, reports, attendance), every one nullable or carrying a server_default"
  - "reports.status server_default 'submitted' and attendance.method server_default 'manual' — truthful backfills for historic rows"
  - "Cursor indexes ix_event_query_cursor and ix_announcement_cursor for CHAT-04 polling"
  - "Constant vocabularies: ACADEMIC_LEVELS/STATUSES, REPORT_STATES, ATTENDANCE_METHODS, REGISTRATION_STATES, EXPENSE_DRAFT, POLL_STATES, QUERY_STATES, BRAND_KIT_SOURCES"
  - "backend/tests/test_schema_identity.py — 7 tests, incl. a permanent upgrade-safety gate over all 11 columns"
  - "PENDING_BATCH_COLUMNS — (table, column) half of the batch window, so allowlisting a column does not blind the drift gate to the rest of that table"
affects:
  - "01-04 — emits the single batch revision covering 01-02 + 01-03; must empty BOTH PENDING_BATCH_TABLES and PENDING_BATCH_COLUMNS in that same commit"
  - "01-05 — no dependency; the RBAC predicates read 01-02's tables, not these"
  - "Phase 2 (AUTH-01 refresh revocation, AUTH-04 academic status), Phase 4 (ORG-01..04), Phase 6 (FEEDBACK-01/02, QR-01..04, REIMB-01/02), Phase 7 (PROG-03), Phase 8 (CHAT-01..04)"

actuals:
  tokens: 10700    # chars/4 over the realized 42,849-char diff (estimate was 55,000)
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "server_default (not just default=) on any non-nullable column added to a table that already holds rows — default= runs in Python and never touches the backfill"
    - "A (table, column) allowlist for a drift-gate window, rather than allowlisting the whole table"
    - "Test-level schema introspection (db.metadata.tables) as a permanent policy gate, not a one-time review"
    - "Explicit-SQL row setup in migration tests, so a test of migration behaviour does not depend on model columns the chain has not created yet"

key-files:
  created:
    - backend/tests/test_schema_identity.py
  modified:
    - backend/app/constants.py
    - backend/app/models/__init__.py
    - backend/tests/test_migrations.py

key-decisions:
  - "The batch window was extended by (table, column) pair rather than by table name — allowlisting `users` wholesale to cover three academic columns would have blinded the drift gate to every future column on the most security-relevant table in the schema."
  - "test_batch_add_and_drop_column_preserves_rows now inserts its probe rows with explicit SQL. During the batch window the models carry columns the migration chain has not created, so its ORM insert failed for a reason unrelated to batch mode."
  - "Report.to_dict() keeps emitting created_at under the `submitted_at` key even though a real submitted_at column now exists — changing that key's meaning is an API behaviour change with no requirement behind it. Flagged to Phase 6."
  - "EXPENSE_DRAFT is declared adjacent to the expense constants but deliberately absent from EXPENSE_FLOW, which expense_service.advance() walks by index."

patterns-established:
  - "A column added to a populated table is upgrade-safe or it is a defect — and the check is a test that names every offender, not a reviewer's memory."
  - "A backfill value must describe what actually happened. reports.status='submitted' and attendance.method='manual' are true of every existing row; any other default would write a guess into rows nobody can go back and verify."
  - "Negative control before claiming a gate works: the upgrade-safety test was proven to fail (naming attendance.method) before the column was restored."

requirements-completed: [SCHEMA-02]

coverage:
  - id: D1
    description: "All nine identity/close-out/channel/session tables are importable from app.models and registered in db.metadata"
    requirement: "SCHEMA-02"
    verification:
      - kind: other
        ref: "python metadata check -> 'identity models ok 34 tables'"
        status: pass
      - kind: unit
        ref: "test_schema_identity.py — all 7 tests build rows on a db.create_all() schema"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every one of the eleven new columns on a populated table is nullable or carries a server_default (threat T-01-17, SCHEMA-02 existing-rows edge)"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "test_schema_identity.py::test_new_columns_on_populated_tables_are_upgrade_safe"
        status: pass
      - kind: other
        ref: "negative control — server_default removed from attendance.method, test failed naming 'attendance.method' at line 97, column restored"
        status: pass
    human_judgment: false
  - id: D3
    description: "reports.status backfills to submitted and attendance.method backfills to manual"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "test_schema_identity.py::test_existing_rows_backfill_to_truthful_defaults"
        status: pass
      - kind: other
        ref: "negative control — same edit made the backfill test fail with 'assert None is not None' at line 116"
        status: pass
    human_judgment: false
  - id: D4
    description: "A user votes at most once per poll and submits at most one feedback row per activity (threats T-01-14, T-01-15)"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "test_user_votes_once_per_poll + test_attendee_rates_once_per_activity — both assert IntegrityError and the positive half (a different user still votes/rates)"
        status: pass
    human_judgment: false
  - id: D5
    description: "One brand kit per org, one reimbursement request per activity, one progression unlock per (org, city)"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "test_single_brand_kit_per_org_and_single_reimbursement_request_per_activity + test_org_progression_unlock_is_unique_per_org_and_city"
        status: pass
    human_judgment: false
  - id: D6
    description: "refresh_token_blocklist.jti is unique and indexed, and expires_at is indexed (threat T-01-13)"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "test_refresh_token_jti_is_unique_and_indexed"
        status: pass
    human_judgment: false
  - id: D7
    description: "EXPENSE_DRAFT exists but is NOT in EXPENSE_FLOW; the four-stage admin pipeline is unchanged"
    requirement: "SCHEMA-02"
    verification:
      - kind: other
        ref: "python assertion — EXPENSE_DRAFT == 'draft' and not in EXPENSE_FLOW; EXPENSE_FLOW == ['submitted','verified','approved','paid']"
        status: pass
      - kind: other
        ref: "git diff backend/app/constants.py — 65 insertions / 0 deletions"
        status: pass
    human_judgment: false
  - id: D8
    description: "Adding these tables and columns changed no existing behaviour and generated no migration"
    requirement: "SCHEMA-02"
    verification:
      - kind: unit
        ref: "pytest -q — 57 passed before, 64 after (57 + 7 identity), exit 0"
        status: pass
      - kind: other
        ref: "ls backend/migrations/versions/*.py | wc -l -> 1 (still only the 01-01 baseline)"
        status: pass
    human_judgment: false

duration: 22min
completed: 2026-08-06
status: complete
---

# Phase 01 Plan 03: Organisation Identity, Close-Out & Channel Schema Summary

**The nine remaining milestone tables are declared and the eleven columns that land on already-populated tables are provably safe to apply: each is nullable or carries a server_default, `reports.status` and `attendance.method` backfill to values that describe what actually happened, and a permanent test names any future offender rather than leaving five teammates to discover it when `flask db upgrade` fails on their machine.**

## Performance

- **Duration:** ~22 min
- **Completed:** 2026-08-06
- **Tasks:** 3 of 3, all autonomous (no checkpoints in this plan)
- **Files:** 4 (1 created, 3 modified)
- **Estimate accuracy:** 55,000 tokens estimated, ~10,700 actual (chars/4 over a 42,849-char diff). ~5x high, the same direction and cause as 01-02: declarative schema with no service or integration surface to iterate on. Two plans now agree that pure-schema plans in this codebase cost roughly a fifth of their estimate.

## The eleven columns, for 01-04's revision review

Every row below is what the generated DDL must render. `server_default` is the column that changes an existing row's contents; `nullable` is the column that leaves it alone.

| Table | Column | Type | Disposition | Why that disposition |
|---|---|---|---|---|
| `users` | `academic_level` | String(20) | nullable | AUTH-04 is self-declared; NULL truthfully means "not yet declared" |
| `users` | `academic_status` | String(20) | nullable | same |
| `users` | `academic_confirmed_at` | DateTime | nullable | nobody has confirmed anything yet |
| `organisations` | `bio` | Text | nullable | seeded orgs have no profile; blank is honest |
| `organisations` | `logo_url` | String(300) | nullable | same |
| `reports` | `challenges` | Text | nullable | existing reports have no reflection recorded |
| `reports` | `learnings` | Text | nullable | same |
| `reports` | `status` | String(20) | **NOT NULL, server_default `'submitted'`** | every existing Report was in fact submitted — drafts had nowhere to live before this column |
| `reports` | `submitted_by` | String(32) FK users.id | nullable | historic submitter is unknowable; forging one would be worse than NULL |
| `reports` | `submitted_at` | DateTime | nullable | same |
| `attendance` | `method` | String(20) | **NOT NULL, server_default `'manual'`** | QR check-in does not exist yet, so every existing check-in came from the tap-based roster flow |

Both `default=` (Python-side, new rows) and `server_default=` (DDL-side, the backfill) are set on the two non-nullable columns. `default=` alone would leave every pre-existing row NULL in a NOT NULL column, which is precisely the failure this plan exists to avoid.

## Exact names created (for 01-04's revision review)

| Table | Explicit constraints / indexes |
|---|---|
| `organisation_social_links` | `uq_org_social_platform` (UniqueConstraint: org_id, platform) |
| `brand_kits` | `uq_brand_kits_org_id` (convention-derived, from `unique=True`) |
| `event_feedback` | `uq_event_feedback` (UniqueConstraint: activity_id, user_id) |
| `event_polls` | none beyond convention-derived PK/FK/index |
| `event_poll_votes` | `uq_poll_vote` (UniqueConstraint: poll_id, user_id) |
| `event_queries` | **`ix_event_query_cursor`** (Index: activity_id, created_at) |
| `refresh_token_blocklist` | `ix_refresh_token_blocklist_jti` (UNIQUE index) · `ix_refresh_token_blocklist_expires_at` |
| `org_progression_unlocks` | `uq_org_progression` (UniqueConstraint: org_id, city) |
| `reimbursement_requests` | `uq_reimbursement_requests_activity_id` (convention-derived) |
| `announcements` (existing) | **`ix_announcement_cursor`** (Index: activity_id, created_at) — added via a new `__table_args__`; no columns added |

New backrefs: `Organisation.social_links`, `Organisation.brand_kit` (uselist=False), `Activity.feedback`, `Activity.polls`, `Activity.queries`, `Activity.reimbursement_request` (uselist=False), `EventPoll.votes`.

Constants added: `ACADEMIC_LEVELS`, `ACADEMIC_STATUSES` · `REPORT_DRAFT/SUBMITTED`, `REPORT_STATES` · `ATTENDANCE_METHOD_QR/MANUAL`, `ATTENDANCE_METHODS` · `REGISTRATION_CONFIRMED/WAITLISTED/CANCELLED`, `REGISTRATION_STATES` · `EXPENSE_DRAFT` · `POLL_OPEN/CLOSED`, `POLL_STATES` · `QUERY_OPEN/ANSWERED`, `QUERY_STATES` · `BRAND_KIT_MANUAL/AI_DRAFT`, `BRAND_KIT_SOURCES`.

**Identifier-length check for 01-04:** every constraint and index name generated by this plan was measured against PostgreSQL's 63-byte limit. The longest is `fk_organisation_social_links_org_id_organisations` at 48 characters. **No new offender.** The only name in the whole schema still over the limit is 01-02's `fk_registration_field_responses_field_id_registration_form_fields` (65 chars), already logged in `deferred-items.md` and still awaiting 01-04's decision.

## Accomplishments

- **The upgrade-safety gate is real, proven by negative control.** Removing `server_default` from `attendance.method` made `test_new_columns_on_populated_tables_are_upgrade_safe` fail with `these columns are NOT NULL with no server_default ...: attendance.method` at line 97, and the backfill test fail at line 116. Restoring it returned the suite to green with a byte-identical model file (`git diff --stat` empty). The gate would catch a future contributor adding a bare NOT NULL column here.
- **The backfills are truthful, not convenient.** `submitted` and `manual` are both statements about rows that already exist, and each is documented in the model with the reason it is true. This is the difference between recording history and guessing at it.
- **Every once-per-user rule is a database constraint.** Second poll vote, second feedback row, second brand kit, second reimbursement request, duplicate refresh-token jti, duplicate (org, city) unlock — all six raise `IntegrityError`, and each test also proves the legitimate sibling row still commits.
- **The refresh-token blocklist can actually be operated.** `jti` unique+indexed (the check on every refresh) and `expires_at` indexed (the prune), asserted directly from `db.metadata`, because an unindexed blocklist degrades the hottest path in the auth flow as it grows.
- **Table count is 34** (18 pre-existing + 7 from 01-02 + 9 here), and **no migration was generated** — `ls backend/migrations/versions/*.py | wc -l` still returns 1. SCHEMA-02's one-batch promise is intact for 01-04.
- **No Phase 3-8 policy number leaked in.** No social-link host allowlist, no progression thresholds, no poll/query rate limits, no budget ceiling. Where a vocabulary implies a number, a comment names the phase that owns it.

## Task Commits

1. **Task 1: academic / report / attendance / registration / poll / query / brand-kit vocabularies** — `215dec7` (feat)
2. **Task 2: nine models + eleven columns + both cursor indexes** — `e54d7df` (feat)
3. **Task 3: upgrade-safety gate and the once-per-user constraint tests** — `0b0851a` (test)

## Decisions Made

- **The batch window was extended by (table, column) pair, not by table.** 01-02's notes anticipated this exactly. Adding `users` to `PENDING_BATCH_TABLES` to cover three academic columns would have suppressed drift detection for every future column on the table that holds credentials and roles. `PENDING_BATCH_COLUMNS` names the eleven pairs, and `test_pending_batch_list_is_accurate` now guards both halves against the same two rot modes (naming something no model declares; keeping something listed after the revision creates it).
- **`Report.to_dict()` keeps `submitted_at` pointing at `created_at`.** The key already existed and already meant "when the report row appeared". Now that a real `submitted_at` column exists the key is arguably misnamed, but repointing it changes what an existing API consumer receives, with no requirement asking for it. Left alone, documented in the model, and flagged to Phase 6 below.
- **`EXPENSE_DRAFT` sits next to the expense constants but outside `EXPENSE_FLOW`.** `expense_service.advance()` indexes into that list, so inserting a pre-submission state would silently change the next status of every expense in the system.

## Deviations from Plan

### 1. [Rule 3 - Blocking] The batch window had to grow a (table, column) half

- **Found during:** Task 2
- **Issue:** Adding eleven columns to four already-migrated tables made `test_models_match_migrations_no_drift` fail with eleven `add_column` entries. The existing allowlist filters by table name only, and using it would have meant allowlisting `users`, `organisations`, `reports` and `attendance` wholesale.
- **Fix:** Added `PENDING_BATCH_COLUMNS` (11 pairs) plus `_is_inside_batch_window()`, and extended `test_pending_batch_list_is_accurate` with the matching undeclared-column and already-migrated-column assertions.
- **Files modified:** `backend/tests/test_migrations.py` (outside this plan's declared `files_modified`, same as 01-02's deviation 1)
- **Committed in:** `e54d7df`

### 2. [Rule 3 - Blocking] test_batch_add_and_drop_column_preserves_rows could no longer use the ORM

- **Found during:** Task 2
- **Issue:** That test builds an `Organisation` and a `User` through the ORM against a database built by the migration chain. During the batch window the models carry columns (`organisations.bio`, `users.academic_level`, ...) the chain has not created, so the INSERT failed with `table organisations has no column named bio`. No allowlist can fix this — the ORM emits the columns the model declares. The failure had nothing to do with the SQLite batch-mode behaviour the test exists to prove.
- **Fix:** Row setup and readback now use explicit `sa.text()` statements naming only migrated columns (`_insert_probe_rows`, `_insert_user`, `_probe_email`). The test still exercises the same risky path: `users` still carries its unique index and its FK to `organisations`, rows are still asserted to survive both the add and the drop, and the duplicate-email insert still has to raise `IntegrityError` afterwards. The now-unused `Organisation`/`User` imports were replaced with a plain `import app.models` so metadata registration is preserved.
- **Committed in:** `e54d7df`

---

**Total deviations:** 2 (both Rule 3). Neither changes the schema shape or any name another plan depends on.

## Issues Encountered

- **`pytest`'s final summary line still does not reach stdout on this Windows shell** (carried over from 01-02). Counts here were read from the progress-dot line and from targeted `-k` runs; exit codes are reliable. Running `pytest` twice in one compound command was killed with exit 137 (memory), so suite runs are done one at a time with output redirected to a file.
- **A session hook required a fact-forcing preamble before the first Bash call.** Answered, no impact on the work.

## Known Stubs

None. Every column declared here is either written by a future phase's service (documented in the owning class's docstring, with the owning requirement named) or has a working default. No placeholder values, TODO markers, or unwired data paths were introduced. `organisation_social_links.url` is deliberately inert this milestone — recorded as a transferred threat below, not a stub, because nothing reads or renders it and the model says so.

## Threat Flags

None new. The plan's register was implemented as specified:

| Threat | Disposition | Where it landed |
|---|---|---|
| T-01-12 (social-link stored XSS / open redirect) | transferred | column inert in Phases 1-3; `OrganisationSocialLink` docstring records ORG-02's Phase 4 scheme+host allowlist as the owner |
| T-01-13 (revoked refresh token still accepted) | mitigated | `jti` unique+indexed, `expires_at` NOT NULL + indexed, asserted by `test_refresh_token_jti_is_unique_and_indexed` |
| T-01-14 (poll ballot stuffing) | mitigated | `uq_poll_vote` + `test_user_votes_once_per_poll` asserting IntegrityError |
| T-01-15 (duplicate feedback inflating a rating) | mitigated | `uq_event_feedback` + `test_attendee_rates_once_per_activity` |
| T-01-16 (unattributable report / reimbursement) | mitigated | `reports.submitted_by`/`submitted_at`, `reimbursement_requests.submitted_by`/`submitted_at`; `reports.status` backfills to `submitted` so historic rows are not reclassified as drafts |
| T-01-17 (NOT NULL column breaking teammates' upgrade) | mitigated | `test_new_columns_on_populated_tables_are_upgrade_safe`, negative-control verified |
| T-01-18 (progression unlock mistaken for eligibility) | mitigated | `OrgProgressionUnlock` docstring records that PROG-01/PROG-04 compute eligibility from activity history and never read this table |

## Verification

| Plan verification step | Result |
|---|---|
| 1. `pytest tests/test_schema_identity.py -v` | 7 passed, exit 0 |
| 2. `pytest -q` full suite | 64 passed (57 + 7), exit 0 |
| 3. `python -c "... print(len(db.metadata.tables))"` | 34 (criterion: at least 34) |
| 4. `ls backend/migrations/versions/*.py \| wc -l` | 1 — no revision generated, as required |
| Task 1 assertion command | prints `constants ok`, including `EXPENSE_DRAFT not in EXPENSE_FLOW` |
| Task 2 metadata assertions | `identity models ok 34 tables`; both server_defaults present; both cursor indexes present; `academic_level` in `User.to_dict` source |
| `git diff --numstat` constants / models | `65  0` and `386  1` — the single deletion is the `Organisation.to_dict` one-liner, replaced by its expanded form |
| `grep -c "def test_"` / `grep -c "IntegrityError"` on the identity tests | 7 / 9 (criteria: 7 and at least 5) |
| Negative control on the upgrade-safety gate | failed naming `attendance.method`, then restored; `git diff --stat` on models empty afterwards |

## Deferred Items

Nothing new logged to `deferred-items.md` this plan. Two items carried for later phases, recorded here rather than there because both belong to a named future phase rather than being loose discoveries:

- **Phase 6 (FEEDBACK-01):** `Report.to_dict()` emits `created_at` under the `submitted_at` key while a real `submitted_at` column now exists. Repoint the key when Phase 6 starts writing the column, and treat it as an API change with a frontend counterpart.
- **01-02's 65-character FK name** is still open and still needs 01-04's decision before autogenerate runs. This plan added no new name over 63 characters (longest: 48).

## Notes for Next Plan

- **01-04 must empty BOTH `PENDING_BATCH_TABLES` and `PENDING_BATCH_COLUMNS`** in the same commit as the batch revision. `test_pending_batch_list_is_accurate` now fails on either half once the revision creates the table or the column — that is deliberate, and it is four assertions now, not two.
- **01-04's revision must render both `server_default`s.** `reports.status` → `'submitted'`, `attendance.method` → `'manual'`. If autogenerate emits them as plain `nullable=False` columns with no `server_default`, the upgrade breaks on any teammate's populated database and `test_new_columns_on_populated_tables_are_upgrade_safe` will not catch it (that test reads the models, not the revision) — check the generated DDL against the eleven-column table above, line by line.
- **01-04 should expect SQLite batch mode for all four ALTERs.** Adding a NOT NULL column with a server_default to `users`, `organisations`, `reports` and `attendance` on SQLite goes through `batch_alter_table`, which is the path 01-01's `test_batch_add_and_drop_column_preserves_rows` proves works.
- **01-04's seed data can now populate the new tables**, but nothing requires it to. Only `reimbursement_requests.social_post_link` and `submitted_by`, `event_polls.question`, `event_feedback.rating`, `event_queries.body`, `refresh_token_blocklist.jti`/`expires_at`, `org_progression_unlocks.city` and `organisation_social_links.platform`/`url` are NOT NULL without defaults, so any seeded row must supply them.
- **01-05 has no dependency on this plan.** Its predicates read `ActivityTeamMember` and `ActivityCollaborator` from 01-02.

## Self-Check: PASSED

All claimed files exist on disk and all three claimed commits exist in `git log`:

- `backend/app/constants.py` — FOUND
- `backend/app/models/__init__.py` — FOUND
- `backend/tests/test_migrations.py` — FOUND
- `backend/tests/test_schema_identity.py` — FOUND
- Commit `215dec7` — FOUND
- Commit `e54d7df` — FOUND
- Commit `0b0851a` — FOUND
