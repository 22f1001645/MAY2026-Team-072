---
phase: 7
slug: progression-gating
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-23
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | pytest (backend, config at `backend/pytest.ini`); no frontend test runner — `npm run build` (`tsc -b && vite build`) is the frontend gate |
| **Config file** | `backend/pytest.ini` — `testpaths = tests`, `addopts = -q --cov=app --cov-report=term-missing` |
| **Quick run command** | `cd backend && python -m pytest tests/test_progression_gating.py -q` |
| **Full suite command** | `cd backend && . .venv/Scripts/activate && python -m pytest -q --tb=short && cd ../frontend && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd backend && python -m pytest tests/test_progression_gating.py -q`
- **After every plan wave:** Run `cd backend && python -m pytest -q --tb=short` (full backend suite — the new guards sit inside `submit_proposal`/`decide`, which several existing modules exercise)
- **Before `/gsd-verify-work`:** Full suite (backend suite + `npm run build`) must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

Built from 07-RESEARCH.md "Phase Requirements → Test Map". Two deltas from that 22-case list: `test_refusals_write_nothing` is split into `test_refused_submit_writes_nothing` (07-01) and `test_refused_approve_writes_nothing` (07-02) so each lands with the checkpoint it guards; and two cases are added — `test_forged_unlock_row_does_not_grant_eligibility` (threat T-07-01, which nothing in the 22 asserted) and `test_progression_endpoint_empty_unlocks_is_empty_array` (the zero-unlocks edge). 25 automated cases total.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01 T1 | 07-01 | 1 | PROG-01, PROG-04 | T-07-02 | A locked org's direct `POST /proposals` with `scale: regional_fest` returns 403 `fest_locked` from a live computation | integration | `pytest tests/test_progression_gating.py -q` (4 cases) | ❌ W0 — created by this task | ⬜ pending |
| 07-01 T2 | 07-01 | 1 | PROG-01, PROG-02, PROG-04 | T-07-01, T-07-03, T-07-04, T-07-05 | Dedup before counting; unapproved/future/other-city meetups excluded; a forged unlock row grants nothing; a refused submit writes nothing | integration | `pytest -q --tb=short` (13 cases cumulative) | ✅ after T1 | ⬜ pending |
| 07-02 T1 | 07-02 | 2 | PROG-01, PROG-02, PROG-03, PROG-04 | T-07-07, T-07-08, T-07-05, T-07-09 | Approve-time re-check closes the TOCTOU window; accepted-count enforces consent; refused approve mutates nothing; unlock row is idempotent | integration | `pytest -q --tb=short` (21 cases cumulative) | ✅ | ⬜ pending |
| 07-02 T2 | 07-02 | 2 | PROG-01, PROG-03 | T-07-06, T-07-10 | Read route serialises the same function the write paths assert on; 404/401 guards; `city` is a bound filter value only | integration | `pytest tests/test_progression_gating.py tests/test_blueprint_registration.py -q` (25 cases) | ✅ | ⬜ pending |
| 07-02 T3 | 07-02 | 2 | PROG-01 | — | Seeded demo data can reach fest tier, so the manual gate is reachable | integration | `pytest -q --tb=short` | ✅ | ⬜ pending |
| 07-03 T1 | 07-03 | 2 | PROG-01, PROG-03 | T-07-13 | snake→camel adapted once in `lib/api.ts`; threshold read from the server | build | `cd frontend && npm run build` | ✅ exists | ⬜ pending |
| 07-03 T2 | 07-03 | 2 | PROG-01, PROG-03 | T-07-12 | Refetch on org/city change only; no polling, no focus refetch | build | `cd frontend && npm run build` | ✅ exists | ⬜ pending |
| 07-04 T1 | 07-04 | 3 | PROG-01, PROG-04 | T-07-11, T-07-14, T-07-15 | Lock fails closed on loading and fetch error; `aria-disabled` keeps the reason reachable; query matches the submit payload's org/city | build + manual | `cd frontend && npm run build`; manual steps 1-6, 10 at 07-05 T3 | ✅ exists | ⬜ pending |
| 07-04 T2 | 07-04 | 3 | PROG-02, PROG-04 | T-07-13 | Threshold from the server; submit stays enabled; server message rendered verbatim | build | `cd frontend && npm run build` | ✅ exists | ⬜ pending |
| 07-05 T1 | 07-05 | 3 | PROG-02, PROG-04 | T-07-08, T-07-17 | Refusal is a persistent `role="alert"` strip, never a toast | build | `cd frontend && npm run build` | ✅ exists | ⬜ pending |
| 07-05 T2 | 07-05 | 3 | PROG-03 | T-07-01, T-07-16 | Banner is display-only with nothing gated on the row; visibility uses the page's existing `canEdit` | build + manual | `cd frontend && npm run build`; manual steps 7-9 at 07-05 T3 | ✅ exists | ⬜ pending |
| 07-05 T3 | 07-05 | 3 | PROG-01, PROG-03 | — | The two manual-only states below, signed off | manual checkpoint | full `workflow.test_command` green first | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

No separate Wave 0 plan exists — the tracer (07-01 Task 1) creates the test file and its helpers as its first move, writing them before the implementation, so the Wave 0 gap closes inside Wave 1.

- [ ] `backend/tests/test_progression_gating.py` — new file, created by 07-01 Task 1; 25 automated cases for PROG-01/02/03/04 by the end of 07-02
- [ ] `_seed_completed_meetup()` helper inside that file (no shared fixtures module in this project; per-module helpers are the convention — copy the `_auth`/`_seed_org` block pattern from `test_proposal_collaboration.py:38-83`)
- [ ] Framework install: none needed — pytest, pytest-cov, and the `app`/`client` fixtures are already present

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Lock-state captions (loading / fetch-error / indeterminate) on the `ProposalNew.tsx` scale selector | PROG-01, D-04 | No frontend test runner in this project (no vitest/jest config, no `test` script in `frontend/package.json`) | Load `/proposals/new`, switch org/city combos, observe caption text and lock affordance per 07-UI-SPEC.md §5.1 |
| Gold "Sponsorship & outreach tools unlocked" banner visual appearance | PROG-03, D-05 | Visual/CSS review, not a build-time check | Approve a fest for a seeded eligible org, visit `OrgProfile.tsx`, confirm banner renders per 07-UI-SPEC.md |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
