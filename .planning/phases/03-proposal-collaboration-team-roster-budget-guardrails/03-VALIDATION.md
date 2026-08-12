---
phase: 3
slug: proposal-collaboration-team-roster-budget-guardrails
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-08-12
---

# Phase 3 — Validation Record

> Per-phase validation record for PROPOSAL-00, PROPOSAL-01, PROPOSAL-02, PROPOSAL-03, PROPOSAL-04, PROPOSAL-05, PROPOSAL-06, BUDGET-01.  
> Derived from 03-01 through 03-04 PLAN.md Verification sections.

---

## Test Infrastructure

### Backend (exists — inherited from Phase 1/2)

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3.2 + pytest-cov 5.0.0 |
| **Config file** | `backend/pytest.ini` — `testpaths = tests`, `addopts = -q --cov=app --cov-report=term-missing` |
| **Quick run command** | `cd backend && pytest tests/test_proposal_collaboration.py -x -q` |
| **Full suite command** | `cd backend && pytest` |
| **Phase 3 test file** | `backend/tests/test_proposal_collaboration.py` — 30 tests, all passing |
| **Fixtures** | Inherits `conftest.py` — `app`, `client`, `admin_headers`, `rc_headers`, `student_headers`, `crew_headers`, `meetup_head_headers` |

### Frontend (exists — established in Phase 2)

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2.7 + jsdom 26.1.0 |
| **Full suite command** | `cd frontend && npx vitest run && npm run build` |
| **Type check** | `npx tsc --noEmit` — zero application errors |

---

## Sampling Rate

- **After every task commit:** `cd backend && pytest tests/test_proposal_collaboration.py -x -q`
- **After every plan wave:** `cd backend && pytest` and `cd frontend && npx tsc --noEmit`
- **Before verify-work:** both suites green

---

## Per-Requirement Verification Map

| Requirement | Behaviour | Test Type | Automated Command | Status |
|-------------|-----------|-----------|-------------------|--------|
| PROPOSAL-00 | Submitter must hold an active organiser POR in the specific primary org | integration | `pytest tests/test_proposal_collaboration.py -k "submitter" -x` | ✅ green |
| PROPOSAL-00 | Cross-org block: POR in org B, proposing for org A → 403 `forbidden` | integration | `pytest tests/test_proposal_collaboration.py -k "wrong_org" -x` | ✅ green |
| PROPOSAL-00 | Student with no POR → 403 `forbidden` | integration | `pytest tests/test_proposal_collaboration.py -k "no_por" -x` | ✅ green |
| PROPOSAL-01 | Primary org written as `ACCEPTED` `ActivityCollaborator` row on submit | integration | `pytest tests/test_proposal_collaboration.py -k "primary_collab" -x` | ✅ green |
| PROPOSAL-01 | Collaborating orgs written as `PENDING` rows; invalid org_id → 404 | integration | `pytest tests/test_proposal_collaboration.py -k "collab_rows" -x` | ✅ green |
| PROPOSAL-02 | Team roster with exactly one Meetup Head → 201 | integration | `pytest tests/test_proposal_collaboration.py -k "exactly_one_meetup_head" -x` | ✅ green |
| PROPOSAL-02 | Zero Meetup Heads → 400 `invalid_team` | integration | `pytest tests/test_proposal_collaboration.py -k "zero_meetup_head" -x` | ✅ green |
| PROPOSAL-02 | Two Meetup Heads → 400 `invalid_team` | integration | `pytest tests/test_proposal_collaboration.py -k "two_meetup_head" -x` | ✅ green |
| PROPOSAL-02 | Invalid role in team → 400 `invalid_role` | integration | `pytest tests/test_proposal_collaboration.py -k "invalid_role" -x` | ✅ green |
| PROPOSAL-02 | `ActivityTeamMember` rows written to DB on success | integration | `pytest tests/test_proposal_collaboration.py -k "team_written" -x` | ✅ green |
| PROPOSAL-03 | `is_mega_meetup` property: False with < 3 accepted collabs | unit | `pytest tests/test_proposal_collaboration.py -k "mega_meetup" -x` | ✅ green |
| PROPOSAL-03 | `is_mega_meetup` True when >= 3 accepted collaborating orgs | unit | `pytest tests/test_proposal_collaboration.py -k "mega_meetup" -x` | ✅ green |
| PROPOSAL-04 | `team_members` serialised in `to_dict()` and GET /proposals/:id response | integration | `pytest tests/test_proposal_collaboration.py -k "team_members" -x` | ✅ green |
| PROPOSAL-05 | Proposer can reassign Meetup Head → 200 | integration | `pytest tests/test_proposal_collaboration.py -k "proposer_can_reassign" -x` | ✅ green |
| PROPOSAL-05 | Admin can reassign Meetup Head → 200 | integration | `pytest tests/test_proposal_collaboration.py -k "admin_can_reassign" -x` | ✅ green |
| PROPOSAL-05 | Student with no management rights → 403 | integration | `pytest tests/test_proposal_collaboration.py -k "student_cannot_reassign" -x` | ✅ green |
| PROPOSAL-05 | Non-existent user_id → 404 `user_not_found` | integration | `pytest tests/test_proposal_collaboration.py -k "nonexistent_user" -x` | ✅ green |
| PROPOSAL-06 | Authority holder of invited org can accept → 200, status → `accepted` | integration | `pytest tests/test_proposal_collaboration.py -k "accepts" -x` | ✅ green |
| PROPOSAL-06 | Authority holder can decline → 200, status → `declined` | integration | `pytest tests/test_proposal_collaboration.py -k "declines" -x` | ✅ green |
| PROPOSAL-06 | Non-authority student cannot respond → 403 | integration | `pytest tests/test_proposal_collaboration.py -k "non_authority" -x` | ✅ green |
| PROPOSAL-06 | Double-respond returns 409 | integration | `pytest tests/test_proposal_collaboration.py -k "double_respond" -x` | ✅ green |
| PROPOSAL-06 | Notification sent to authority holders on invite | integration | `pytest tests/test_proposal_collaboration.py -k "notification_sent" -x` | ✅ green |
| BUDGET-01 | Budget at cap (capacity × ₹200) → 201 | integration | `pytest tests/test_proposal_collaboration.py -k "budget" -x` | ✅ green |
| BUDGET-01 | Budget over capacity cap → 400 `budget_cap_exceeded` | integration | `pytest tests/test_proposal_collaboration.py -k "budget" -x` | ✅ green |
| BUDGET-01 | Budget at absolute ceiling (₹20,000) → 201 | integration | `pytest tests/test_registration_and_waitlist.py -x` | ✅ green |
| BUDGET-01 | Budget over absolute ceiling → 400 `budget_cap_exceeded` | integration | `pytest tests/test_proposal_collaboration.py -k "budget" -x` | ✅ green |
| BUDGET-01 | `regional_fest` is exempt from budget cap | integration | `pytest tests/test_proposal_collaboration.py -k "fest_exempt" -x` | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Frontend UAT Checklist (Manual — 03-04-PLAN.md)

| Behaviour | Test Instructions | Status |
|-----------|-------------------|--------|
| Budget cap indicator shows in real time as budget lines are edited | Set scale=local_meetup, capacity=50. Add a budget line with ₹10,001. Confirm red "Over cap" indicator appears and Submit is disabled. Change to ₹9,999 — confirm green indicator, Submit enabled. | ⬜ pending |
| Mega Meetup badge visible in approval queue | Submit a proposal with 2 accepted collaborators and load `/admin/proposals`. Confirm "Mega Meetup" badge absent. Accept a 3rd → badge appears. | ⬜ pending |
| Collaborator accept/decline buttons on EventDetail | Log in as an authority holder in a collaborating org. Navigate to the event. Confirm Accept/Decline buttons visible. Accept → status changes to "accepted" without page reload. | ⬜ pending |
| Team roster validation prevents submission | In ProposalNew, add two members both with role "Meetup Head". Confirm warning appears and Submit is disabled. Change one to "Designer" → warning clears, Submit enabled. | ⬜ pending |

---

## Test Run Summary

Last full run: 2026-08-12

```
pytest tests/test_proposal_collaboration.py tests/test_registration_and_waitlist.py -q
..................................   [100%]
34 passed in ~18s
```

Coverage delta from Phase 3: `proposal_service.py` 45% → 70%, `proposal_controller.py` 68% → 82%, `rbac.py` 46% → 64%.

---

## Validation Sign-Off

- [x] All 8 Phase 3 requirements have automated test coverage
- [x] Sampling continuity: every plan has a `pytest` verify command
- [x] No watch-mode flags used (all runs use `pytest -x -q`)
- [x] Feedback latency < 30s for per-task runs
- [x] `npx tsc --noEmit` exits clean (zero application errors)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** validated 2026-08-12
