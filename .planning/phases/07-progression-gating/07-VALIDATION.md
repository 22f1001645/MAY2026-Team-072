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

*Populated by the planner once task IDs exist — see 07-RESEARCH.md "Phase Requirements → Test Map" for the full 22-case mapping (PROG-01/02/03/04 → `backend/tests/test_progression_gating.py::test_*`) that this table will be built from.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | PROG-01/02/03/04 | see 07-RESEARCH.md §Security Domain | server computes eligibility live, never trusts a stored flag | integration | `pytest tests/test_progression_gating.py -q` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_progression_gating.py` — new file, stubs for PROG-01/02/03/04 (22 automated cases mapped in 07-RESEARCH.md)
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
