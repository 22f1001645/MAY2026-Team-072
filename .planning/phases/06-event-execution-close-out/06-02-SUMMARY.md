---
phase: 06-event-execution-close-out
plan: 02
subsystem: api
tags: [flask, sqlalchemy, alembic, marshmallow, rbac, url-validation, pytest]

requires:
  - phase: 01-migration-authorization-foundation
    provides: "rbac.is_meetup_head — the single 'one accountable submitter' predicate, and can_manage_activity_required, the RBAC-02 scoped guard this route carries"
  - phase: 04-organisation-identity-public-profile
    provides: "app/url_safety.py — the ORG-02 URL validator reused verbatim for social_post_url (decision D-09)"
  - phase: 06-event-execution-close-out
    provides: "plan 06-01's timeline projection, which already excluded EXPENSE_DRAFT rows so this plan's drafts never surfaced as events"
provides:
  - "expenses.social_post_url — a nullable column and the Alembic revision cf7cb9577b67 (REIMB-02, decision D-10)"
  - "expense_service.draft_and_submit() — bulk upsert of expense drafts plus the Meetup Head's single submit transition"
  - "PATCH /api/v1/activities/<activity_id>/expenses — the one endpoint behind the ManageEvent Reimbursement panel"
  - "ExpenseDraftSchema / ExpenseDraftRowSchema — the draft list's request contract, partial-PATCH by row"
  - "A social-post link validated by the ORG-02 allowlist, with placeable rejection codes the panel can attach to the field"
affects: [06-03-feedback-reflection, 06-04-frontend, phase-7-progression-gating, admin-reimbursement-review]

actuals:
  tokens: 9300
  tasks: 3
  commits: 7

tech-stack:
  added: []
  patterns:
    - "Conditional authority in the service, not the route: a guard that cannot see the request body cannot enforce a rule that depends on it"
    - "Gate-before-mutate: every rejection an operation can produce is raised before the first row is touched, so a refused call leaves the working document untouched"
    - "Partial-PATCH by row: inside a list payload, None means 'not mentioned', never 'clear it'"
    - "Allowlist-by-search: a URL whose platform the client never names is offered to each allowed platform in turn, and the two failure modes are told apart by re-running the same validator without the host allowlist"

key-files:
  created:
    - backend/migrations/versions/cf7cb9577b67_add_expenses_social_post_url.py
    - backend/tests/test_expense_reimbursement.py
  modified:
    - backend/app/models/__init__.py
    - backend/app/schemas/__init__.py
    - backend/app/services/expense_service.py
    - backend/app/controllers/expense_controller.py
    - backend/app/services/timeline_service.py
    - backend/tests/test_schema_batch.py

key-decisions:
  - "The submit gate is rbac.is_meetup_head with NO admin fallback, against the plan's own sketch. The plan proposed `if not is_head and user.role != ROLE_ADMIN`, which contradicts both the plan's own must-have truth ('submit from a non-Meetup-Head returns 403') and the predicate's documented contract. An admin's power under PROPOSAL-05 is to REASSIGN the Meetup Head, which is a different power from acting as one."
  - "The route guard is can_manage_activity_required, not meetup_head_required, because the Meetup Head rule is conditional on the `submit` flag in the body and a route guard cannot see the body. The broad question (may this person touch this event's expenses?) belongs on the route; the narrow one (is this call a submission?) belongs in the service."
  - "Every submit gate runs BEFORE the first row is touched, following org_profile_service.replace_social_links. A submit the caller was not allowed to make must not half-save the rows it carried."
  - "An expense id in the body naming another event's row is a 404, not a silent skip. The route guard only ever checked the id in the URL."
  - "A row that has left draft can no longer be edited through this endpoint (409). Otherwise an approved figure could change after approval."
  - "social_post_url is searched across the ORG-02 platform allowlist rather than taking a platform parameter, because the panel is one text input. A malformed value keeps social_url_scheme and a well-formed non-social one keeps social_url_host — different user corrections, different codes."
  - "The column is String(500) while the validator caps a URL at 300. Deliberate headroom, not a second competing bound."

patterns-established:
  - "Conditional-authority split: broad predicate on the route, body-dependent predicate in the service (REIMB-01/02, reusable for FEEDBACK-01's draft/submit in plan 06-03)"
  - "Gate-before-mutate on any endpoint that both saves and transitions in one call"
  - "validates_schema for a required-field rule that depends on another field in the same object (label required only when id is absent)"

requirements-completed: [REIMB-01, REIMB-02]

coverage:
  - id: D1
    description: "Expense has a nullable social_post_url column and to_dict() reports it"
    requirement: "REIMB-02"
    verification:
      - kind: unit
        ref: "backend/tests/test_expense_reimbursement.py#test_expense_carries_social_post_url_and_reports_it"
        status: pass
      - kind: integration
        ref: "backend/tests/test_schema_batch.py#test_fresh_database_upgrades_to_full_schema_in_one_run"
        status: pass
    human_judgment: false
  - id: D2
    description: "PATCH with submit=false creates and updates draft expense rows, and editing a row does not duplicate it"
    requirement: "REIMB-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_draft_creates_rows_without_submitting_them"
        status: pass
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_draft_updates_an_existing_row_rather_than_duplicating_it"
        status: pass
    human_judgment: false
  - id: D3
    description: "PATCH with submit=true from a non-Meetup-Head returns 403 — including an admin"
    requirement: "REIMB-02"
    verification:
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_submit_from_a_team_member_who_is_not_the_meetup_head_is_403"
        status: pass
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_submit_from_an_admin_is_403_too"
        status: pass
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_a_refused_submit_leaves_the_draft_list_exactly_as_it_was"
        status: pass
    human_judgment: false
  - id: D4
    description: "PATCH with submit=true and no social_post_url returns 422"
    requirement: "REIMB-02"
    verification:
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_submit_without_a_social_post_url_is_422"
        status: pass
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_submit_with_a_blank_social_post_url_is_422_not_400"
        status: pass
    human_judgment: false
  - id: D5
    description: "A social_post_url that is malformed or off-allowlist is refused by the ORG-02 validator with a placeable code"
    requirement: "REIMB-02"
    verification:
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_a_hostile_scheme_is_rejected_by_the_org_02_validator"
        status: pass
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_a_well_formed_url_that_is_not_a_social_post_is_rejected_on_the_host"
        status: pass
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_a_suffix_lookalike_host_is_rejected"
        status: pass
    human_judgment: false
  - id: D6
    description: "PATCH with submit=true, a valid social_post_url and the Meetup Head transitions every draft to submitted and stamps the URL"
    requirement: "REIMB-02"
    verification:
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_submit_transitions_every_draft_and_stamps_the_url"
        status: pass
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_submit_can_save_the_last_row_and_submit_it_in_one_call"
        status: pass
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_submit_writes_one_activity_keyed_audit_row"
        status: pass
    human_judgment: false
  - id: D7
    description: "The endpoint is activity-scoped: an outsider is refused and an unknown event 404s, and an expense belonging to another event cannot be edited through one the caller does manage"
    requirement: "REIMB-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_the_endpoint_refuses_someone_with_no_authority_over_the_event"
        status: pass
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_an_unknown_event_404s"
        status: pass
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_a_row_belonging_to_another_event_cannot_be_edited_through_this_one"
        status: pass
      - kind: integration
        ref: "backend/tests/test_rbac_enforcement.py#test_every_scoped_route_carries_at_least_one_guard"
        status: pass
    human_judgment: false
  - id: D8
    description: "A draft expense is not a timeline event; a submitted reimbursement appears exactly once"
    requirement: "REIMB-01"
    verification:
      - kind: integration
        ref: "backend/tests/test_expense_reimbursement.py#test_drafts_are_not_timeline_events_but_a_submission_is"
        status: pass
      - kind: unit
        ref: "backend/tests/test_event_timeline.py#test_pre_backfill_rows_are_projected_from_the_tables_without_duplicating"
        status: pass
    human_judgment: false

duration: 60min
completed: 2026-08-19
status: complete
---

# Phase 6 Plan 02: Reimbursement Draft & Meetup Head Submit Summary

**The expense list is now a working document anyone on the team can build, and turning it into a reimbursement request is one person's signature — the Meetup Head's, against a social-post link the server actually checks.**

## Performance

- **Duration:** ~60 min
- **Tasks:** 3/3
- **Files created:** 2
- **Files modified:** 6
- **Backend suite:** 407 passing (baseline 387; the 20 new tests are this plan's)
- **Migrations:** exactly one new revision, `cf7cb9577b67`; `flask db upgrade` clean, `flask db check` reports no remaining drift

## Accomplishments

- **REIMB-01 — drafting is open.** `PATCH /api/v1/activities/<activity_id>/expenses` upserts the whole expense list in one call. Any team member (or POR holder, or the organiser) may create rows, edit them, and come back to them tomorrow; nothing about that counts as a submission. A row can be edited by id, and an edit carrying only an amount says nothing about the label.
- **REIMB-02 — submitting is closed.** The same call with `submit: true` transitions every draft on the event to `submitted` and stamps the social-post URL on each of them, but only for the assigned Meetup Head and only with a URL that survives the Phase 4 validator. That is one call because it is one button (D-11): the Submit action both commits the row still being typed and closes the list, and splitting it into two endpoints would let those halves land in either order.
- **`expenses.social_post_url` and its one migration.** Additive, nullable, reversible — `cf7cb9577b67`, chained onto the Phase 4 head. Nullable because the column is meaningless on a draft row: the requirement is enforced at the one moment it is actually true, in the service, not by a NOT NULL that would make REIMB-01 impossible.
- **The URL is validated, not pattern-matched.** D-09 said reuse `url_safety.py`; the plan's sketch left it as a comment. It is now a real call. `javascript://instagram.com/%0aalert(1)` parses to an allowlisted host and is caught only by that module's unconditional scheme check — which is the entire reason the decision points at it rather than at a regex.
- **A duplicate timeline entry fell out of it.** Separating a bill's creation from its submission broke an assumption in plan 06-01's projection, which reported every draft-then-submit reimbursement twice. Found by a test written from this side of the seam, fixed in one line (see *Deviations*).

## Task Commits

1. **Task 1: `social_post_url` on Expense + migration** — `987e34d` (feat)
2. **Deviation: migration-count ledger** — `81e5906` (test)
3. **Task 2: `draft_and_submit()` + `ExpenseDraftSchema`** — `ac7b9e7` (feat)
4. **Task 3: PATCH draft endpoint** — `006240a` (feat)
5. **Deviation: timeline double-counted a reimbursement** — `45c0245` (fix)
6. **Deviation: partial-PATCH semantics on an expense row** — `0168791` (fix)
7. **Deviation: test coverage for the must-have truths** — `34693f0` (test)

## Files Created/Modified

**Created**

- `backend/migrations/versions/cf7cb9577b67_add_expenses_social_post_url.py` — the one revision, additive and nullable, with the D-10 rationale in its docstring.
- `backend/tests/test_expense_reimbursement.py` — 20 tests. No other plan in this wave touches this file.

**Modified**

- `backend/app/models/__init__.py` — `Expense.social_post_url` (String(500), nullable) plus the `to_dict()` key. Additive only; nothing else in the file moved.
- `backend/app/schemas/__init__.py` — `ExpenseDraftRowSchema` and `ExpenseDraftSchema`, inserted above `BroadcastSchema`. Additive; no existing schema touched.
- `backend/app/services/expense_service.py` — `_URL_REJECTION_MESSAGES`, `_validated_social_post_url()`, `draft_and_submit()`, added above `advance()`. `submit_expense()` and the admin pipeline functions are untouched, including plan 06-01's audit re-keying.
- `backend/app/controllers/expense_controller.py` — one new PATCH route and two import lines. `expense_bp` was already in `ALL_BLUEPRINTS`, so `controllers/__init__.py` needed no edit at all.
- `backend/app/services/timeline_service.py` — one condition in section 6 (deviation 5).
- `backend/tests/test_schema_batch.py` — the migration-count ledger, updated as that file's own comment instructs.

## Decisions Made

- **No admin short-circuit on the submit gate.** The plan's Task 2 sketch wrote `if not is_head and user.role != ROLE_ADMIN`. That was not followed. It contradicts the plan's own must-have truth ("submit from a non-Meetup-Head returns 403"), and `rbac.is_meetup_head` carries a docstring saying, in terms, that adding a fallback there would silently turn three separate "only the Meetup Head submits" rules into "the Meetup Head or anyone senior to them". `test_submit_from_an_admin_is_403_too` now pins it, with a note in the test saying that if it ever fails the fix is to remove the fallback, not to update the expectation.
- **The Meetup Head check goes through `rbac.is_meetup_head`, not a hand-written `ActivityTeamMember` query.** The plan's sketch inlined the query. Two copies of an authority rule is how they drift; the plan's `key_links` describes the query the shared predicate already makes.
- **Route guard is broad, service gate is narrow.** `can_manage_activity_required` on the route answers the question every call must answer. The submit rule depends on a flag in the body, which no route guard can read, so it lives where the flag does.
- **`submitted_by` on a draft row records who entered the bill, not who submitted it.** The submitter is recorded on the audit row instead. Changing the column's meaning at submit time would erase the only trace of who did the work.
- **Empty is not malformed.** A blank or whitespace `social_post_url` on submit is `missing_social_url` (422); a real string that fails the validator is `social_url_scheme` or `social_url_host` (400). Those are two different corrections — "fill this in" and "that is not a link" — and the panel renders them differently.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Security] The plan's submit gate admitted any admin**

- **Found during:** Task 2
- **Issue:** The sketch's `if not is_head and user.role != ROLE_ADMIN: raise 403` lets an admin submit a reimbursement. That contradicts the plan's own must-have truth and RBAC-03's documented contract for `is_meetup_head`.
- **Fix:** `if not is_meetup_head(user, activity)` — no fallback, and routed through the shared predicate rather than an inlined query.
- **Files modified:** `backend/app/services/expense_service.py`
- **Verification:** `test_submit_from_an_admin_is_403_too`, `test_submit_from_a_team_member_who_is_not_the_meetup_head_is_403`
- **Committed in:** `ac7b9e7`

**2. [Rule 2 - Security] An expense id from another event was silently honoured**

- **Found during:** Task 2
- **Issue:** The sketch guarded the edit with `if expense and expense.activity_id == activity_id:` but appended `expense` to the result list unconditionally — so an id naming another event's row (or no row at all) fell through the `if` and was then reported back as if it had been edited. The route guard only ever checks the id in the URL, so the body is an unchecked second identifier.
- **Fix:** An id that resolves to nothing, or to a row on another activity, raises `expense_not_found` (404). Nothing is silently skipped.
- **Files modified:** `backend/app/services/expense_service.py`
- **Verification:** `test_a_row_belonging_to_another_event_cannot_be_edited_through_this_one` — asserts both the 404 and that the foreign row is unchanged.
- **Committed in:** `ac7b9e7`

**3. [Rule 2 - Missing critical functionality] A submitted bill could be rewritten through the draft endpoint**

- **Found during:** Task 2
- **Issue:** The sketch's edit branch had no status check, so a team member could PATCH an amount on a row already sitting at `verified` or `approved` in the admin pipeline. An approved figure that can still change is not an approved figure.
- **Fix:** Edits are refused with `expense_not_draft` (409) once a row has left `EXPENSE_DRAFT`.
- **Files modified:** `backend/app/services/expense_service.py`
- **Verification:** `test_an_already_submitted_row_can_no_longer_be_edited`
- **Committed in:** `ac7b9e7`

**4. [Rule 2 - Missing critical functionality] The URL validation was a comment**

- **Found during:** Task 2
- **Issue:** The sketch carried `# ... url_safety.check(social_post_url)` as a placeholder, and no such function exists — the module's public API is `check_social_url(raw, platform)` / `check_website_url(raw)`. Shipping the placeholder would have stored whatever string arrived, which is the exact failure D-09 exists to prevent.
- **Fix:** `_validated_social_post_url()` offers the URL to each of the six `SOCIAL_PLATFORMS` in turn and takes the first acceptance. When all refuse, `check_website_url` re-runs the same controls without the host allowlist to distinguish "malformed" (`social_url_scheme`) from "a fine URL that is not a social post" (`social_url_host`). The stored value is the validator's normalised form, not the raw input.
- **Files modified:** `backend/app/services/expense_service.py`
- **Verification:** three tests — hostile scheme, off-allowlist host, suffix lookalike (`instagram.com.evil.example`).
- **Committed in:** `ac7b9e7`

**5. [Rule 2 - Missing critical functionality] A refused submit half-saved its rows**

- **Found during:** Task 2
- **Issue:** The sketch upserted every row first and checked the submit gates afterwards. A 403 or a bad URL would leave the session carrying rows the caller was told had not been saved.
- **Fix:** All three submit gates (authority, missing URL, malformed URL) run before the loop, following `org_profile_service.replace_social_links`. Also added a `no_expenses` 422 so a submit with nothing drafted cannot write a phantom audit row.
- **Files modified:** `backend/app/services/expense_service.py`
- **Verification:** `test_a_refused_submit_leaves_the_draft_list_exactly_as_it_was`, `test_submitting_nothing_is_422`
- **Committed in:** `ac7b9e7`

**6. [Rule 3 - Blocking] The migration-count ledger refused the new revision**

- **Found during:** post-Task 2 suite run
- **Issue:** `tests/test_schema_batch.py` pins the head revision and the total revision count to enforce the SCHEMA-02 one-batch invariant. Two tests failed the moment `cf7cb9577b67` existed.
- **Fix:** Head updated to `cf7cb9577b67`, count 7 → 8, with the note the file's own comment asks for ("deliberately, in a review, alongside a note saying which revision was added and why"). This is the file's designed behaviour, not a broken test.
- **Files modified:** `backend/tests/test_schema_batch.py`
- **Verification:** `test_exactly_one_migration_head`, `test_exactly_two_revisions`
- **Committed in:** `81e5906`

**7. [Rule 1 - Bug] The timeline reported every post-backfill reimbursement twice**

- **Found during:** post-Task 3, by `test_drafts_are_not_timeline_events_but_a_submission_is`
- **Issue:** Plan 06-01's section 6 emits a direct-table reimbursement entry when the earliest non-draft expense `_predates` the activity's audit cutoff. That was sound while `submit_expense()` created and submitted a row in one call, so `created_at` ≈ the submission. REIMB-01 separates them by however long the organiser takes to gather receipts, so a draft created on Monday and submitted on Friday always predates its own audit row — and the timeline emitted both entries. Verified: 2 `reimbursement_submitted` entries for a single submission.
- **Fix:** Section 6 reads the cutoff as a presence check (`cutoffs.get("expense") is None`) rather than a timestamp comparison. It emits one entry per *activity* and the audit row it would duplicate is activity-keyed too, so "does this activity have an expense audit row at all?" is the whole question. Sections 3 and 4 keep the timestamp comparison — they emit one entry per *row* and still need to date each one individually.
- **Files modified:** `backend/app/services/timeline_service.py` (one condition; outside this plan's `files_modified`, but the defect is caused by this plan's change and would have shipped as a visible duplicate)
- **Verification:** `test_drafts_are_not_timeline_events_but_a_submission_is` asserts exactly one entry; plan 06-01's own nine timeline tests still pass, including the pre-backfill de-duplication case.
- **Committed in:** `45c0245`

**8. [Rule 1 - Bug] An omitted field on an expense edit would have cleared it**

- **Found during:** post-Task 3, by two tests that PATCH only an amount
- **Issue:** Two coupled defects. `ExpenseDraftRowSchema` required `label` on every row, so editing only an amount was a 422 — but a draft list is exactly where partial edits happen. And the service read fields with `row.get("label", expense.label)`, which returns the *default* only when the key is absent; Marshmallow fills every absent key with its `load_default`, so once `label` became optional that expression would have written `None` over a perfectly good label.
- **Fix:** Every row field is nullable, and only non-`None` values are applied (`EditEventSchema` / `TaskPatchSchema` partial-PATCH rule). A NEW row still needs a label, but that rule depends on whether `id` is present, so it moved to a `validates_schema` hook that can see the whole row.
- **Files modified:** `backend/app/schemas/__init__.py`, `backend/app/services/expense_service.py`
- **Verification:** `test_draft_updates_an_existing_row_rather_than_duplicating_it`, `test_an_already_submitted_row_can_no_longer_be_edited` (both PATCH without a label)
- **Committed in:** `0168791`

**9. [Rule 2 - Missing verification] No test covered the plan's must-have truths**

- **Found during:** post-Task 3
- **Issue:** The plan defined six behavioural truths and three `<verify>` blocks, all of which were `python -c "import ..."` smoke checks. Every one of them would pass against a `draft_and_submit` that returned an empty dict.
- **Fix:** `backend/tests/test_expense_reimbursement.py` — 20 tests, at least one per truth, plus the security cases above and the seam with 06-01's timeline in both directions. Deviations 7 and 8 were both found by these tests, not by inspection.
- **Files modified:** `backend/tests/test_expense_reimbursement.py` (new)
- **Verification:** 20 passed; full suite 407 passed.
- **Committed in:** `34693f0`

---

**Total deviations:** 9 (2 × Rule 1 bug, 6 × Rule 2, 1 × Rule 3)
**Impact on plan:** No scope creep. Every task in the plan shipped. One file outside `files_modified` was touched (`timeline_service.py`, one condition) because this plan's feature introduced a defect in it; one test file outside it (`test_schema_batch.py`) because that file exists to be updated when a migration lands. `backend/app/controllers/__init__.py` was NOT touched — `expense_bp` was already registered — so plans 06-03 and 06-04 inherit it exactly as 06-01 left it.

## Issues Encountered

- **The regional monthly quota guardrail.** A test needing two activities in the same region got a 409 `quota_exceeded` on the second. The helper now takes `starts_at` so the two land in different months; the guardrail is correct and was not touched.
- **`flask db migrate` needed a schema to diff against.** `backend/instance/ekatva.db` was a zero-byte file, so autogenerate would have proposed creating all 34 tables. Running the existing chain to head first made the diff exactly one column. The database file is gitignored and was not committed.
- Frontend was not built or run: no frontend file was touched by this plan.

## Deferred Issues

- **`social_post_url` has no read-side gate.** ORG-02's central lesson was that a URL is validated at save time *and* re-checked before it is ever rendered, because rows can pre-date a validator, arrive from a direct database edit, or come from a future bug — `org_profile_service.public_profile()` therefore calls `is_renderable_social_url` on the way out. `Expense.to_dict()` returns `social_post_url` raw. Every value written by this plan passed the validator, so nothing is wrong today, but the admin reimbursement review surface and plan 06-04's panel will both render it. Flagged rather than fixed here: adding a read-side gate changes `to_dict()`, which is on the response path of four existing endpoints, and that is a change worth making deliberately in the frontend plan rather than as a silent widening of this one.
- **The `EXPENSE_DRAFT` → `submitted` transition is one-way.** There is no un-submit. D-11 describes the flow as one-way and the admin pipeline takes over at `submitted`, so this matches the decision — but a Meetup Head who submits with the wrong social link currently has no route back. Worth a look during phase verification.

## Known Stubs

None.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: stored_xss_surface | `backend/app/models/__init__.py` | `Expense.to_dict()` returns `social_post_url` without the read-side render gate that ORG-02 applies to every other user-supplied URL in this codebase. Write-path validation is in place; see *Deferred Issues*. |

## Next Phase Readiness

- **06-03 (reflection & feedback)** — `backend/app/schemas/__init__.py` and `backend/app/controllers/__init__.py` are both clean for additive edits; the latter was not touched at all. The conditional-authority pattern here (broad guard on the route, `is_meetup_head` in the service, gated on a body flag) is exactly the shape FEEDBACK-01's draft/submit report needs, and `rbac.is_meetup_head` is the same predicate.
- **06-04 (frontend)** — one endpoint backs the whole Reimbursement panel: `PATCH /api/v1/activities/:id/expenses`, returning `{expenses: [...], submitted: bool}` on every call, so the panel can render straight from the response of both a save and a submit. Rejection codes the panel should place on the field: `missing_social_url` (422), `social_url_scheme` and `social_url_host` (400, both carrying `details.field = "social_post_url"`), `expense_not_draft` (409), `no_expenses` (422). The Meetup Head gate is a 403 with code `forbidden`; the D-08 disabled-button-with-tooltip treatment should mirror Phase 5's push-live pattern.
- **Migrations** — head is `cf7cb9577b67`, single head, `flask db check` clean. A later plan adding a revision must update `test_schema_batch.py`'s ledger to 9.

## Self-Check: PASSED

Files verified present:

- `backend/migrations/versions/cf7cb9577b67_add_expenses_social_post_url.py` FOUND
- `backend/tests/test_expense_reimbursement.py` FOUND

Commits verified in `git log`:

- `987e34d` FOUND
- `81e5906` FOUND
- `ac7b9e7` FOUND
- `006240a` FOUND
- `45c0245` FOUND
- `0168791` FOUND
- `34693f0` FOUND

---
*Phase: 06-event-execution-close-out*
*Completed: 2026-08-19*
