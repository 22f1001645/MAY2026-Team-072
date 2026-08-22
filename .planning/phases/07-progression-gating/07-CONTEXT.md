# Phase 7: Progression Gating - Context

**Gathered:** 2026-08-22
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase adds progression gating: an organisation's ability to propose `regional_fest` scale events unlocks from its own completed track record in a given city. The gate is enforced server-side (PROG-04) and explained in the UI with explicit progress indicators (PROG-01). A fest-scale proposal additionally requires at least 6 collaborating organisations (PROG-02). Reaching fest eligibility records a "Sponsorship & outreach tools unlocked" flag (PROG-03) — the tooling itself stays out of scope.

The two lower scales (`local_meetup`, `regional_meetup`) remain freely selectable. Only `regional_fest` is progression-gated.

</domain>

<decisions>
## Implementation Decisions

### Eligibility Computation (PROG-01, PROG-04)

- **D-01:** A "completed" event for progression purposes is defined as `proposal.status == 'approved' AND activity.starts_at < utcnow()` — no manual status flip needed. An event counts the moment its scheduled start time passes. — **Reversibility:** reversible.

- **D-02:** A new `progression_service.py` contains one function that computes eligibility and returns a structured result `{eligible: bool, completed: {local_meetup: N, regional_meetup: N}, required: {local_meetup: 1, regional_meetup: 1}, unlocked: bool}`. Called at both submit and admin-approval time (PROG-04: "checked on both submit and approve"). — **Reversibility:** reversible.

- **D-03:** A new `GET /api/v1/orgs/<org_id>/progression?city=<city>` endpoint returns the structured eligibility result. ProposalNew calls this when the org and city are both selected, before the scale picker renders. Guarded by `can_manage_org_required` — progression data is org-internal, consistent with Phase 4's brand-kit GET guard. — **Reversibility:** reversible.

- **D-04:** Eligibility is scoped to the org's OWN completed activities only (where `Activity.org_id = org_id`). Collaboration on someone else's event does not count toward your org's progression. — **Reversibility:** reversible.

### Scale Picker UX (PROG-01)

- **D-05:** The `regional_fest` card on ProposalNew stays visually present when locked but uses `aria-disabled` with reduced opacity + a lock icon. Below the label, inline progress text shows: `✓ Local Meetup · ○ Regional Meetup — 1 of 2 completed`. The lock icon replaces the teal selection border. Consistent with Phase 5's aria-disabled + tooltip pattern for role-gated buttons. — **Reversibility:** reversible.

- **D-06:** A `useProgression(orgId, city)` TanStack Query hook fires when both org and city are selected. Long stale time since progression changes only when events pass their start date. — **Reversibility:** reversible.

- **D-07:** Only `regional_fest` is progression-gated. `local_meetup` and `regional_meetup` are always freely selectable — no ladder for the lower scales. — **Reversibility:** reversible.

### PROG-02 Collaborator Threshold

- **D-08:** The 6-org minimum for `regional_fest` is checked at BOTH submit and approval. At submit: count all NAMED collaborators (pending + accepted) — must be ≥ 6. At approval: re-check with only ACCEPTED collaborators — if declines brought the count below 6, the admin cannot approve. — **Reversibility:** reversible.

- **D-09:** Rejection returns 403 with `{code: 'fest_collaborator_shortfall', detail: 'Regional Fest requires at least 6 collaborating organisations. Currently: 4 accepted, 1 pending, 1 declined.'}` — names the shortfall explicitly, same pattern as `budget_cap_exceeded`. — **Reversibility:** reversible.

- **D-10:** The frontend shows a "6 collaborators required" note inline on the ProposalNew collaborator section only when scale is `regional_fest` — a live counter like "3 of 6 collaborators added". No separate page needed. — **Reversibility:** reversible.

### PROG-03 Unlock Ceremony

- **D-11:** The `OrgProgressionUnlock` row is written lazily — the first time the progression endpoint is called and finds the org eligible for a given city, the row is inserted (with `uq_org_progression` preventing duplicates). No separate ceremony call or explicit "claim" endpoint. — **Reversibility:** reversible.

- **D-12:** When the progression query returns `unlocked=true`, ProposalNew shows a teal banner above the scale picker: "🎉 Sponsorship & outreach tools unlocked for [City]". No CRM tooling behind it (explicitly out of scope). This is the only UI surface — no org profile badge, no toast. — **Reversibility:** reversible.

- **D-13:** An AuditLog row is written when the OrgProgressionUnlock row is first created — `entity='org_progression_unlocks', action='unlocked', note={org_id, city, unlocked_at}`. Consistent with the existing AuditLog patterns. No audit for reads. — **Reversibility:** reversible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Progression Gating (L95-98) — canonical requirement text for PROG-01, PROG-02, PROG-03, PROG-04
- `.planning/ROADMAP.md` §Phase 7 (L264-277) — Phase goal, success criteria, dependency on Phase 3 and Phase 6

### Backend Models (exist; no new migration needed)
- `backend/app/models/__init__.py` §Activity (L303-368) — `scale`, `city`, `org_id`, `status`, `starts_at`, `collaborators` backref, `is_mega_meetup` property
- `backend/app/models/__init__.py` §ActivityCollaborator (L435-480) — `status` (pending/accepted/declined), `uq_activity_collaborator` unique constraint
- `backend/app/models/__init__.py` §OrgProgressionUnlock (L1161-1187) — `org_id`, `city`, `unlocked_at`, `uq_org_progression` unique constraint; docstring is explicit: NOT the eligibility source, only the PROG-03 flag
- `backend/app/models/__init__.py` §Proposal — `status` column needed for the `approved` check

### Backend Constants & Services
- `backend/app/constants.py` L107 — `ACTIVITY_SCALES = ("local_meetup", "regional_meetup", "regional_fest")`
- `backend/app/constants.py` L376-381 — `BUDGET_CAPACITY_RATE`, `BUDGET_ABSOLUTE_CEILING` (budget cap already exempts `regional_fest`)
- `backend/app/constants.py` L383-387 — `MEGA_MEETUP_THRESHOLD = 3` (Mega Meetup pattern for reference)
- `backend/app/services/proposal_service.py` L44-69 — `submit_proposal()` with BUDGET-01 cap and `regional_fest` exemption; Phase 7 adds PROG-01/04 gate alongside this
- `backend/app/rbac.py` — `can_manage_org_required` decorator (guards the new progression endpoint)

### Frontend
- `frontend/src/pages/ProposalNew.tsx` L140-166 — current scale picker (3 equal buttons, no gating); Phase 7 modifies this to aria-disabled + progress indicator
- `frontend/src/lib/format.ts` — `scaleLabel` mapping
- `frontend/src/lib/types.ts` — `ActivityScale` type
- `frontend/src/pages/KanbanWorkspace.tsx` — aria-disabled + tooltip pattern for role-gated buttons (reuse pattern)

### Prior Phase Context
- `.planning/phases/06-event-execution-close-out/06-CONTEXT.md` — Phase 6 decisions (reimbursement, timeline patterns)
- `.planning/STATE.md` — "any team member drafts, only the Meetup Head submits" rule; OrgProgressionUnlock model exists

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `OrgProgressionUnlock` model — fully declared with `uq_org_progression` unique constraint; ready for Phase 7 to write rows into
- `can_manage_org_required` decorator — already built in Phase 1/4; gates the new progression endpoint
- `ACTIVITY_SCALES` tuple — used by Marshmallow schema validation; the eligibility function filters by these values
- `ActivityCollaborator.status` — `COLLAB_ACCEPTED` constant and the backref on Activity; used for PROG-02's accepted-count check at approval time
- `budget_cap_exceeded` error pattern in `proposal_service.py` — template for the `fest_collaborator_shortfall` error response
- `AuditLog` + `note` JSON column — established pattern for structured audit writes
- `is_mega_meetup` property on Activity — demonstrates the computed-not-stored pattern Phase 7 uses for eligibility

### Established Patterns
- **aria-disabled + tooltip for role-gated buttons** — established in Phase 5 (KanbanWorkspace); use for the locked scale card
- **Structured 403/400 error codes** — `budget_cap_exceeded`, `invalid_team`, `forbidden`; Phase 7 adds `scale_locked` and `fest_collaborator_shortfall`
- **TanStack Query hooks** — `useProgression(orgId, city)` follows the same pattern as `useSchedulePresets(scale)` from Phase 5
- **Computed-not-stored eligibility** — OrgProgressionUnlock docstring explicitly states eligibility is always computed, never read from the unlock table (threat T-01-18)
- **Blueprint registration** — new controllers must be added to `ALL_BLUEPRINTS` in `controllers/__init__.py`

### Integration Points
- `GET /api/v1/orgs/<org_id>/progression?city=<city>` (new) — returns eligibility + completion counts + unlock state; read by ProposalNew's `useProgression` hook
- `proposal_service.submit_proposal()` — Phase 7 adds a PROG-01/04 gate before the existing BUDGET-01 check
- Admin approval endpoint — Phase 7 adds a PROG-04 re-check (progression + PROG-02 accepted collaborator count) before approving `regional_fest` proposals
- `ProposalNew.tsx` scale picker — modified to show locked state with inline progress + unlock banner

</code_context>

<specifics>
## Specific Ideas

- **Progression endpoint response shape:** `{eligible: bool, completed: {local_meetup: N, regional_meetup: N}, required: {local_meetup: 1, regional_meetup: 1}, unlocked: bool}` — frontend renders the checklist directly from `completed` vs `required`.
- **Locked scale card text:** `✓ Local Meetup · ○ Regional Meetup — 1 of 2 completed` — uses checkmark for completed, circle for remaining. Lock icon (🔒 or SVG) replaces the teal selection border.
- **Unlock banner:** Teal card/banner above the scale picker: "🎉 Sponsorship & outreach tools unlocked for [City]". Only visible when `unlocked=true`.
- **Collaborator counter:** When `regional_fest` is selected, the collaborator section shows "3 of 6 collaborators added" with a live count.
- **PROG-04 error on submit:** `{code: 'scale_locked', detail: 'Regional Fest requires 1 completed local meetup and 1 completed regional meetup in [city]. Currently: 1 local, 0 regional.'}` — names the exact shortfall.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 7-progression-gating*
*Context gathered: 2026-08-22*
