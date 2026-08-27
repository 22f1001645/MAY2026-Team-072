---
phase: 08-event-announcements-polls-queries
verified: 2026-08-24T02:45:00Z
status: passed
score: 5/5 roadmap success criteria verified (18/18 plan must-haves verified)
behavior_unverified: 0
overrides_applied: 0
---

# Phase 8: Event Announcements, Polls & Queries Verification Report

**Phase Goal:** A live event's polls and Q&A are structured, moderated channels — organiser-created polls voted once each, and attendee questions answered once by the team — layered onto the event's existing announcement broadcast and pre-existing open chat, without becoming a second freeform chat room themselves.
**Verified:** 2026-08-24
**Status:** passed
**Re-verification:** No — initial verification of this VERIFICATION.md, but this phase went through an internal code-review + fix cycle (08-REVIEW.md → 08-REVIEW-FIX.md) before reaching this checkpoint. Both critical defects found in that review (CR-01, CR-02) were confirmed fixed in the current codebase, independently, below — not accepted on SUMMARY.md's word.

## Important note on ROADMAP.md's completion timestamp

`.planning/ROADMAP.md` marks Phase 8 complete (2026-08-24), and `08-06-SUMMARY.md` (the phase's own close-out plan) asserts `_assert_channel_open` was "already correct in every respect" with no source change needed. **That claim was false at the time it was written** — the guard gated on `Activity.status == "live"`, a value nothing in the codebase ever assigned, so every poll/vote/query write 409'd in production. This was caught by a subsequent code review (08-REVIEW.md, CR-01) and fixed in commit `7641a5d`, along with an unrelated IDOR in `list_polls` (CR-02, fixed in `ef0590d`) and six warning-tier issues (WR-01…WR-08, `1d8744e`…`446f7f8`). All ten fixes are present in the current `HEAD` and were independently re-verified in this pass, not taken from 08-REVIEW-FIX.md's word. The ROADMAP checkbox is therefore accurate **now**, but only because of the fix cycle that ran after the checkbox was set — treat the 08-06-SUMMARY.md self-check as historical record of the plan's own (incorrect) belief, not as evidence.

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Team can post announcements + create polls scoped to registration window; registrants see them and vote exactly once each | ✓ VERIFIED | `channel_service.create_poll` gated by `_assert_channel_open` (open = `upcoming`/pre-completion window, matching `registration_service.register`'s window — verified by reading both functions side by side); `POST .../vote` route is `can_manage_activity_required` for create, `can_participate_in_activity` checked inside `cast_vote` for voting; one-vote-per-poll enforced by DB constraint `uq_poll_vote` (`backend/app/models/__init__.py:1093`), not a racy check-then-insert. Announcements (`registration_controller.py:56-89`, pre-existing) now poll every 15s±3s via `useAnnouncements` (`queries.ts:319-326`, added in 08-03). `test_channel_end_to_end` and `test_the_channel_is_open_on_the_status_approval_produces` both pass (ran independently: 23/23 in `test_event_channel.py`). |
| 2 | Registrant submits a query; team answers once; only the asker sees the response; EventChat remains available separately | ✓ VERIFIED | `submit_query`/`respond_query` in `channel_service.py:223-279`; `respond_query` 409s on a non-open query (`query.status != QUERY_OPEN`); `/queries` (team view) is `can_manage_activity_required`, `/queries/mine` scoped to `g.current_user.id` in the service. `test_a_registrant_never_sees_another_registrants_query` passes (403 on team view for a non-team registrant, `[]` on their own mine-view). `EventChat` component is untouched (`EventDetail.tsx:11`, import + button unchanged) and mounts independently of `EventChannelSection`. |
| 3 | Posting to a closed event is rejected server-side with an explicit closed-state message, not merely hidden in the UI | ✓ VERIFIED | `_assert_channel_open` (`channel_service.py:61-67`) raises `ApiError("Posting to this event is no longer available.", "registration_window_closed", 409)` for `EVENT_COMPLETED`/`EVENT_ARCHIVED`/`EVENT_CANCELLED`. This is CR-01's fix: prior to `7641a5d` the gate checked `status == "live"` (a status the app never assigns), which 409'd every real event rather than only closed ones — the opposite of this truth. Independently re-verified against current `HEAD`: `test_create_poll_refused_once_the_channel_closes`, `test_vote_refused_once_the_channel_closes`, `test_submit_query_refused_once_the_channel_closes` (each parametrized over the three closed statuses) and `test_window_guard_precedes_the_registration_check` all pass. |
| 4 | Every poll/query moderation action (create, close, respond) lands in the audit log; rate-limiting deferred (recorded decision, no live deploy target) | ✓ VERIFIED | `create_poll`, `close_poll`, `respond_query` each call `AuditRepository.record(...)`; `cast_vote`/`submit_query` deliberately do not (routine attendee activity, matches D-16). `test_only_the_teams_moderation_actions_are_audited` passes and asserts the exact audit-row set (`['Poll closed', 'Poll created']` for the poll, `['Query answered']` for the query, nothing for the vote or the question). Rate-limiting absence is a recorded scope decision (ROADMAP Phase 8 "Research Flags", resolved 2026-08-06: no live deploy target), correctly reflected as a caveat in REQUIREMENTS.md's traceability row rather than silently claimed as done. |
| 5 | New content appears within ~15s without WebSockets; a backgrounded tab stops polling | ✓ VERIFIED | `channelRefetchInterval = () => 15_000 + Math.random() * 6_000 - 3_000` (`queries.ts:317`) applied with `refetchIntervalInBackground: false` to all four Phase 8 hooks (`usePolls`, `useMyQueries`, `useOrgQueries`) plus the updated `useAnnouncements`. No WebSocket/Flask-SocketIO code added anywhere in the diff. `frontend/src/__tests__/channel-polling.test.ts` (4 tests) asserts this per-hook by source scan with a known-bad fixture; ran independently as part of the full `npm test` pass (187/187, 28 files). |

**Score:** 5/5 roadmap success criteria verified, 0 present-but-behavior-unverified.

### Plan-Level Must-Haves (18 total across 6 plans)

All 18 `must_haves.truths` entries across 08-01 through 08-06's PLAN.md frontmatter were checked against the current codebase (not the plan's original, pre-fix intent) and hold:

| Plan | Must-haves | Status |
|------|-----------|--------|
| 08-01 (poll CRUD) | 4/4 | ✓ VERIFIED — all 4 poll endpoints exist, gated correctly post-CR-01/CR-02 fix, `uq_poll_vote` enforces idempotency |
| 08-02 (query backend) | 4/4 | ✓ VERIFIED — submit/list/mine/respond all present and correctly gated |
| 08-03 (frontend data layer) | 4/4 | ✓ VERIFIED — types, 8 api.ts methods, all 8 query hooks, jittered polling on all channel queries incl. `useAnnouncements` |
| 08-04 (Poll UI) | 4/4 | ✓ VERIFIED — `PollCard` ballot/results split (fixed post-WR-07/WR-08), `EventChannelSection` collapsible with create form, wired below EventChat in `EventDetail.tsx`, close disables voting via `channelClosed`/`closed` status |
| 08-05 (Q&A UI) | 4/4 | ✓ VERIFIED — `QuerySection` submit+list, `OrgQueriesPanel` with unanswered badge and per-row reply (fixed post-WR-05), both read `isError` (fixed post-WR-04) |
| 08-06 (gating + close-out) | 2/3 directly, 1 corrected by later fix cycle | ✓ VERIFIED (current state) — see "Important note" above. The plan's own must-have text ("Server-side rejection returns 409 ... after an event leaves live status") describes the pre-fix, incorrect design; the actually-shipped and now-verified behavior is 409 on the three genuinely-closed statuses, which is what the roadmap goal requires. End-to-end flow and ROADMAP update are both true. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/app/services/channel_service.py` | poll/query business logic, correctly gated | ✓ VERIFIED | 280 lines, all 9 functions present (`create_poll`, `list_polls`, `cast_vote`, `close_poll`, `submit_query`, `list_queries`, `my_queries`, `respond_query`, plus helpers), CR-01/WR-01/WR-02/WR-03 fixes all present |
| `backend/app/controllers/channel_controller.py` | 8 REST routes | ✓ VERIFIED | 102 lines, all 8 routes present, CR-02 fix present (`list_polls` now `can_participate_in_activity_required`) |
| `backend/app/controllers/__init__.py` | `channel_bp` registered | ✓ VERIFIED | imported line 20, present in `ALL_BLUEPRINTS` line 44 |
| `backend/app/schemas/__init__.py` | 4 new schemas | ✓ VERIFIED | `PollCreateSchema`, `PollVoteSchema`, `QuerySubmitSchema`, `QueryRespondSchema` importable |
| `backend/app/models/__init__.py` | `EventPoll`, `EventPollVote`, `EventQuery` + `uq_poll_vote` | ✓ VERIFIED | all three models present, unique constraint present at line 1093 |
| `frontend/src/lib/types.ts` | `EventPoll`, `EventPollVote`, `EventQuery` interfaces | ✓ VERIFIED | present |
| `frontend/src/lib/api.ts` | 8 API caller methods | ✓ VERIFIED | present |
| `frontend/src/lib/queries.ts` | 8 hooks + jittered `useAnnouncements` | ✓ VERIFIED | present, `channelRefetchInterval` shared helper |
| `frontend/src/components/PollCard.tsx` | ballot/results component | ✓ VERIFIED | WR-07/WR-08 fixes present (`myVote` normalized once) |
| `frontend/src/components/EventChannelSection.tsx` | collapsible poll+Q&A container | ✓ VERIFIED | WR-04 fix present (`isError` → `ErrorState`), `closed` prop wired (WR-06) |
| `frontend/src/components/QuerySection.tsx` | registrant submit+list | ✓ VERIFIED | WR-04, WR-06 (`readOnly`) fixes present |
| `frontend/src/components/OrgQueriesPanel.tsx` | organiser moderation panel | ✓ VERIFIED | WR-04, WR-05 (`sendingId` per-row) fixes present |
| `frontend/src/pages/EventDetail.tsx` | wires `EventChannelSection` | ✓ VERIFIED | mounted, `closed={isPast}` passed (WR-06), independent of the `EventChat` button block |
| `frontend/src/pages/ManageEvent.tsx` | wires `OrgQueriesPanel` | ✓ VERIFIED (not re-read this pass; confirmed present via 08-REVIEW.md's file list and unchanged since) | — |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `channel_bp` | `backend/app/controllers/__init__.py` | import + `ALL_BLUEPRINTS` | ✓ WIRED | confirmed by grep |
| `EventPollVote` | DB | `uq_poll_vote` unique constraint | ✓ WIRED | confirmed in model; `cast_vote` relies on `IntegrityError` from this exact constraint, dialect-aware (`_is_duplicate_vote`, WR-03 fix) |
| `list_polls` route | `can_participate_in_activity_required` | RBAC decorator | ✓ WIRED (post CR-02 fix) | was `auth_required` alone pre-fix (IDOR); now uses `activity_scoped(can_participate_in_activity)`, 404s unknown activity, 403s non-participant. Regression test `test_a_stranger_cannot_read_an_events_polls` passes. |
| `EventChannelSection` | `EventDetail.tsx` | render below `EventChat` button, independent gating | ✓ WIRED | confirmed at `EventDetail.tsx:511-527`; not gated on `!isPast` (WR-06 fix), `EventChat` block above it still is |
| Attendee query submission | registration status + channel-open status | `can_participate_in_activity` check inside `submit_query`, `_assert_channel_open` | ✓ WIRED | confirmed in `channel_service.py:223-232` |

### Behavioral Spot-Checks (independently re-run, not taken from SUMMARY/REVIEW-FIX claims)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase-8 backend suite passes against current HEAD | `pytest backend/tests/test_event_channel.py -v --no-cov` | `23 passed in 24.96s` | ✓ PASS |
| Schema/RBAC regression | `pytest backend/tests/test_schema_batch.py backend/tests/test_rbac.py --no-cov -q` | `9 passed` | ✓ PASS |
| Frontend typecheck + build | `cd frontend && npm run build` | `tsc -b && vite build` — 2235 modules, built in 12.64s, 0 errors | ✓ PASS |
| Frontend test suite incl. CHAT-04 gate | `cd frontend && npm test -- --run` | `28 files, 187 tests passed`, incl. `channel-polling.test.ts (4 tests)` | ✓ PASS |
| Fix commits present in git history | `git log --oneline -- backend/app/services/channel_service.py backend/app/controllers/channel_controller.py` | `7641a5d` (CR-01), `ef0590d` (CR-02), `1d8744e`/`8447eab`/`edb7ee0` (WR-01/02/03) all present | ✓ PASS |

**Known limitation (documented, not re-attempted per instruction):** The full backend regression suite (`pytest` with no `-k` filter) could not be run — `backend/tests/test_org_service_unit.py` hangs (CPU-bound, unrelated to Phase 8, tracked as Broken Window #7 in `.planning/WINDOWS.md`, status `open`). Phase-8-scoped tests substitute for it above. This is a gap in *cross-phase* regression confidence, not evidence against Phase 8's own goal — Broken Window #7's own description records the full suite ran clean (496/495) standalone before a later `origin/main` merge introduced the hang, and nothing in that merge touches `channel_service.py`/`channel_controller.py` (confirmed by the git log above showing only Phase 8 commits against those two files since the merge).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CHAT-01 | 08-01, 08-03, 08-04 | Organiser/team can post announcements and create polls scoped to registration window | ✓ SATISFIED | see Truth 1 |
| CHAT-02 | 08-02, 08-03, 08-05 | Registrants have exactly two self-service actions (submit query, cancel registration); no peer-to-peer chat | ✓ SATISFIED | see Truth 2; no reply/peer-visibility route exists anywhere in `channel_controller.py` or `channel_service.py`; registration-cancel is pre-existing, unaffected |
| CHAT-03 | 08-02, 08-06 | Moderation controls (rate-limit, audit log) ship in the same phase | ⚠ PARTIAL BY RECORDED DECISION | Audit log fully shipped and tested (Truth 4). Rate-limiting explicitly deferred by a documented milestone-level decision (ROADMAP "Research Flags", resolved 2026-08-06: no live deploy target for this course project) — this is a scope decision predating and independent of the phase's execution, not a phase failure. REQUIREMENTS.md's traceability row states this caveat rather than claiming full coverage. |
| CHAT-04 | 08-03, 08-06 | Cursor/polling-based updates (10-15s + jitter) via TanStack Query, no WebSockets | ✓ SATISFIED | see Truth 5 |

No orphaned requirements — REQUIREMENTS.md's Phase 8 row lists exactly CHAT-01…04, matching all six plans' `requirements:` frontmatter.

### Anti-Patterns Found

None in the current `HEAD` state of the files this phase touches. The two critical (CR-01, CR-02) and six warning (WR-01…WR-08, note WR-08 needed no code change) anti-patterns found by `08-REVIEW.md` were all fixed in `08-REVIEW-FIX.md`'s cycle and independently re-verified above. The five Info-tier findings (IN-01…IN-05) remain unfixed by design (out of `critical_warning` scope per the fix report) — none are blockers:

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/app/models/__init__.py` | ~1122 | Stale docstring: "Rate limiting on submissions is CHAT-03's Phase 8 concern" — phase is done, comment now misleads a future reader | Info | Cosmetic; the actual scope decision is correctly recorded in ROADMAP.md/REQUIREMENTS.md |
| `frontend/src/pages/ManageEvent.tsx` | ~243-247 | Dead `activeBroadcastEventId` state + stale comment (pre-existing, not introduced by Phase 8) | Info | No functional impact |
| `frontend/src/lib/types.ts` / `api.ts` | 379-422 / 690-728 | Phase 8 payloads stay snake_case in components rather than adapted once in `api.ts`, deviating from the stated `CLAUDE.md` convention (deliberate, documented exception) | Info | Consistency debt, not a bug |

### Human Verification Required

None. All roadmap success criteria and plan must-haves resolved to VERIFIED via direct code inspection plus independently re-run automated tests/build. No behavior-dependent truth was left unexercised — the state-transition/idempotency invariants (one-vote-per-poll, one-answer-per-query, window-closed rejection, audit-only-on-moderation) are each covered by a passing named test that was re-run in this verification pass, not merely present-and-wired.

### Gaps Summary

No gaps block the phase goal. The two critical defects a prior code review found (CR-01: unreachable "live" status gate defeating every write path; CR-02: unauthenticated-scope IDOR on poll reads) are both fixed in the current codebase (commits `7641a5d`, `ef0590d`) and covered by regression tests that were independently re-run and pass (23/23 in `test_event_channel.py`). The one open item — CHAT-03's rate-limiting half — is a recorded, milestone-level scope decision made before this phase's planning (no live deployment target for a graded course project), not an execution gap, and is transparently caveated rather than silently claimed. The full-suite regression gap (Broken Window #7) is a pre-existing, unrelated CPU-bound test hang tracked separately and does not implicate any file this phase modified.

---

_Verified: 2026-08-24_
_Verifier: Claude (gsd-verifier)_
