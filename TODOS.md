# TODOS

Deferred work captured during reviews. Not scheduled — pick up when the
context below still applies.

## Rename "Capacity" consistently app-wide

**What:** `ProposalNew.tsx` now says "Expected headcount"; `Discover.tsx`,
`EventDetail.tsx`, and `ApprovalQueue.tsx` still say "Capacity".

**Why:** Real label inconsistency across the app now that the proposal form
uses different wording than the rest of the product.

**Pros:** Consistent vocabulary for the same underlying field.

**Cons:** The two contexts are genuinely different — pre-approval estimate
(what the organiser expects) vs post-approval attendance tracking (what
actually happened). "Expected headcount" may be wrong for the latter.
Validate with users before a blanket search-replace.

**Context:** Surfaced during the New Proposal form eng review, 2026-08-30.

**Depends on:** Nothing blocking — pick up whenever.

## Public `/config/activity-scales` endpoint

**What:** A backend endpoint serving `CAPACITY_RANGES` (from
`backend/app/constants.py`) so the frontend doesn't duplicate the numbers in
`frontend/src/lib/format.ts`'s `scaleMeta`.

**Why:** Today there are 2 consumers of the same 3 numbers, kept in sync by a
code comment pointing at `constants.py`. Fine at this scale.

**Pros:** True single source of truth if a 3rd consumer (mobile app, admin
tool) ever needs the same ranges.

**Cons:** New endpoint + query hook + loading state on the wizard's first
paint, for a value that changes maybe once a year. Premature today.

**Context:** Surfaced during the New Proposal form eng review, 2026-08-30.

**Depends on:** A second consumer actually materializing.
