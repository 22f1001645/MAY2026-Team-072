---
phase: 06-event-execution-close-out
plan: 01
subsystem: api
tags: [flask, sqlalchemy, audit-log, projection, timeline, pytest]

requires:
  - phase: 01-migration-authorization-foundation
    provides: auth_required / _mark guard machinery, the RBAC-02 url_map gate, AuditLog naming convention
  - phase: 02-identity-session-dashboard-shell
    provides: the AuditLog JSON `note` convention used by every row this plan writes
  - phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
    provides: CampaignPackage with status/pushed_live_at — the campaign_live entry's source
provides:
  - "GET /api/v1/activities/<activity_id>/timeline — the read-only event timeline (TIMELINE-01)"
  - "timeline_service.build_timeline() — a projection over AuditLog, Registration, Attendance, CampaignPackage, Report and Expense with no new source-of-truth table"
  - "AuditLog writes in registration_service.register(), attendance_service.check_in() and expense_service.submit_expense() (TIMELINE-02)"
  - "An activity-scoped audit trail that now includes registration, check-in and reimbursement events, not just proposal decisions"
affects: [06-02-reimbursement, 06-03-feedback, 06-04-frontend, phase-7-progression-gating]

actuals:
  tokens: 21500
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Read-only projection service: assemble a view from tables other services own, never write"
    - "Per-entity cutoff de-duplication when a projection reads both an audit log and the tables it describes"
    - "Structured JSON in AuditLog.note so a projection can read machine detail (method, ids) without parsing prose"

key-files:
  created:
    - backend/app/services/timeline_service.py
    - backend/app/controllers/timeline_controller.py
    - backend/tests/test_event_timeline.py
  modified:
    - backend/app/services/registration_service.py
    - backend/app/services/attendance_service.py
    - backend/app/services/expense_service.py
    - backend/app/controllers/__init__.py

key-decisions:
  - "The timeline reads BOTH the audit log and the underlying tables, de-duplicated by a per-entity cutoff (the earliest audit row's timestamp) rather than an on/off switch — an event with check-ins on both sides of the TIMELINE-02 backfill gets each half from exactly one source."
  - "The 'Expense submitted' audit row is now keyed on activity_id. It was keyed on expense.id before the flush, so entity_id was always null and the row belonged to nothing."
  - "advance()/bulk_advance() audit rows stay keyed on the expense id — those are admin-side pipeline status moves, not events in the organiser's timeline."
  - "An unknown activity id 404s rather than returning []. 'Nothing has happened yet' and 'there is no such event' are different facts and the timeline panel has to tell them apart."
  - "Draft expenses are excluded from the reimbursement_submitted entry, so plan 06-02's EXPENSE_DRAFT rows will not appear as events that happened."

patterns-established:
  - "Projection service: no writes, no new table, every entry traceable to a row another service owns (TIMELINE-01)"
  - "Cutoff de-duplication: when a backfill splits an entity's history across two sources, use the boundary timestamp rather than a per-entity boolean"
  - "AuditLog rows for activity-scoped events carry entity_id = activity_id, because every reader asks 'what happened to this event?'"

requirements-completed: [TIMELINE-01, TIMELINE-02]

coverage:
  - id: D1
    description: "GET /api/v1/activities/<id>/timeline returns 200 with entries sorted ascending by `at`"
    requirement: "TIMELINE-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_event_timeline.py#test_timeline_returns_200_with_entries_sorted_ascending"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every timeline entry carries type, description and at"
    requirement: "TIMELINE-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_event_timeline.py#test_every_entry_carries_type_description_and_at"
        status: pass
    human_judgment: false
  - id: D3
    description: "An activity with zero history returns an empty array; an unknown activity id 404s"
    requirement: "TIMELINE-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_event_timeline.py#test_activity_with_no_history_returns_an_empty_list"
        status: pass
      - kind: integration
        ref: "backend/tests/test_event_timeline.py#test_timeline_404s_on_an_unknown_activity"
        status: pass
    human_judgment: false
  - id: D4
    description: "The timeline is a projection — pre-backfill Registration/Attendance rows appear exactly once, with no double-count against audit rows"
    requirement: "TIMELINE-01"
    verification:
      - kind: unit
        ref: "backend/tests/test_event_timeline.py#test_pre_backfill_rows_are_projected_from_the_tables_without_duplicating"
        status: pass
    human_judgment: false
  - id: D5
    description: "registration_service.register() writes an activity-scoped AuditLog row"
    requirement: "TIMELINE-02"
    verification:
      - kind: integration
        ref: "backend/tests/test_event_timeline.py#test_register_writes_an_activity_scoped_audit_row"
        status: pass
    human_judgment: false
  - id: D6
    description: "attendance_service.check_in() writes one AuditLog row per new check-in and none on a repeat"
    requirement: "TIMELINE-02"
    verification:
      - kind: integration
        ref: "backend/tests/test_event_timeline.py#test_check_in_writes_one_audit_row_per_new_check_in_and_none_on_a_repeat"
        status: pass
    human_judgment: false
  - id: D7
    description: "expense_service.submit_expense() writes an AuditLog row keyed on the activity, never a null entity_id"
    requirement: "TIMELINE-02"
    verification:
      - kind: integration
        ref: "backend/tests/test_event_timeline.py#test_submit_expense_audit_row_is_keyed_on_the_activity_not_null"
        status: pass
    human_judgment: false
  - id: D8
    description: "The timeline endpoint is reachable and guarded — timeline_bp is registered in ALL_BLUEPRINTS and the route carries an authorization guard"
    requirement: "TIMELINE-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_blueprint_registration.py#test_every_controller_blueprint_is_registered"
        status: pass
      - kind: integration
        ref: "backend/tests/test_rbac_enforcement.py#test_every_scoped_route_carries_at_least_one_guard"
        status: pass
      - kind: integration
        ref: "backend/tests/test_event_timeline.py#test_timeline_requires_authentication"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-08-19
status: complete
---

# Phase 6 Plan 01: Event Timeline & Audit Backfill Summary

**An event's history is now answerable in one GET, assembled entirely from rows other services already own — and the three services that had only ever claimed to record audit events now actually write them.**

## Performance

- **Duration:** ~40 min
- **Tasks:** 3/3
- **Files created:** 3
- **Files modified:** 4
- **Backend suite:** 387 passing (baseline was 378; the 9 new tests are this plan's)

## Accomplishments

- **TIMELINE-01 — the projection.** `GET /api/v1/activities/<id>/timeline` returns a chronological list of `{type, description, actor, method, at}` built from AuditLog, Registration, Attendance, CampaignPackage, Report and Expense. No table was added. Nothing in the read path writes, so the timeline cannot drift from the records it narrates.
- **TIMELINE-02 — the backfill.** `registration_service.register()`, `attendance_service.check_in()` and `expense_service.submit_expense()` now write AuditLog rows. The attendance write sits inside the existing idempotency guard, so a re-scan adds neither an Attendance row nor a second timeline entry.
- **A real bug fell out of it.** The one audit row `submit_expense()` did write was keyed on `expense.id` *before the flush* — and the UUID default is applied at INSERT, so `entity_id` was `None` on every "Expense submitted" row ever written. Those rows belonged to nothing and were reachable by no query. Now keyed on `activity_id`, which both fixes the null and puts the row where its two readers look.
- **The two-source problem is solved by a cutoff, not a flag.** Events that ran before the backfill have real Registration/Attendance rows and no audit rows; events after it have both. The projection takes each entity's earliest audit-row timestamp as a boundary and emits direct-table entries only for rows older than it — so an event straddling the backfill gets each half from exactly one source, which a per-entity on/off switch could not do.

## Task Commits

1. **Task 1: AuditLog backfill in three services (TIMELINE-02)** — `5521202` (feat)
2. **Task 2: Timeline service — chronological projection** — `8989119` (feat)
3. **Task 3: Timeline controller + blueprint registration** — `ef4f3cd` (feat)
4. **Deviation: test coverage for the plan's must-have truths** — `dde19d2` (test)

## Files Created/Modified

**Created**

- `backend/app/services/timeline_service.py` — `build_timeline(activity_id)`; the projection, the cutoff de-duplication, and the entry-type vocabulary (`proposal_submitted`, `admin_approved`, `registration`, `campaign_live`, `check_in`, `report_submitted`, `reimbursement_submitted`).
- `backend/app/controllers/timeline_controller.py` — `timeline_bp`, one GET route, guarded by `@auth_required`.
- `backend/tests/test_event_timeline.py` — 9 tests covering both requirements.

**Modified**

- `backend/app/services/registration_service.py` — activity-scoped `registration` audit row with JSON note; a flush so `reg.id` is real before it is recorded.
- `backend/app/services/attendance_service.py` — one `attendance` audit row per new check-in, carrying the row's `method` so QR check-in is picked up without a second edit here.
- `backend/app/services/expense_service.py` — `expense` audit row re-keyed to `activity_id`, enriched action, JSON note.
- `backend/app/controllers/__init__.py` — both halves of blueprint registration (import + `ALL_BLUEPRINTS`), additive only.

## Decisions Made

- **Guard is `@auth_required`, per the plan's locked `key_links`.** D-04 places the timeline on the organiser-only ManageEvent surface, so the UI is organiser-scoped, but the endpoint itself admits any authenticated user. That is the plan's stated contract and it was followed rather than tightened — see *Deferred Issues* below, because it is worth a deliberate second look.
- **Entry timestamps are normalised to naive UTC for sorting.** SQLite returns naive datetimes while `models._utcnow()` produces tz-aware ones, and Python refuses to order the two. Every timestamp in this schema means UTC, so dropping tzinfo loses nothing and makes the whole projection sortable in one pass.
- **Rows with no timestamp sort first rather than raising.** A timeline degrading in order is survivable; a 500 on a malformed legacy row is not.
- **Draft expenses are excluded.** REIMB-01 (plan 06-02) makes `draft` a pre-submission state, and a row nobody has submitted is not an event that happened. Filtering now means 06-02's drafts will not retroactively appear as timeline events.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] "Expense submitted" audit rows carried a null entity_id**

- **Found during:** Task 1
- **Issue:** `expense_service.submit_expense()` called `AuditRepository.record("expense", expense.id, ...)` immediately after `db.session.add(expense)` and before any flush. `Base.id` uses `default=_uuid`, which SQLAlchemy applies at INSERT, so `expense.id` was `None` at that point. Every "Expense submitted" row ever written has `entity_id = NULL` and is findable by no query.
- **Fix:** Added `db.session.flush()` and re-keyed the row to `expense.activity_id` — which is set at construction, is what the timeline queries, and is what `AuditRepository.for_entity()` is called with everywhere it is used (`proposal_service.audit_trail(activity_id)`). The expense id is preserved in the JSON `note`.
- **Why re-key rather than add a second row:** the plan's Task 1 text said "add" a record. Adding one would have left two audit rows for a single submission — the broken one and the new one. `for_entity()` has exactly one caller and it passes an activity id, so nothing read the old key.
- **Files modified:** `backend/app/services/expense_service.py`
- **Verification:** `test_submit_expense_audit_row_is_keyed_on_the_activity_not_null` asserts both that the row is findable by activity id and that no `entity_id IS NULL` expense rows exist.
- **Committed in:** `5521202`

**2. [Rule 2 - Missing verification] No test covered the plan's must-have truths**

- **Found during:** post-Task 3
- **Issue:** The plan defined four `must_haves.truths` (200 + ascending sort, entry keys, empty-array case, audit rows written by three services) and no task that would demonstrate any of them. `<verify>` blocks were import smoke-checks only, which would pass against a `build_timeline` that returned garbage.
- **Fix:** Added `backend/tests/test_event_timeline.py` — 9 tests, one or more per truth, plus the pre-backfill de-duplication case and the 404-vs-empty-list distinction.
- **Files modified:** `backend/tests/test_event_timeline.py` (new file; no other plan in this wave touches it, so no merge risk with 06-02/03/04)
- **Verification:** 9 passed; full suite 387 passed.
- **Committed in:** `dde19d2`

**3. [Rule 2 - Missing critical functionality] Timeline endpoint returned `[]` for a nonexistent activity**

- **Found during:** Task 3
- **Issue:** The plan's controller sketch called `build_timeline(activity_id)` unconditionally. An unknown id and an event with no history would both answer `200 []`, which makes a typo'd or deleted event indistinguishable from a brand-new one.
- **Fix:** The controller resolves the activity first and raises `ApiError(..., "event_not_found", 404)` when it is absent. The empty-array contract is preserved for real activities with no history.
- **Files modified:** `backend/app/controllers/timeline_controller.py`
- **Verification:** `test_timeline_404s_on_an_unknown_activity` and `test_activity_with_no_history_returns_an_empty_list` pin both halves.
- **Committed in:** `ef4f3cd`

**4. [Plan refinement] Two-source de-duplication**

- **Found during:** Task 2
- **Issue:** The plan's Task 2 listed AuditLog *and* direct Registration/Attendance/Expense queries as sources without saying how to reconcile them. Taken literally, every post-backfill check-in would appear twice.
- **Fix:** Per-entity cutoff (earliest audit-row timestamp); direct-table entries are emitted only for rows older than it. This implements D-06's "plus direct queries ... for events that predate the AuditLog backfill" precisely, including the straddling case.
- **Files modified:** `backend/app/services/timeline_service.py`
- **Verification:** `test_pre_backfill_rows_are_projected_from_the_tables_without_duplicating`; the sorted-order test covers the modern path.
- **Committed in:** `8989119`

---

**Total deviations:** 4 (1 × Rule 1 bug, 2 × Rule 2, 1 × plan refinement)
**Impact on plan:** No scope creep. `backend/app/models/__init__.py` is listed in the plan's `files_modified` but no task required a change to it, and none was made — deliberately, since plan 06-02 adds `social_post_url` there and an unnecessary edit would only create a conflict.

## Issues Encountered

- The test helper's proposal payload was initially rejected with `invalid_team` — a proposal must name exactly one Meetup Head (PROPOSAL-02). Fixed by seeding the `head@ekatva.os` fixture user into the team array.
- Frontend build was not re-run: no frontend file was touched by this plan.

## Deferred Issues

- **Timeline endpoint authorization is broader than the UI it serves.** `@auth_required` admits any authenticated student to any event's timeline, which includes attendee names in check-in descriptions. The plan locked this as a `key_links` must-have and it was honoured, but D-04 scopes the *surface* to organisers, so the endpoint is strictly wider than the feature. `can_manage_activity_required` would align them. Flagged for phase verification rather than changed unilaterally, because tightening it would break the plan's stated contract.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: information_disclosure | `backend/app/controllers/timeline_controller.py` | The timeline exposes attendee names and check-in times to any authenticated user, not only to the event's organisers. Guard is `@auth_required` per the plan's locked contract; see *Deferred Issues*. |

## Next Phase Readiness

Ready for the rest of the Phase 6 wave:

- **06-02 (reimbursement)** — `social_post_url` on Expense and its migration are untouched and unblocked. The timeline already excludes `EXPENSE_DRAFT` rows, so draft expenses will not surface as events. `expense_service.py` was edited additively inside `submit_expense()` only.
- **06-03 / 06-04** — `timeline_service.build_timeline()` and the endpoint are stable; the frontend ManageEvent panel (D-04) can render straight from the single response with no further backend work.
- `backend/app/models/__init__.py` and `backend/app/controllers/__init__.py` are both clean for additive edits by later plans.

## Self-Check: PASSED

Files verified present:

- `backend/app/services/timeline_service.py` FOUND
- `backend/app/controllers/timeline_controller.py` FOUND
- `backend/tests/test_event_timeline.py` FOUND

Commits verified in `git log`:

- `5521202` FOUND
- `8989119` FOUND
- `ef4f3cd` FOUND
- `dde19d2` FOUND

---
*Phase: 06-event-execution-close-out*
*Completed: 2026-08-19*
