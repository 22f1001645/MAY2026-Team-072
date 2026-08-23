# Phase 8 — Deferred Items

Out-of-scope discoveries logged during execution. Not fixed here (scope boundary).

## Pre-existing test failure: attendance check-in returns 400

- **Found during:** 08-01, running the backend suite as the verification gate.
- **Test:** `backend/tests/test_proposal_flow.py::test_full_spine_propose_approve_register_checkin_points`
- **Symptom:** step 6 (`POST /api/v1/events/<id>/attendance`) answers 400 where the test expects 200.
- **Pre-existing:** confirmed by running the same test at `bc3de36` (the commit immediately before Phase 8 work) in a throwaway worktree — it fails identically there.
- **Likely area:** `attendance_service.check_in` time-window logic around `datetime.utcnow()` (`attendance_service.py:73`), which also emits a `utcnow()` deprecation warning. Nothing in Phase 8 touches attendance.
- **Effect on Phase 8:** none. Baseline and post-08-01 failure sets are identical (478 passed, 1 failed, 2 skipped).
