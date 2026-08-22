# Phase 7: Progression Gating - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-22
**Phase:** 07-progression-gating
**Areas discussed:** Eligibility computation, Scale picker UX, PROG-02 collaborator threshold, PROG-03 unlock ceremony

---

## Eligibility Computation

### Q1: How does the server define a "completed" event for PROG-01?

| Option | Description | Selected |
|--------|-------------|----------|
| approved AND starts_at < now() | Single query, no manual status flip needed | ✓ |
| Activity.status == 'completed' | Requires explicit manual marking | |
| Has at least 1 Attendance row | Tighter but coupled to Phase 6 QR data | |

**User's choice:** approved AND starts_at < now() (per REQUIREMENTS.md specification)

### Q2: Where does the eligibility computation live?

| Option | Description | Selected |
|--------|-------------|----------|
| New progression_service.py | One function, called at both submit and approval | ✓ |
| Inline in proposal_service | Submit-time only, admin trusts it | |
| rbac.py predicate | Route decorator level | |

**User's choice:** Dedicated progression_service.py with structured result, called at both gates.

### Q3: How does the frontend learn about progression state?

| Option | Description | Selected |
|--------|-------------|----------|
| GET /api/v1/orgs/\<org_id\>/progression?city=\<city\> | Dedicated endpoint with structured counts | ✓ |
| Piggyback on existing org detail payload | No new endpoint but couples data | |
| Server-side rejection only | No frontend indicator, worse UX | |

**User's choice:** Dedicated endpoint with eligibility + completion counts + unlock state.

### Q4: Does eligibility count the org's own activities only, or also collaborations?

| Option | Description | Selected |
|--------|-------------|----------|
| Own activities only (org_id = primary) | Collaboration doesn't count toward YOUR progression | ✓ |
| Any activity where org is primary or collaborator | Broader definition | |
| You decide | Whichever is simpler | |

**User's choice:** Own primary activities only.

---

## Scale Picker UX

### Q1: How should the locked Regional Fest card look?

| Option | Description | Selected |
|--------|-------------|----------|
| aria-disabled + inline progress | Lock icon, reduced opacity, "1 of 2 completed" text | ✓ |
| Hide the card entirely | Only show when eligible | |
| Show normally, rely on server rejection | No frontend gating | |

**User's choice:** aria-disabled with inline progress checklist, consistent with Phase 5 pattern.

### Q2: When does ProposalNew fetch progression data?

| Option | Description | Selected |
|--------|-------------|----------|
| When org and city are both selected | useProgression(orgId, city) with long stale time | ✓ |
| On page load | Before city is known | |
| Compute client-side | Business logic in frontend | |

**User's choice:** useProgression hook fires when both org and city are selected.

### Q3: What does the progress indicator look like?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline checklist text | ✓ Local Meetup · ○ Regional Meetup — 1 of 2 completed | ✓ |
| Small progress bar | 2 segments, more visual | |
| Locked badge + tooltip | Minimal footprint, hidden explanation | |

**User's choice:** Inline checklist with checkmark/circle + count.

### Q4: Are lower scales gated too?

| Option | Description | Selected |
|--------|-------------|----------|
| No gating on local/regional | Only regional_fest is progression-gated | ✓ |
| Gate regional_meetup too | Stricter ladder, not in PROG requirements | |
| You decide | Based on PROG-01 text | |

**User's choice:** Only regional_fest is gated. Local and regional always free.

---

## PROG-02 Collaborator Threshold

### Q1: When is the 6-org minimum checked, and what counts?

| Option | Description | Selected |
|--------|-------------|----------|
| Both submit and approval | Submit: named ≥ 6. Approval: accepted ≥ 6 | ✓ |
| Submit only with named | Admin deals with declines manually | |
| Submit with accepted only | All pending at submit, would always fail | |

**User's choice:** Two-phase enforcement — named at submit, accepted at approval.

### Q2: What does the rejection look like?

| Option | Description | Selected |
|--------|-------------|----------|
| 403 fest_collaborator_shortfall with counts | "Currently: 4 accepted, 1 pending, 1 declined" | ✓ |
| 400 generic 'insufficient collaborators' | Less informative | |
| You decide | Error shape | |

**User's choice:** Structured 403 with explicit counts, same pattern as budget_cap_exceeded.

### Q3: Should the frontend show the requirement before submit?

| Option | Description | Selected |
|--------|-------------|----------|
| Inline live counter when regional_fest selected | "3 of 6 collaborators added" | ✓ |
| On scale picker card as footnote | "6+ collaborators required" | |
| No frontend indicator | Server rejects at submit | |

**User's choice:** Inline counter in collaborator section for regional_fest.

---

## PROG-03 Unlock Ceremony

### Q1: When does the OrgProgressionUnlock row get written?

| Option | Description | Selected |
|--------|-------------|----------|
| Lazy write on first eligible check | Progression endpoint writes row as side effect | ✓ |
| On regional_fest proposal submit | Proposing proves eligibility | |
| Explicit POST endpoint | Organiser "claims" the unlock | |
| You decide | | |

**User's choice:** Lazy write — first eligible check triggers the insert.

### Q2: How is "Sponsorship & outreach tools unlocked" surfaced?

| Option | Description | Selected |
|--------|-------------|----------|
| Teal banner on ProposalNew only | "🎉 Sponsorship & outreach tools unlocked for [City]" | ✓ |
| Badge on Org Profile page | Permanent "Fest-Tier" badge | |
| One-time toast + org profile badge | Toast + persistent badge | |
| You decide | | |

**User's choice:** Teal banner on ProposalNew only. No org profile badge, no toast.

### Q3: What authorization guards the progression endpoint?

| Option | Description | Selected |
|--------|-------------|----------|
| can_manage_org_required | Org-internal data, consistent with brand-kit guard | ✓ |
| organiser_required (coarse) | Any organiser sees any org's progression | |
| No guard (public) | Derivable from public event history | |

**User's choice:** can_manage_org_required — consistent with Phase 4's brand-kit pattern.

### Q4: Should the unlock event be audit-logged?

| Option | Description | Selected |
|--------|-------------|----------|
| AuditLog on first unlock write | entity='org_progression_unlocks', action='unlocked' | ✓ |
| No audit | OrgProgressionUnlock row itself is the record | |
| You decide | | |

**User's choice:** AuditLog row on first unlock, consistent with milestone patterns.

---

## Claude's Discretion

None — user selected the recommended option for all 16 questions.

## Deferred Ideas

None — discussion stayed within phase scope.
