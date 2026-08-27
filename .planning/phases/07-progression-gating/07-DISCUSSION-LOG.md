# Phase 7: Progression Gating - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-23
**Phase:** 7-progression-gating
**Areas discussed:** Fest-collaborator gate timing, Eligibility UI surfacing

---

## Fest-collaborator gate timing

| Option | Description | Selected |
|--------|-------------|----------|
| Named at submit, accepted at approve | submit_proposal() checks len(collaborating_org_ids)+primary >= 6 (structural); decide()'s approve branch re-checks live accepted count >= 6 (mirrors is_mega_meetup) | ✓ |
| Accepted count both times | Both submit and approve check accepted >= 6; impossible on a first-time proposal without a carry-over mechanism that doesn't exist | |
| Named count both times | Both submit and approve check raw named count regardless of accept/decline; weakens PROPOSAL-06's consent guarantee | |

**User's choice:** Named at submit, accepted at approve.
**Notes:** REQUIREMENTS.md's PROG-02 ("named on the proposal") and ROADMAP.md's success criterion #3 ("accepted collaborating organisations") were in direct conflict — collaborators always start `pending` on a new proposal, so a pure "accepted" check could never pass at submit time. The two-point resolution (named structurally at submit, accepted substantively at approve) reconciles both texts.

---

## Per-city scoping (clarifying sub-question)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep per-city (as written/schema'd) | Eligibility computed per (org, city) pair, matching REQUIREMENTS.md wording and the existing org_progression_unlocks(org_id, city) unique key | ✓ |
| Org-wide (drop city scoping) | Eligibility computed across all cities combined | |

**User's choice:** Keep per-city.
**Notes:** The user's first answer to the sponsorship-flag question ("it doesn't have any relation with cities") read as a possible push to drop city scoping entirely. Flagged the conflict against the already-migrated `org_progression_unlocks(org_id, city)` table and REQUIREMENTS.md's explicit "in that same city" wording before proceeding — user confirmed per-city stays as originally specified.

---

## Eligibility UI surfacing

| Option | Description | Selected |
|--------|-------------|----------|
| Live-fetch on org+city change | New endpoint fires when org_id/city changes on ProposalNew; regional_fest button shows lock + "1 of 2 completed" caption, unclickable until eligible | ✓ |
| Bundled into existing bootstrap data | Progression counts piggyback on an existing response (org list/profile), no new request | |
| Always clickable, reject only on submit | No inline lock UI; 403 reason surfaces as a form error after Submit, same as quota_exceeded today | |

**User's choice:** Live-fetch on org+city change.

| Option | Description | Selected |
|--------|-------------|----------|
| Banner on OrgProfile page | OrgProfile.tsx shows a badge/banner per unlocked city | ✓ |
| One-time notification only | Reuse Notification model, ping authority holder once, no lasting UI | |
| Both | Notification + banner | |

**User's choice:** Banner on OrgProfile page.
**Notes:** No additional questions raised; user confirmed ready for context after both sub-questions.

---

## Claude's Discretion

- Exact shape of the new `GET /orgs/<org_id>/progression?city=<city>` endpoint (field names, whether it's a dedicated endpoint or folded into an existing one) — left to the planner/researcher per the phase's `code_context` notes.
- Where exactly `OrgProgressionUnlock` row creation is triggered in `decide()` (get-or-create timing, whether it fires a notification later if the user changes their mind) — left to implementation.

## Deferred Ideas

None — discussion stayed within phase scope.
