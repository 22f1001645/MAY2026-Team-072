# Phase 7: Progression Gating - Context

**Gathered:** 2026-08-23
**Status:** Ready for planning

<domain>
## Phase Boundary

An organisation's eligibility to propose `regional_fest` scale in a given city unlocks once that org has completed, in that same city, at least one `local_meetup` and at least one `regional_meetup`. A `regional_fest` proposal additionally requires 6 collaborating organisations. Both gates are enforced server-side by one function, checked at proposal submit AND at admin approval, returning 403 on a direct API bypass attempt. Reaching fest-tier records a one-way "sponsorship & outreach tools unlocked" marker per (org, city) — no CRM tooling is built, only the flag and its UI surfacing.

Out of scope: any sponsorship/outreach CRM build-out (SPONSOR-01, explicit v2), multi-department fest orchestration beyond named collaborators.

</domain>

<decisions>
## Implementation Decisions

### Fest-collaborator gate timing (PROG-02)

- **D-01:** REQUIREMENTS.md's PROG-02 text ("named on the proposal") and ROADMAP.md's Phase 7 success criterion #3 ("accepted collaborating organisations") conflict — collaborators always start `pending` on a brand-new proposal (only the primary org auto-accepts at creation), so an "accepted >= 6" check can never pass at the instant of submission. Resolved as a **two-point check with two different definitions**: `submit_proposal()` checks the **named** count (`collaborating_org_ids` + primary >= 6) — structural, "did you name enough orgs." `decide()`'s approve branch re-checks the **live accepted** count (`COLLAB_ACCEPTED` rows including primary >= 6) — substantive, mirrors `Activity.is_mega_meetup`'s existing dynamic-property pattern (`MEGA_MEETUP_THRESHOLD`-style, no stored flag). A fest proposal can sit in the admin queue while named collaborators accept/decline; approval blocks (with a reason naming the shortfall) until 6 have actually accepted. — **Reversibility:** reversible — this is business-rule logic in two service functions, no schema commitment either way.

- **D-02 (rejected alternatives):** "Accepted count required at submit too" was rejected — no mechanism exists in the schema to carry over already-accepted collaborators from a prior activity, so this would make a first-time fest proposal structurally impossible. "Named count checked both times" was also rejected — it would let a fest proposal with 6 named-but-declined collaborators still get approved, defeating PROPOSAL-06's consent guarantee that PROG-02 is meant to lean on.

### Per-city scoping (PROG-01)

- **D-03:** Track-record eligibility stays **scoped per city**, exactly as REQUIREMENTS.md states ("in that same city") and as the existing `org_progression_unlocks` table already models (unique key on `org_id, city`, migrated in Phase 1). An org unlocks `regional_fest` in a specific city only once it has completed >= 1 `local_meetup` AND >= 1 `regional_meetup` **in that same city** — not an org-wide aggregate across all cities. No schema change needed; this was a clarifying confirmation, not a new decision. — **Reversibility:** reversible (confirms existing schema/requirement wording; no code written yet).

### Eligibility UI surfacing

- **D-04:** The `regional_fest` scale-selector button on `ProposalNew.tsx` (currently one of 3 unconditionally-clickable option cards, rendered above the org/city pickers on the same step) gets a **live-fetch lock state**: a new endpoint is queried whenever `org_id` or `city` changes on the form; the button shows a lock affordance + "1 of 2 completed" style caption and is unclickable until the org is eligible for that specific org+city pair. — **Reversibility:** reversible (additive UI + new read endpoint).

- **D-05:** The PROG-03 "Sponsorship & outreach tools unlocked" marker (an `org_progression_unlocks` row) surfaces as a **banner on `OrgProfile.tsx`** (the org's own ORG-01 identity page), visible to that org's Secretary/Deputy Secretary/RC, listing which city/cities have unlocked it. No notification-on-creation was requested — banner only. — **Reversibility:** reversible (additive UI read of an existing table).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §Progression Gating — canonical requirement text for PROG-01/02/03/04
- `.planning/ROADMAP.md` §Phase 7: Progression Gating — goal, success criteria (note the named-vs-accepted wording conflict resolved by D-01), dependency on Phase 3 + Phase 6
- `.planning/PROJECT.md` §Key Decisions — "Build progression-gating now (using the safe `approved AND starts_at < now()` count, not `status == completed`)" — PROG-01's eligibility formula is already locked here, not re-litigated this session

### Backend Models (schema already exists — no migration needed for PROG-01/02/04; D-05's banner reads an existing table)
- `backend/app/models/__init__.py` §`OrgProgressionUnlock` — the one-way PROG-03 marker table (`org_id`, `city`, `unlocked_at`), unique on `(org_id, city)`; its docstring already states it is NOT the eligibility source — PROG-01/PROG-04 must compute eligibility live every time
- `backend/app/models/__init__.py` §`Activity.is_mega_meetup` — the exact dynamic-property pattern D-01's approve-time accepted-count check should mirror (counts `COLLAB_ACCEPTED` collaborators including primary, no stored flag)
- `backend/app/models/__init__.py` §`ActivityCollaborator` — `status` (`pending`/`accepted`/`declined`), `is_primary`, `org_id`, `activity_id`; docstring already annotates "regional-fest collaborator minimum (PROG-02)" as a Phase 7 business rule, not a schema constraint
- `backend/app/models/__init__.py` §`Activity` — `scale`, `org_id`, `city`, `starts_at`; `Activity.status`/`Proposal.status` combination is what "approved AND starts_at < now()" reads

### Backend Constants
- `backend/app/constants.py` — `ACTIVITY_SCALES = ("local_meetup", "regional_meetup", "regional_fest")`; `MEGA_MEETUP_THRESHOLD = 3` (comment: "including primary") — the constant a new `FEST_COLLAB_THRESHOLD = 6` should sit beside; `COLLAB_PENDING`/`COLLAB_ACCEPTED`/`COLLAB_DECLINED`

### Backend Services (Phase 7 extends these)
- `backend/app/services/proposal_service.py` §`submit_proposal()` (L44) — existing insertion point for PROG-01's eligibility check and D-01's named-count check on `regional_fest`; follows the existing `BUDGET-01`/quota-guardrail pattern already in this function (raise `ApiError` with a specific error code, before any DB write)
- `backend/app/services/proposal_service.py` §`decide()` (L263), specifically the `if decision == "approve":` branch (L274) — existing insertion point for the approve-time re-check (PROG-04's second checkpoint), follows the existing quota-guardrail re-check pattern already there

### Backend Repositories (existing count-query pattern to follow)
- `backend/app/repositories/repos.py` §`ActivityRepository.meetups_in_region_month` / `.approved_meetups_in_region_month` (L199-220) — the exact query-shape precedent for PROG-01's "completed local+regional in this city" counts (filter by `org_id`, `scale`, join `Proposal.status`); PROG-01 needs an `Activity.starts_at < now()` clause these don't have, since they count future-scheduled meetups toward a monthly quota rather than completed ones

### Frontend
- `frontend/src/pages/ProposalNew.tsx` — scale-selector buttons (L204-228, currently always-clickable), `org_id`/`city` form fields (L55-56, L247-259) set in the same step; D-04's lock-state fetch keys off these two fields changing
- `frontend/src/pages/OrgProfile.tsx` — ORG-01 identity page; D-05's banner lands here

### Prior Phase Context
- `.planning/phases/06-event-execution-close-out/06-CONTEXT.md` — no direct reuse, but confirms the "server computes, UI reflects" pattern used throughout this milestone
- `.planning/STATE.md` — "Progression gating is unvalidated — the milestone's only feature with no market analogue... build now, validate in parallel" (Blockers/Concerns section)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Activity.is_mega_meetup` property — the dynamic accepted-collaborator-count pattern to copy for the approve-time PROG-02 check
- `ActivityRepository.meetups_in_region_month` / `.approved_meetups_in_region_month` — query-shape precedent for the new PROG-01 completed-count helper (needs `starts_at < now()` added, and scoped to a single scale rather than `in_(["local_meetup", "regional_meetup"])`)
- `org_progression_unlocks` table — already migrated (Phase 1 batch, `213804635519`), zero new migration needed for the backend half of this phase
- `ApiError` raise pattern already established in `submit_proposal()`/`decide()` for quota/budget rejections — reuse the same shape (message, error code, 403/409) for PROG-01/02/04 rejections

### Established Patterns
- "Compute live, never trust a stored flag for authorization" — explicit in `OrgProgressionUnlock`'s own docstring (named threat: "a stale or forged row here would grant fest-proposal rights the activity history does not support")
- "Any team member drafts, only the Meetup Head submits" is unrelated to this phase — no draft/submit split applies to progression gating, it's a pure authorization gate
- Two-checkpoint enforcement (submit + approve) already exists for the quota guardrail in this exact file — Phase 7 adds a third rule pair to the same two functions, not a new pattern

### Integration Points
- `submit_proposal()` — add PROG-01 (only for `regional_fest`) + D-01's named-count PROG-02 check, before the existing collaborator-org-id validation loop (L102) so a locked org never gets past to writing `ActivityCollaborator` rows
- `decide()`'s approve branch — add PROG-01 re-check (defensive, mirrors quota re-check) + D-01's accepted-count PROG-02 check + PROG-03's `OrgProgressionUnlock` row creation (get-or-create on `(org_id, city)`) once eligibility is newly true
- New read endpoint (shape TBD by planner) for D-04's ProposalNew lock-state fetch — likely `GET /orgs/<org_id>/progression?city=<city>` returning local/regional completed counts + fest eligibility + collaborator threshold, since "1 of 2 completed" needs both counts individually, not just a boolean
- `OrgProfile.tsx` — new banner section reading the org's `org_progression_unlocks` rows (needs a `GET` exposing them, e.g. via the existing org profile payload or a small new endpoint)

</code_context>

<specifics>
## Specific Ideas

- Error messages must name the shortfall per ROADMAP success criterion #3 (e.g., "4 of 6 collaborating organisations accepted") and per success criterion #1's UI wording ("1 of 2 completed" style) — both counts (local done? regional done?) must be independently available, not collapsed into one boolean.
- The `FEST_COLLAB_THRESHOLD = 6` constant belongs beside `MEGA_MEETUP_THRESHOLD = 3` in `constants.py`, following the same "including primary" convention.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 7-progression-gating*
*Context gathered: 2026-08-23*
