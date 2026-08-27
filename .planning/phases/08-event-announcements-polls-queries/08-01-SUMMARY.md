---
phase: 08-event-announcements-polls-queries
plan: 01
subsystem: api
tags: [flask, marshmallow, sqlalchemy, polls, rbac, audit-log]

requires:
  - phase: 01-foundation
    provides: EventPoll / EventPollVote tables, uq_poll_vote unique constraint, POLL_OPEN/POLL_CLOSED constants, can_manage_activity_required
  - phase: 05-post-acceptance-pipeline
    provides: can_participate_in_activity predicate and the registration rows it reads
provides:
  - channel_service.py — create_poll / list_polls / cast_vote / close_poll
  - channel_controller.py + channel_bp registered in ALL_BLUEPRINTS
  - PollCreateSchema / PollVoteSchema request validation
  - POST + GET /api/v1/events/<id>/polls, POST .../vote, PATCH .../close
affects: [08-02 queries service on the same blueprint, 08-03 frontend poll hooks/types, 08-06 verification]

actuals:
  tokens: 5100
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Channel writes gated by _assert_channel_open (EVENT_LIVE) in the service, not on the route"
    - "Vote-once enforced by the DB constraint and translated to 409, never by a check-then-insert"

key-files:
  created:
    - backend/app/services/channel_service.py
    - backend/app/controllers/channel_controller.py
  modified:
    - backend/app/schemas/__init__.py
    - backend/app/controllers/__init__.py

key-decisions:
  - "cast_vote's participation check reuses rbac.can_participate_in_activity instead of a raw RegistrationRepository.find — the predicate already excludes cancelled registrations and already admits organisers, which a bare find() does not"
  - "_poll_or_404 checks the poll belongs to the activity in the URL, because the route guard authorises against the activity in the path and a bare poll id would otherwise be votable/closable through any other event"
  - "create_poll flushes before AuditRepository.record so entity_id is the poll's real id — the Phase 6 'expense submitted' audit row was keyed before the flush and belonged to nothing"
  - "list_polls returns my_vote: None for an anonymous/absent viewer_id rather than matching a null user_id against votes"

patterns-established:
  - "One blueprint per channel surface: channel_bp owns polls now and queries in 08-02, keeping registration_controller.py to registration plumbing"
  - "Organiser moderation actions (create/close) write AuditLog rows; routine attendee actions (vote) do not (D-16)"

requirements-completed: [CHAT-01]

coverage:
  - id: D1
    description: "POST /api/v1/events/<id>/polls creates a poll with options when the caller can manage the activity, rejects a non-live event with 409, and writes a 'Poll created' audit row"
    requirement: CHAT-01
    verification:
      - kind: integration
        ref: "throwaway smoke suite (backend/tests/test_zz_smoke_polls_tmp.py, run then deleted — 08-06 owns the permanent tests): test_poll_lifecycle, test_create_poll_blocked_when_event_not_live, test_bad_option_list_is_422"
        status: pass
    human_judgment: false
  - id: D2
    description: "GET /api/v1/events/<id>/polls returns every poll newest-first with a vote_counts array parallel to options and the caller's my_vote"
    requirement: CHAT-01
    verification:
      - kind: integration
        ref: "throwaway smoke suite: test_poll_lifecycle (asserts vote_counts == [0, 1], my_vote == 1 for the voter and None for the organiser)"
        status: pass
    human_judgment: false
  - id: D3
    description: "POST /api/v1/events/<id>/polls/<pid>/vote casts one vote, answers 409 already_voted on a repeat, 403 for a non-registrant, 400 for an out-of-range option"
    requirement: CHAT-01
    verification:
      - kind: integration
        ref: "throwaway smoke suite: test_poll_lifecycle"
        status: pass
    human_judgment: false
  - id: D4
    description: "PATCH /api/v1/events/<id>/polls/<pid>/close closes the poll, writes a 'Poll closed' audit row, and stays reachable after the event is no longer live"
    requirement: CHAT-01
    verification:
      - kind: integration
        ref: "throwaway smoke suite: test_poll_lifecycle, test_cross_event_poll_id_is_404"
        status: pass
    human_judgment: false
  - id: D5
    description: "channel_bp is registered in ALL_BLUEPRINTS and all four routes carry a resource-scoped or auth guard (RBAC-02)"
    verification:
      - kind: unit
        ref: "cd backend && python -c \"from app.controllers import channel_bp, ALL_BLUEPRINTS; assert channel_bp in ALL_BLUEPRINTS\"; plus tests/test_rbac_enforcement.py (whole suite: 478 passed)"
        status: pass
    human_judgment: false

duration: 45min
completed: 2026-08-23
status: complete
---

# Phase 8 Plan 01: Poll Backend Tracer Summary

**Full backend poll lifecycle on a new `channel_bp` blueprint — organiser-created polls gated to live events and audit-logged, registrant votes made idempotent by `uq_poll_vote`, and a list endpoint that returns per-option counts plus the caller's own vote.**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-08-23
- **Completed:** 2026-08-23
- **Tasks:** 3
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- `channel_service.py` implements the whole poll lifecycle: create (EVENT_LIVE-gated + audited), list (eager-loaded votes, per-option counts, `my_vote`), vote (constraint-backed vote-once → 409), close (ungated + audited).
- `channel_controller.py` exposes the four endpoints on a new `channel_bp`, registered in `ALL_BLUEPRINTS`; 08-02's query endpoints land on the same blueprint.
- `PollCreateSchema` / `PollVoteSchema` validate the write paths (question 5-300 chars, 2-6 options of 1-100 chars, `option_index >= 0`).
- Verified end to end against the real HTTP stack: create/vote/double-vote/non-registrant/out-of-range/list/close/cross-event-404 all behave as specified, and the full backend suite is unchanged at 478 passed.

## Task Commits

1. **Task 1: Schemas for polls** - `928a999` (feat)
2. **Task 2: channel_service.py poll lifecycle** - `d0120a8` (feat)
3. **Task 3: channel_controller.py + blueprint registration** - `6cd2d68` (feat)

## Files Created/Modified

- `backend/app/services/channel_service.py` - poll business rules: channel-open gate, audit writes, vote aggregation, IntegrityError → 409.
- `backend/app/controllers/channel_controller.py` - the four poll routes; `can_manage_activity_required` on create/close, `auth_required` on read/vote.
- `backend/app/schemas/__init__.py` - `PollCreateSchema`, `PollVoteSchema` added beside `BroadcastSchema`.
- `backend/app/controllers/__init__.py` - `channel_bp` imported and appended to `ALL_BLUEPRINTS`.

## Decisions Made

- **Participation check reuses `rbac.can_participate_in_activity`** rather than the plan's literal `RegistrationRepository.find(...) is not None or organiser`. The predicate is the codebase's own answer to the same question, and it is strictly more correct on two edges the raw find misses: a *cancelled* registration must not grant a vote, and an organiser with no registration row must still be able to vote. Same intent as the plan, one call instead of two, and it matches D-08's wording in 08-CONTEXT.
- **`_poll_or_404` verifies the poll belongs to the activity in the URL.** The route guard authorises the caller against the activity in the path, so accepting any poll id would let a poll from event A be voted on or closed through event B's URL — which the guard would happily authorise. Verified by a negative control (cross-event close → 404).
- **`db.session.flush()` before the create audit row.** Phase 6 recorded the "Expense submitted" audit row on an id that did not exist yet, so `entity_id` was null and the row belonged to nothing. Flushing first makes `AuditLog.entity_id` the poll's real id, which is what makes the row findable.
- **`my_vote` is `None` when there is no `viewer_id`**, rather than comparing `vote.user_id == None` — an anonymous read should report "you have not voted", not accidentally match a null-owned row.

## Deviations from Plan

**1. [Rule 2 - Missing Critical] Cross-event poll id was votable/closable through any event's URL**
- **Found during:** Task 2 (channel_service implementation)
- **Issue:** The plan specified the ownership check only for `close_poll` ("verify it belongs to `activity_id`"), not for `cast_vote`. Without it, a registrant of event B could vote on (and an organiser of B could close) a poll belonging to event A by naming A's poll id in B's URL — the route guard checks authority over B and never sees A.
- **Fix:** Extracted `_poll_or_404(activity_id, poll_id)`, used by both `cast_vote` and `close_poll`; it 404s when the poll's `activity_id` does not match the one in the path.
- **Files modified:** `backend/app/services/channel_service.py`
- **Verification:** Negative control in the smoke run — closing event A's poll through event B's URL returns 404; voting likewise.
- **Committed in:** `d0120a8` (Task 2 commit)

**2. [Rule 1 - Correctness] Participation gate widened to `can_participate_in_activity`**
- **Found during:** Task 2
- **Issue:** The plan's literal `RegistrationRepository.find(...) is not None` treats a *cancelled* registration as a live one, and needs a separate organiser branch bolted on.
- **Fix:** Called `rbac.can_participate_in_activity(current_user, activity)`, which is exactly "live registration OR can manage" and is the predicate 08-CONTEXT D-08 names.
- **Files modified:** `backend/app/services/channel_service.py`
- **Verification:** Smoke run — registered student votes (201), no-POR unregistered user is refused (403).
- **Committed in:** `d0120a8` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 correctness)
**Impact on plan:** Both tighten the authorization boundary the plan already intended. No scope creep — no new files, no new endpoints, no schema change.

## Issues Encountered

- **Pre-existing suite failure, out of scope.** `tests/test_proposal_flow.py::test_full_spine_propose_approve_register_checkin_points` fails with a 400 on the attendance check-in step. Confirmed pre-existing by running the same test on `bc3de36` (the commit before this plan) in a throwaway worktree — it fails identically there. Nothing in this plan touches attendance. Logged to `deferred-items.md`; not fixed (scope boundary).
- Backend suite after this plan: **478 passed, 1 failed (the pre-existing one), 2 skipped** — the same failure set as the baseline.

## Known Stubs

None. All four endpoints are wired end to end against real tables; nothing returns placeholder data.

## Threat Flags

None. The new surface (four poll routes) is entirely inside the plan's intended boundary, and both deviations above narrow rather than widen it.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- 08-02 can add its query endpoints straight onto `channel_bp` and reuse `_activity_or_404` / `_assert_channel_open` from `channel_service.py` — both are already written for two callers.
- Frontend plans (08-03 onward) can rely on the response shapes: poll rows are `EventPoll.to_dict()` plus `vote_counts: number[]` and `my_vote: number | null`; a vote returns `EventPollVote.to_dict()`.
- Note for 08-06: `EventPoll.to_dict()` does **not** include `created_by` or `created_at`, so a UI that wants "posted by" or an age stamp needs the model widened first — that was left alone here rather than changed speculatively.
- The permanent test suite for these endpoints is 08-06's job; the checks listed under `coverage:` were run and passed here, and that smoke file can be lifted straight into 08-06.

## Note on CHAT-01 status

`requirements.mark-complete CHAT-01` was run per protocol and ticked the REQUIREMENTS.md
checkbox; it was **reverted to unchecked deliberately**. CHAT-01 is also owned by 08-03,
08-04 and 08-06 — the organiser-facing poll UI does not exist yet, so the requirement is
not user-reachable and a tick here would be a false completion signal. The traceability
row (`CHAT-01…CHAT-04 | Phase 8 | Pending`) is a grouped row the tool cannot match and was
left as-is; 08-06 owns that update.

## Self-Check: PASSED

- `backend/app/services/channel_service.py` — FOUND
- `backend/app/controllers/channel_controller.py` — FOUND
- `.planning/phases/08-event-announcements-polls-queries/08-01-SUMMARY.md` — FOUND
- Commits `928a999`, `d0120a8`, `6cd2d68` — all FOUND in git log

---
*Phase: 08-event-announcements-polls-queries*
*Completed: 2026-08-23*
