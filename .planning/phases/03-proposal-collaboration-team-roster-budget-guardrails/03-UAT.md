---
phase: 3
slug: proposal-collaboration-team-roster-budget-guardrails
session: 2026-08-12
status: in-progress
---

# Phase 3 — UAT Session

## Automated Tests

| Suite | Status | Count |
|-------|--------|-------|
| `test_proposal_collaboration.py` | ✅ green | 32 passed |
| `test_registration_and_waitlist.py` | ✅ green | 2 passed |
| **Total** | **✅ 34/34** | **0 failures** |

## Manual UAT Tests

| # | Feature | Area | Status | Notes |
|---|---------|------|--------|-------|
| M-01 | Budget cap indicator updates in real time | ProposalNew | ✅ pass | — |
| M-02 | Submit disabled when budget over cap | ProposalNew | ✅ pass | — |
| M-03 | Meetup Head warning when count = 0 | ProposalNew | ⬜ pending | — |
| M-04 | Meetup Head warning when count > 1 | ProposalNew | ⬜ pending | — |
| M-05 | Submit disabled when team invalid | ProposalNew | ✅ pass | Fixed by aligning frontend TEAM_ROLES with backend |
| M-06 | Collab Accept/Decline buttons visible for authority holder | EventDetail | ⬜ pending | — |
| M-07 | Accept → status updates without page reload | EventDetail | ⬜ pending | — |
| M-08 | Non-authority holder sees no respond buttons | EventDetail | ⬜ pending | — |
| M-09 | Team roster panel visible on EventDetail | EventDetail | ⬜ pending | — |
| M-10 | Reassign Meetup Head — organiser view only | EventDetail | ⬜ pending | — |
| M-11 | Collaborator list + Mega Meetup badge in ApprovalQueue | ApprovalQueue | ⬜ pending | — |
| M-12 | Team roster in ApprovalQueue admin detail | ApprovalQueue | ⬜ pending | — |

## Issues Found

| ID | Test | Root Cause | Fix | Status |
|----|------|-----------|-----|--------|
| I-01 | M-01 | Budget cap indicator not implemented in `ProposalNew.tsx` — plan spec was written but IIFE block never added to the budget card | Added live cap indicator inside budget card: red when `total > min(capacity*200, 20000)`, teal when within limit | ✅ Fixed |
| I-02 | M-02 | `disabled` prop only checked `teamRows.length === 0` — budget cap was not a guard | Added IIFE budget cap check to `disabled` prop on Submit button | ✅ Fixed |
| I-03 | M-05 | Submit failed with 400 Validation Error | Frontend `TEAM_ROLES` array included "Volunteer" and "Social Media" which weren't in the backend's allowed enum. | ✅ Fixed by aligning frontend array with backend constants. |

## Sign-Off

- [ ] All automated tests green
- [ ] All manual tests ⬜ → ✅ or documented as known gaps
