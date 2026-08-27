# Phase 8 — Deferred Items

Out-of-scope discoveries logged during execution. Not fixed here (scope boundary).

## Pre-existing test failure: attendance check-in returns 400

- **Found during:** 08-01, running the backend suite as the verification gate.
- **Test:** `backend/tests/test_proposal_flow.py::test_full_spine_propose_approve_register_checkin_points`
- **Symptom:** step 6 (`POST /api/v1/events/<id>/attendance`) answers 400 where the test expects 200.
- **Pre-existing:** confirmed by running the same test at `bc3de36` (the commit immediately before Phase 8 work) in a throwaway worktree — it fails identically there.
- **Likely area:** `attendance_service.check_in` time-window logic around `datetime.utcnow()` (`attendance_service.py:73`), which also emits a `utcnow()` deprecation warning. Nothing in Phase 8 touches attendance.
- **Effect on Phase 8:** none. Baseline and post-08-01 failure sets are identical (478 passed, 1 failed, 2 skipped).

## Two pre-existing hooks poll in a backgrounded tab

- **Found during:** 08-06, writing the CHAT-04 structural gate.
- **Files:** `frontend/src/lib/queries.ts` — `useMyRegistrations` (10s) and `useNotifications` (10s).
- **Symptom:** both set `refetchInterval` without `refetchIntervalInBackground: false`, so a hidden tab keeps calling the API. The four Phase 8 channel hooks all set it; these two predate the phase (Phase 2 / Phase 5).
- **Effect on Phase 8:** none. ROADMAP criterion 5 is about the channel, and the channel is covered — `frontend/src/__tests__/channel-polling.test.ts` names the four channel hooks and is deliberately not a blanket scan, because a gate that failed on these two would be deleted rather than obeyed.
- **Fix when touched:** add the one line to each, then widen `CHANNEL_HOOKS` in that test into a scan over every hook carrying `refetchInterval:`.
