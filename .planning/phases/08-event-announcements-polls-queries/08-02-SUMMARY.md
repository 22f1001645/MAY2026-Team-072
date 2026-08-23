---
phase: 08-event-announcements-polls-queries
plan: 02
subsystem: api
tags: [flask, marshmallow, sqlalchemy, queries, qa, rbac, audit-log]

requires:
  - phase: 01-foundation
    provides: EventQuery table, QUERY_OPEN/QUERY_ANSWERED constants, can_manage_activity_required, AuditRepository
  - phase: 05-post-acceptance-pipeline
    provides: can_participate_in_activity predicate and the registration rows it reads
  - phase: 08-event-announcements-polls-queries
    plan: 01
    provides: channel_service.py (_activity_or_404, _assert_channel_open, AuditRepository import), channel_bp registered in ALL_BLUEPRINTS
provides:
  - channel_service.py — submit_query / list_queries / my_queries / respond_query (+ _query_or_404)
  - QuerySubmitSchema / QueryRespondSchema request validation
  - POST + GET /api/v1/events/<id>/queries, GET .../queries/mine, POST .../queries/<qid>/respond
affects: [08-05 frontend Q&A hooks and QuerySection, 08-04 EventChannelSection, 08-06 verification]

actuals:
  tokens: 1500
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Query submission gated by _assert_channel_open (EVENT_LIVE); respond deliberately ungated (D-17)"
    - "One team response per query enforced by a status check that 409s rather than overwriting an answer already read"
    - "_query_or_404 scopes the query to the activity in the URL, mirroring 08-01's _poll_or_404"

key-files:
  created: []
  modified:
    - backend/app/schemas/__init__.py
    - backend/app/services/channel_service.py
    - backend/app/controllers/channel_controller.py

key-decisions:
  - "submit_query's participation gate is rbac.can_participate_in_activity, not the plan's literal RegistrationRepository.find — the predicate excludes cancelled registrations and admits organisers, matching D-08 and 08-01's cast_vote"
  - "_query_or_404 checks the query belongs to the activity in the URL, because can_manage_activity_required authorises against the path's activity and a bare query id would otherwise be answerable through any other event"
  - "GET /queries/mine is auth_required rather than team-gated — it is scoped to g.current_user in the service and can only ever return the caller's own rows (D-11)"
  - "respond_query writes the audit row after the status transition and before the commit; no flush is needed because the query id already exists (unlike 08-01's create_poll)"

patterns-established:
  - "Team moderation actions (respond_query) write AuditLog rows; routine attendee actions (submit_query) do not (D-16), matching cast_vote"
  - "Post-event surfaces the team still needs (close_poll, respond_query) stay outside the _assert_channel_open gate, documented once in the module docstring"

requirements-completed: []

coverage:
  - id: D1
    description: "POST /api/v1/events/<id>/queries lets a registered attendee submit a question (201, status open), 422s a body under 5 chars, 409s registration_window_closed on a non-live event, 403s a non-registrant and a cancelled registrant"
    requirement: CHAT-02
    verification:
      - kind: integration
        ref: "throwaway smoke suite (backend/tests/test_zz_smoke_queries_tmp.py, run then deleted — 08-06 owns the permanent tests): test_query_lifecycle, test_submit_blocked_when_event_not_live, test_non_registrant_cannot_submit, test_cancelled_registration_cannot_submit"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /api/v1/events/<id>/queries/mine returns only the caller's own questions and their answers"
    requirement: CHAT-02
    verification:
      - kind: integration
        ref: "throwaway smoke suite: test_query_lifecycle (student sees 1 row, organiser's /mine is [] on the same event, and the answer appears under the student's own row)"
        status: pass
    human_judgment: false
  - id: D3
    description: "GET /api/v1/events/<id>/queries returns all queries for the event and is refused (403) for a registrant who cannot manage the activity"
    requirement: CHAT-03
    verification:
      - kind: integration
        ref: "throwaway smoke suite: test_query_lifecycle"
        status: pass
    human_judgment: false
  - id: D4
    description: "POST /api/v1/events/<id>/queries/<qid>/respond answers an open query (200, status answered, responded_by/responded_at set), 409 already_answered on a second attempt, 403 for a registrant, 404 for a query belonging to another event, and stays reachable after the event is no longer live"
    requirement: CHAT-03
    verification:
      - kind: integration
        ref: "throwaway smoke suite: test_query_lifecycle, test_cross_event_query_id_is_404, test_respond_still_works_after_event_ends"
        status: pass
    human_judgment: false
  - id: D5
    description: "respond_query writes exactly one AuditLog row keyed on the query id; submit_query writes none"
    requirement: CHAT-03
    verification:
      - kind: integration
        ref: "throwaway smoke suite: test_query_lifecycle asserts AuditLog.query.filter_by(entity='query') has exactly 1 row with entity_id == qid and action == 'Query answered', after one submit and one respond"
        status: pass
    human_judgment: false

duration: 40min
completed: 2026-08-23
status: complete
---

# Phase 8 Plan 02: Query (Q&A) Backend Summary

**The full CHAT-02/CHAT-03 question-and-answer loop on the existing `channel_bp`: a registered attendee asks the organising team a question inside the live event window, the team reads every question and answers each one exactly once, and the registrant sees their own thread and nobody else's.**

## Performance

- **Duration:** ~40 min
- **Started:** 2026-08-23
- **Completed:** 2026-08-23
- **Tasks:** 2
- **Files modified:** 3 (0 created, 3 modified)

## Accomplishments

- `QuerySubmitSchema` (body 5-1000) and `QueryRespondSchema` (response_body 1-2000) validate both write paths at the trust boundary.
- `channel_service.py` gained the four query functions plus `_query_or_404`: submit (EVENT_LIVE-gated + participation-gated, unlogged), list-all (team), list-mine (caller-scoped), respond (ungated, one-shot, audited).
- `channel_controller.py` exposes the four routes on the blueprint 08-01 created — team routes behind `can_manage_activity_required`, attendee routes behind `auth_required` and narrowed inside the service.
- Verified end to end against the real HTTP stack with a throwaway 6-test smoke suite covering every acceptance criterion plus five negative controls (short body, non-live event, non-registrant, cancelled registrant, cross-event query id, double-answer). All passed; the file was deleted afterwards because 08-06 owns the permanent tests.

## Task Commits

1. **Task 1: Schemas and service for event queries** - `c440b1b` (feat)
2. **Task 2: Query controller endpoints** - `a99c31e` (feat)

## Files Created/Modified

- `backend/app/schemas/__init__.py` - `QuerySubmitSchema`, `QueryRespondSchema` added beside the poll schemas.
- `backend/app/services/channel_service.py` - `_query_or_404`, `submit_query`, `list_queries`, `my_queries`, `respond_query`; module docstring extended to cover the query rules alongside the poll ones.
- `backend/app/controllers/channel_controller.py` - the four query routes; module docstring updated to explain why `/queries/mine` is `auth_required` rather than team-gated.

## Decisions Made

- **`submit_query` uses `rbac.can_participate_in_activity`, not the plan's literal `RegistrationRepository.find(...) is not None or organiser`.** This is the deviation 08-01 flagged in its handoff and is what D-08 actually specifies. The predicate is strictly more correct on two edges the raw find misses: a *cancelled* registration must not grant the right to ask, and an organiser with no registration row must still be able to. Negative-controlled both ways in the smoke run.
- **`_query_or_404` verifies the query belongs to the activity in the URL.** Same reasoning as 08-01's `_poll_or_404`, and the same real hole: `can_manage_activity_required` authorises the caller against the activity in the *path*, so without the ownership check an organiser of event B could answer (and disclose the existence of) a query belonging to event A by naming A's query id in B's URL. Verified by a negative control — cross-event respond returns 404 and A's query is still `open` afterwards.
- **`/queries/mine` is `auth_required`, not team-gated.** The route takes no user parameter; the service filters on `g.current_user.id`, so the strongest available authorisation is already structural. Gating it further would lock a registrant out of their own questions, which is the whole point of D-11.
- **No `db.session.flush()` before the audit write** — unlike `create_poll`, `respond_query` operates on a row that already has an id, so `AuditLog.entity_id` is correct without one. Asserted rather than assumed (the smoke suite checks `entity_id == qid`).

## Deviations from Plan

**1. [Rule 1 - Correctness] Participation gate widened to `can_participate_in_activity`**
- **Found during:** Task 1
- **Issue:** The plan's action text specifies `RegistrationRepository.find(activity_id, current_user.id) is not None` or organiser. That literal check treats a *cancelled* registration as a live one and needs a separate organiser branch bolted on.
- **Fix:** Called `rbac.can_participate_in_activity(current_user, activity)`, which is exactly "live registration OR can manage" — the predicate D-08 names and the one 08-01's `cast_vote` already uses, so the two attendee write paths cannot drift.
- **Files modified:** `backend/app/services/channel_service.py`
- **Verification:** Smoke run — registered student submits (201), unregistered user 403, cancelled registrant 403.
- **Committed in:** `c440b1b` (Task 1 commit)

**2. [Rule 2 - Missing Critical] Cross-event query id was answerable through any event's URL**
- **Found during:** Task 1
- **Issue:** The plan says "fetch query by `id=query_id` and `activity_id=activity_id`. If not found, raise 404" — correct in intent, but stated as an inline filter with no named helper, and the security reasoning was not recorded anywhere a later editor would see it. 08-01 hit the identical hole on polls.
- **Fix:** Extracted `_query_or_404(activity_id, query_id)` mirroring `_poll_or_404`, with a docstring naming why the activity id is checked rather than trusted.
- **Files modified:** `backend/app/services/channel_service.py`
- **Verification:** Negative control in the smoke run — answering event A's query through event B's URL returns 404, and A's query is still `open`.
- **Committed in:** `c440b1b` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 correctness, 1 missing critical)
**Impact on plan:** Both keep the authorization boundary the plan already intended and align this plan's attendee gate with 08-01's. No scope creep — no new files, no new endpoints, no schema change.

## Issues Encountered

- **Pre-existing suite failure, out of scope.** `tests/test_proposal_flow.py::test_full_spine_propose_approve_register_checkin_points` fails with a 400 on the attendance check-in step (`attendance_service.check_in` refuses with `checkin_too_early` because the seeded event starts 30 days out and check-in opens 2 hours before start). Re-confirmed pre-existing during this plan by running that test at `bc3de36` — the commit before any Phase 8 work — in a throwaway worktree; it fails identically there. Nothing in this plan touches attendance. Already logged in `deferred-items.md` by 08-01; not fixed (scope boundary).
- Full backend suite after this plan: the pre-existing failure is the **only** failure — no new ones, and no test in the suite changed behaviour.

## Known Stubs

None. All four endpoints read and write real `event_queries` rows end to end; nothing returns placeholder data.

## Threat Flags

None. The new surface is four routes inside the plan's intended boundary; both deviations narrow it rather than widen it. The one disclosure risk found (cross-event query id) is closed by `_query_or_404` and negative-controlled.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 08-05 (`QuerySection`) and 08-04 (`EventChannelSection`) can rely on these response shapes: every query route returns `EventQuery.to_dict()`, i.e. `{ id, activity_id, user_id, body, status, response_body, responded_by, responded_at, at }`. Note `at` (not `created_at`) is the creation timestamp key, and `responded_by` is a raw user id — **there is no author name on the payload**, so a UI that wants "asked by Arav" or "answered by <name>" needs `to_dict()` widened first. That was left alone here rather than changed speculatively, and it is the query-side equivalent of the `EventPoll.to_dict()` gap 08-01 flagged.
- The unanswered-count badge 08-CONTEXT's `<specifics>` asks for is derivable client-side from `GET /events/<id>/queries` by counting `status === "open"` — no extra endpoint needed.
- The permanent test suite for these endpoints is 08-06's job. The checks under `coverage:` were all run and passed here; the smoke file's shape (fixtures `crew@ekatva.os` / `arav@ekatva.os`, an `Activity` seeded with `status=EVENT_LIVE` plus a confirmed `Registration` row) can be lifted straight into 08-06.
- No requirement was marked complete. CHAT-02 and CHAT-03 are also owned by 08-04, 08-05 and 08-06 — the backend is reachable only by HTTP client until the Q&A UI lands, so ticking them here would be a false completion signal. This follows 08-01's precedent for CHAT-01 exactly.

## Self-Check: PASSED

- `backend/app/services/channel_service.py` — FOUND (contains `submit_query`, `list_queries`, `my_queries`, `respond_query`, `_query_or_404`)
- `backend/app/controllers/channel_controller.py` — FOUND (4 query routes present in `app.url_map`)
- `backend/app/schemas/__init__.py` — FOUND (`QuerySubmitSchema`, `QueryRespondSchema` importable)
- `.planning/phases/08-event-announcements-polls-queries/08-02-SUMMARY.md` — FOUND
- Commits `c440b1b`, `a99c31e` — both FOUND in git log
- Throwaway smoke suite deleted; `git status` clean apart from planning docs

---
*Phase: 08-event-announcements-polls-queries*
*Completed: 2026-08-23*
