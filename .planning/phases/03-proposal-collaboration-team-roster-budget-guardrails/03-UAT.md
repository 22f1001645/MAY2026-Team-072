---
phase: 3
slug: proposal-collaboration-team-roster-budget-guardrails
session: 2026-08-12
status: complete
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
| M-01 | Budget cap indicator updates in real time | ProposalNew | ✅ pass | Re-verified 2026-08-13 via `/browse`: `₹3,500 / ₹10,000 allowed` shown live, `inr()` formatted |
| M-02 | Submit disabled when budget over cap | ProposalNew | ✅ pass | Re-verified 2026-08-13 |
| M-03 | Meetup Head warning when count = 0 | ProposalNew | ✅ pass | Verified 2026-08-13 via `/browse`: adding a member (defaults to Co-Head) shows "⚠ Assign a Meetup Head" |
| M-04 | Meetup Head warning when count > 1 | ProposalNew | ✅ pass | Verified 2026-08-13: singleton now enforced by disabling the option (`Meetup Head (assigned)` shown disabled on every other row) rather than a post-hoc warning — stronger than the original spec |
| M-05 | Submit disabled when team invalid | ProposalNew | ✅ pass | Re-verified 2026-08-13, real submission → 201 |
| M-06 | Collab Accept/Decline buttons visible for authority holder | EventDetail | ✅ pass | Verified 2026-08-13 as Ayush (Society Secretary, Rhythm Dance Society): saw Accept/Decline for Rhythm's pending invite only, not for Student Executive Council's |
| M-07 | Accept → status updates without page reload | EventDetail | ✅ pass | Verified 2026-08-13: `POST .../respond` → 200, `GET /events/:id` refetch → badge flips to "Accepted" in place, no navigation |
| M-08 | Non-authority holder sees no respond buttons | EventDetail | ✅ pass | Verified 2026-08-13 as Neha S (no POR, not on team, not a collaborator): no Organiser view, no respond buttons, no Reassign control |
| M-09 | Team roster panel visible on EventDetail | EventDetail | ✅ pass | Verified 2026-08-13, visible to every logged-in viewer regardless of role |
| M-10 | Reassign Meetup Head — organiser view only | EventDetail | ✅ pass | Verified 2026-08-13 as saiteja: Dialog opens with "Currently Arav Mehta", Select populated from real roster, consequence sentence shown, confirm updates the panel. **Found and fixed a real backend bug in the process** — see I-04 |
| M-11 | Collaborator list + Mega Meetup badge in ApprovalQueue | ApprovalQueue | ✅ pass | Verified 2026-08-13: CollabStatus badges (not bare-color text) for each org; Mega Meetup badge appeared once all 3 collaborators (incl. primary) were accepted, confirmed `bg-gold/10 text-gold border-gold/25` — gold, not teal |
| M-12 | Team roster in ApprovalQueue admin detail | ApprovalQueue | ✅ pass | Verified 2026-08-13, roles rendered correctly with Meetup Head highlighted gold |

## Issues Found

| ID | Test | Root Cause | Fix | Status |
|----|------|-----------|-----|--------|
| I-01 | M-01 | Budget cap indicator not implemented in `ProposalNew.tsx` — plan spec was written but IIFE block never added to the budget card | Added live cap indicator inside budget card: red when `total > min(capacity*200, 20000)`, teal when within limit | ✅ Fixed |
| I-02 | M-02 | `disabled` prop only checked `teamRows.length === 0` — budget cap was not a guard | Added IIFE budget cap check to `disabled` prop on Submit button | ✅ Fixed |
| I-03 | M-05 | Submit failed with 400 Validation Error | Frontend `TEAM_ROLES` array included "Volunteer" and "Social Media" which weren't in the backend's allowed enum. | ✅ Fixed by aligning frontend array with backend constants. |
| I-04 | M-10 | `reassign_meetup_head()` (`backend/app/services/proposal_service.py`) unconditionally inserted a new `ActivityTeamMember` row for the new head, even when that user already had an existing roster row (e.g. a Co-Head being promoted) — leaving them listed twice | Query for the new head's existing row first; update its role in place if found, only insert when they're not already on the roster. Regression test added: `test_reassign_to_existing_team_member_does_not_duplicate_row` | ✅ Fixed, 33/33 `test_proposal_collaboration.py` green |

## Sign-Off

- [x] All automated tests green
- [x] All manual tests ⬜ → ✅ or documented as known gaps
