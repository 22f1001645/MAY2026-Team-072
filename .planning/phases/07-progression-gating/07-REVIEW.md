---
phase: 07-progression-gating
reviewed: 2026-08-23T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - backend/app/constants.py
  - backend/app/controllers/org_profile_controller.py
  - backend/app/repositories/repos.py
  - backend/app/services/progression_service.py
  - backend/app/services/proposal_service.py
  - backend/seed.py
  - backend/tests/test_progression_gating.py
  - frontend/src/lib/__tests__/fest-eligibility-adapter.test.ts
  - frontend/src/lib/api.ts
  - frontend/src/lib/queries.ts
  - frontend/src/lib/types.ts
  - frontend/src/pages/ApprovalQueue.tsx
  - frontend/src/pages/OrgProfile.tsx
  - frontend/src/pages/ProposalNew.tsx
findings:
  critical: 5
  warning: 7
  info: 7
  total: 19
status: issues_found
---

# Phase 7: Code Review Report

**Reviewed:** 2026-08-23
**Depth:** standard
**Files Reviewed:** 14
**Status:** issues_found

## Summary

Phase 7 adds the fest-tier progression gate: a computed eligibility rule
(`progression_service.fest_eligibility`), two enforcement checkpoints in
`proposal_service` (submit and approve), an unlock marker table, one read route,
and two UI surfaces. The service layer is well factored and the 25 backend tests
in `test_progression_gating.py` pass (verified: `pytest tests/test_progression_gating.py`
→ 25 passed).

The defects are concentrated in the **predicate the whole gate rests on** —
`ActivityRepository.completed_meetups_by_scale` — and in the **demonstrability
of the feature end to end**. The predicate accepts cancelled meetups and
compares a UTC-stored timestamp against local wall-clock time, so the gate opens
in two situations it should not. Separately, the seeded demo data attributes the
qualifying meetups to a `region`-type org while the proposal form only offers
`house`-type orgs, so the unlocked path this phase exists to show cannot be
reached through the UI at all.

Two further correctness bugs sit in files this phase touched but did not
introduce (the month-quota window and the frontend org/city fallback). They are
reported because they are in the reviewed surface, are reachable from Phase 7's
own flows, and are flagged `pre-existing` so they can be triaged separately.

_No `<structural_findings>` block was supplied; all findings below are narrative._

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: A cancelled meetup still counts toward fest eligibility

**File:** `backend/app/repositories/repos.py:236-246` (with `backend/app/services/event_service.py:97-106`)
**Issue:** `completed_meetups_by_scale` defines "completed" as *approved proposal
AND past start date* and deliberately ignores `Activity.status`. But
`event_service.cancel_event` sets `activity.status = EVENT_CANCELLED` and never
touches `Proposal.status`, which stays `approved`. An organiser may cancel their
own event (`activity.organiser_id != current_user.id` is the only check), so the
sequence *propose local → approve → cancel → propose regional → approve → cancel
→ wait for both dates to pass* unlocks the fest tier with two events that never
happened. `assert_fest_eligible` at both checkpoints reads this same function, so
neither checkpoint catches it. The docstring's rejection of `Activity.status`
guards against the opposite failure (counting never-approved rows) and
inadvertently opens this one.
**Fix:** exclude cancelled activities explicitly — the status column is not the
completion test, but it is a valid *dis*qualifier:
```python
from ..constants import EVENT_CANCELLED
...
Activity.query.filter(
    Activity.org_id == org_id,
    Activity.city == city,
    Activity.scale == scale,
    Activity.status != EVENT_CANCELLED,
    Activity.starts_at < datetime.utcnow(),
)
.join(Proposal)
.filter(Proposal.status == "approved")
.count()
```
Add a regression test beside `test_unapproved_past_meetups_do_not_count`.

### CR-02: The completion test compares UTC-stored timestamps against local time

**File:** `backend/app/repositories/repos.py:241`
**Issue:** `Activity.starts_at < datetime.now()`. The docstring claims naive-ness
is "on purpose" because the column is naive — true, but the stored values are
naive **UTC**, not naive local: `ProposalSchema.starts_at` is a
`fields.DateTime` fed from the frontend's `new Date(...).toISOString()`
(`ProposalNew.tsx:174`, always `Z`), and `models._iso` re-appends `Z` on the way
out. Every other timestamp in `models/__init__.py` uses `_utcnow()` =
`datetime.now(UTC)`. `datetime.now()` here is local wall clock, so on an IST
host every meetup that starts within the next 5h30m already counts as
"completed", and on a UTC-behind host a genuinely finished meetup is not counted
for hours. The gate opens (or stays shut) by a timezone offset.
**Fix:**
```python
Activity.starts_at < datetime.utcnow()
```
(`ActivityRepository.sync_past_events` at line 187 has the identical defect and
should move in the same commit.)

### CR-03: The month quota has no upper bound, so it blocks unrelated months

**File:** `backend/app/repositories/repos.py:199-220` (callers: `backend/app/services/proposal_service.py:106`, `:306`) — **pre-existing**
**Issue:** Both `meetups_in_region_month` and `approved_meetups_in_region_month`
filter `Activity.starts_at >= start` where `start` is the first of the target
month, with **no** `< end_of_month` bound. The count therefore includes every
meetup from that date *forward, forever*. Consequence: once an org has an
approved meetup in, say, March, every later attempt to submit or approve a
meetup dated January or February is refused with
`"Quota exceeded: An approved meetup already exists in <target month> for this
region."` — a message that names a month in which nothing exists. Legitimate
proposals are permanently unapprovable in reverse-chronological order.
**Fix:** bound the window at both ends:
```python
start = ref.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
end = (start + timedelta(days=32)).replace(day=1)
q = Activity.query.filter(
    Activity.org_id == org_id,
    Activity.starts_at >= start,
    Activity.starts_at < end,
    Activity.scale.in_(["local_meetup", "regional_meetup"]),
)
```

### CR-04: The proposal form silently submits for a different organisation and city

**File:** `frontend/src/pages/ProposalNew.tsx:150, 170-171` — **pre-existing pattern, now load-bearing for PROG-01**
**Issue:** `isStep1Valid` treats org and city as satisfied when the *list* is
non-empty rather than when a value is *chosen*:
`(form.org_id || manageableHouses.length > 0) && (form.city || cities.length > 0)`.
`submit()` then falls back to `manageableHouses[0]?.id` and `cities[0]?.name`.
A user who manages more than one house and never opens the select (the select is
rendered with a `"Select your house…"` placeholder, so the empty state looks
legitimate) files an audited, state-changing proposal on behalf of an
organisation they did not pick, in a city they did not pick. Phase 7 makes this
worse rather than cosmetic: `effectiveOrgId`/`effectiveCity` mirror the same
fallbacks, so the fest lock is evaluated — and, on approval, an
`OrgProgressionUnlock` row is written — against that unintended org+city pair.
**Fix:** require an explicit selection, and drop the fallbacks from the payload:
```ts
const isStep1Valid = !!(form.title && form.org_id && form.city && form.starts_at
  && form.capacity && form.venue && form.description)
// ...
org_id: form.org_id,
city: form.city,
```
Keep the existing auto-select effect (line 78) for the single-house case so the
common path is unchanged.

### CR-05: The unlocked fest path is unreachable from fresh seed data

**File:** `backend/seed.py:430-442` (with `frontend/src/pages/ProposalNew.tsx:46-49`)
**Issue:** The new seeded regional meetup is attributed to `orgs["hyd_region"]`,
an org of type `region`, as are the pre-existing Hyderabad local meetup and fest.
`ProposalNew` filters the organisation picker to `o.type === 'house'` for both
organisers and admins, and Sai Teja's only POR membership is in **Nilgiri House**
(`seed.py:344-351`). `fest_eligibility(NilgiriHouse, "Hyderabad")` is therefore
`0 of 2` and the fest card stays locked forever — the comment's claim that "fest
tier is actually reachable from fresh seed data" is false for every UI path. In
addition, `seed.py` never writes an `OrgProgressionUnlock` row (the model is
referenced only in `progression_service.py`, `models/`, and two test files), so
`SponsorshipBanner` on `OrgProfile` renders `null` from fresh seed as well. Both
Phase 7 UI surfaces are undemonstrable without hand-editing the database — the
exact situation the seed comment says it prevents.
**Fix:** attribute the qualifying pair to the house the seeded organiser actually
manages (or widen the picker to include the orgs an organiser holds a POR in),
and seed the unlock marker for the same org+city:
```python
nilgiri = house_orgs["Nilgiri House"]
make_activity(nilgiri, "Hyderabad Coffee & Code", "Hyderabad", "local_meetup", -18, ...)
make_activity(nilgiri, "Hyderabad Regional Meetup — Winter Edition", "Hyderabad",
              "regional_meetup", -45, ...)
db.session.add(OrgProgressionUnlock(org_id=nilgiri.id, city="Hyderabad"))
```

## Warnings

### WR-01: The fest collaborator threshold is hardcoded as "6" in the error copy

**File:** `frontend/src/pages/ProposalNew.tsx:717`
**Issue:** `fest_collaborators_required: 'A Regional Fest needs 6 organisations'`
is a literal `6`, directly contradicting the comment 78 lines above it ("count
against the server's threshold, never a literal 6") and the contract on
`FestEligibility.collaboratorThreshold` in `types.ts:369-371` ("Never hardcode
this number in a component"). Changing `FEST_COLLAB_THRESHOLD` leaves this
heading lying to the user.
**Fix:** make the heading generic and let the server's message carry the number —
it already states the shortfall numerically:
```ts
fest_collaborators_required: 'Not enough collaborating organisations',
```

### WR-02: Every decision failure is labelled "Not approvable yet"

**File:** `frontend/src/pages/ApprovalQueue.tsx:333-336`
**Issue:** The single `ErrorStrip` heading is hardcoded and rendered for *any*
`decisionMut` error — including `note_required` from **Request Changes**, and
failures from **Reject** and **Revoke Approval**. An admin who clicks "Request
Changes" with an empty note is told the proposal is "Not approvable yet", which
is about a different action entirely. `ProposalNew` already has the right idiom
(`ERROR_HEADINGS` keyed on `error.code`).
**Fix:** key the heading on the server's code, mirroring `ProposalNew`:
```ts
const DECISION_HEADINGS: Record<string, string> = {
  fest_locked: "Regional Fest isn't unlocked for this organisation",
  fest_collaborators_required: 'Not every collaborator has accepted',
  quota_exceeded: 'Quota already used this month',
  note_required: 'A note is required to request changes',
  already_decided: 'This proposal has already been decided',
}
```

### WR-03: `record_unlock` get-or-create can 500 and discard the approval it recorded

**File:** `backend/app/services/progression_service.py:100-115`
**Issue:** The docstring rejects `try/except IntegrityError` because a caught
error would force a rollback that discards the approval — but the check-then-
insert it uses instead is not atomic either. Two admins approving two qualifying
proposals for the same org+city concurrently both see `existing is None`, both
insert, and the `uq_org_progression` unique constraint fires at
`decide()`'s `db.session.commit()`. The loser gets an unhandled `IntegrityError`
(HTTP 500) and loses the entire approval transaction — precisely the outcome
T-07-09 was written to avoid, just relocated from the `except` block to the
commit.
**Fix:** make the insert idempotent at the database level rather than in Python.
On Postgres, `INSERT ... ON CONFLICT DO NOTHING` via
`sqlalchemy.dialects.postgresql.insert`; a portable alternative is a
`SAVEPOINT`-scoped insert (`db.session.begin_nested()`) whose rollback discards
only the marker, leaving the outer approval transaction intact.

### WR-04: A revoked qualifying meetup leaves the unlock marker (and banner) standing

**File:** `backend/app/services/proposal_service.py:360-371`, `backend/app/services/progression_service.py:100-115`
**Issue:** `assert_fest_eligible` correctly re-computes at approve time, so
revoking the qualifying regional meetup re-locks fest proposals (covered by
`test_direct_approve_of_locked_scale_is_403`). The `OrgProgressionUnlock` row
written by the earlier approval is never removed by the `revoke` branch, so
`SponsorshipBanner` keeps telling the org's managers "Sponsorship & outreach
tools unlocked — {org} reached fest tier here" while the fest card is locked
again. The two surfaces disagree, which is exactly the drift assumption A1 says
`record_unlock`'s placement exists to prevent.
**Fix:** either delete the marker in the `revoke` branch when
`fest_eligibility(...)["fest_eligible"]` is now false, or state the one-way
semantics in the banner copy ("has reached fest tier") so the two surfaces are
not read as the same claim. Pick one and pin it with a test.

### WR-05: `decide()` hardcodes the quota constant it imports elsewhere

**File:** `backend/app/services/proposal_service.py:307`
**Issue:** `if count >= 1:` uses a magic number while the submit-side check 200
lines above uses `MEETUPS_PER_CITY_PER_MONTH` (line 107). CLAUDE.md is explicit
that business constants live in `constants.py`; raising the quota to 2 would
change submit and leave approve enforcing 1.
**Fix:** `if count >= MEETUPS_PER_REGION_PER_MONTH:` and import the canonical
name rather than the back-compat alias.

### WR-06: The unlock write depends on implicit autoflush ordering

**File:** `backend/app/services/proposal_service.py:327-349`
**Issue:** `proposal.status = PROPOSAL_APPROVED` (line 327) is only visible to
`fest_eligibility(...)` at line 348 because SQLAlchemy autoflushes the dirty
session before that query runs. Nothing in the code says so, and the marker is
supposed to be written by "the approval that completes the pair". If autoflush
is ever disabled on this session (a common hardening step), the marker silently
stops being written and both PROG-03 surfaces go quiet with no error.
**Fix:** make the dependency explicit — `db.session.flush()` immediately before
the eligibility recompute, with a one-line comment naming why.

### WR-07: snake_case leaks into the camelCase domain types and into a page

**File:** `frontend/src/lib/types.ts:235-252`, `frontend/src/pages/ApprovalQueue.tsx:39, 41, 259-261` — **pre-existing**
**Issue:** `Collaborator` and `TeamMember` are declared with wire-shaped keys
(`activity_id`, `org_id`, `is_primary`, `responded_at`, `user_id`, `added_by`)
inside the module CLAUDE.md designates as "camelCase domain types the pages
render", and `ApprovalQueue` reads `c.is_primary` / `c.org_id` directly. Phase 7
code now depends on this shape (`primaryOrgId` at line 39 feeds
`useOrgProgression`), so the drift is spreading rather than shrinking. Note the
adjacent Phase 7 additions (`FestEligibility`, `OrgUnlock`,
`adaptFestEligibility`) get this exactly right — the inconsistency is within one
file.
**Fix:** camelise `Collaborator`/`TeamMember` and adapt them in `adaptEvent`
alongside `adaptFestEligibility`, updating the three read sites in
`ApprovalQueue` and any others (`EventDetail`, `ManageEvent`) in the same change.

## Info

### IN-01: Unused import

**File:** `frontend/src/pages/ApprovalQueue.tsx:1`
**Issue:** `useEffect` is imported and never used (single occurrence in the file).
**Fix:** `import { useState } from 'react'`.

### IN-02: Unused module-level constant

**File:** `frontend/src/pages/ProposalNew.tsx:738-739`
**Issue:** `selectCls` is declared and never referenced (single occurrence);
leftover from the migration to `FormSelect`.
**Fix:** delete it.

### IN-03: Duplicated branches with identical bodies

**File:** `backend/app/services/proposal_service.py:86-97`
**Issue:** `if len(meetup_heads) == 0` and `if len(meetup_heads) > 1` raise the
same `ApiError` with the same message and code.
**Fix:** `if len(meetup_heads) != 1: raise ApiError("A proposal must name exactly one Meetup Head", "invalid_team", 400)`.

### IN-04: f-string with no placeholders

**File:** `backend/app/services/proposal_service.py:109`
**Issue:** `f"Quota guardrail: this region already has a meetup this month"` has
no interpolation. It also does not name the month, unlike the approve-side
message.
**Fix:** drop the `f` prefix, or interpolate the month so the two quota messages
match.

### IN-05: Dead back-compat query method

**File:** `backend/app/repositories/repos.py:248-257`
**Issue:** `meetups_in_city_month` is described as kept "for backward compat with
existing tests" but has no production caller and carries the same missing upper
bound as CR-03.
**Fix:** remove it, or fix its window alongside CR-03 so a future caller does not
inherit the bug.

### IN-06: Test gaps around the two CR-01/CR-02 paths

**File:** `backend/tests/test_progression_gating.py:255-304`
**Issue:** `TestEligibilityExclusions` covers per-city scoping, unapproved
proposals, future dates and the `Activity.status == "completed"` trap, but not
(a) a cancelled activity with an approved proposal, or (b) a start date inside
the local-vs-UTC skew window. Both are the failures CR-01 and CR-02 describe, so
the suite reads as complete while leaving the gate's two real holes unpinned.
**Fix:** add `test_cancelled_meetup_does_not_count` and a boundary case seeded at
`datetime.utcnow() + timedelta(hours=3)` that must not count.

### IN-07: `.bak` copies of reviewed pages are committed

**File:** `frontend/src/pages/ProposalNew.tsx.bak`, `frontend/src/pages/OrgProfile.tsx.bak`, `frontend/src/pages/EventDetail.tsx.bak`
**Issue:** Full stale copies of two of the pages under review (plus a third) are
tracked in git. They are excluded from the TS build by extension but are dead
code that will drift and confuse future greps for PROG-01 logic.
**Fix:** delete them and rely on git history.

### IN-08 (note, not a defect): progression is readable for any organisation

**File:** `backend/app/controllers/org_profile_controller.py:34-51`
**Issue:** `GET /orgs/<id>/progression` is `auth_required` only, so any signed-in
student can read any organisation's completion counts and full unlock list. The
docstring documents this as intentional (assumption A2) and every fact is
derivable from the published feed, so no exposure is created. Recorded only so
the decision is visible in review.
**Fix:** none required. Revisit if unlock rows ever carry non-derivable data.

---

_Reviewed: 2026-08-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
