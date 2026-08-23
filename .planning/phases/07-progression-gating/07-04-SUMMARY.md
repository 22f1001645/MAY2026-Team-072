---
phase: 07-progression-gating
plan: 04
subsystem: frontend
tags: [progression, gating, proposal, accessibility, ui]
status: complete

requires:
  - "useOrgProgression (plan 07-03)"
  - "FestEligibility.collaboratorThreshold / requirementsMet / requirementsTotal (plan 07-03)"
  - "403 codes fest_locked, fest_collaborators_required (plan 07-01)"
provides:
  - "locked regional_fest scale card + #fest-lock-reason caption"
  - "guarded auto-revert with the gold switched-back notice"
  - "fest collaborator threshold counter"
  - "ERROR_HEADINGS.fest_locked, ERROR_HEADINGS.fest_collaborators_required"
affects:
  - "ProposalNew scale selector — regional_fest is now conditionally unclickable"
  - "ProposalNew collaborating-orgs caption — branches on scale"

tech-stack:
  added: []
  patterns:
    - "Lock state is derived from the query result, not from a separate boolean: `!progression?.festEligible` makes indeterminate, loading and error all fail closed in one expression"
    - "The revert predicate is a second, stricter derivation (`!isLoading && !isError && data && !festEligible`) so only a resolved answer may mutate state"
    - "aria-disabled + onClick noop instead of the disabled attribute, so the reason stays reachable by keyboard (the T-05-42 PushLiveGate precedent)"

key-files:
  created: []
  modified:
    - frontend/src/pages/ProposalNew.tsx

decisions:
  - "The auto-revert needed a useEffect — render-time derivation could not do it, because the revert also has to mutate `scale`, which is user-owned state the render pass must not write"
  - "The revert notice is dismissed by a `chooseScale` wrapper rather than by a render-pass-scoped variable, so it survives re-renders and clears on the next explicit scale click"
  - "Zero 07-UI-SPEC §6 copy needed changing — every string fit the existing layout verbatim"

metrics:
  duration: 9min
  completed: 2026-08-23
  tasks: 2
  files: 1

actuals:
  tokens: 3100
  tasks: 2
  commits: 2
---

# Phase 7 Plan 04: Fest Gate Legibility Summary

The Regional Fest card now reads its lock from the server, names which half of the track record is missing and in which city, counts named organisations against the server's threshold, and turns both 403s into headed inline alerts carrying the server's own wording — all inside one existing file, no new component.

## What was built

**The lock is one derivation, not a state machine.** `festLocked = !progression?.festEligible` covers indeterminate, in-flight and errored in a single expression, so every non-eligible path fails closed by construction rather than by remembering to handle it. The caption then picks a message for *why*, in four mutually exclusive branches evaluated in that order: no org/city → in flight → errored → resolved-and-ineligible.

**The revert is a deliberately stricter predicate.** `festIneligible = !progLoading && !progError && !!progression && !progression.festEligible` is a separate value from `festLocked` for exactly the reason 07-UI-SPEC gives loading and error their own captions: they are *not* "ineligible", and reverting on them would flip the selection while the query is still in flight. That distinction is the whole of Pitfall 7.

**Eligibility is queried with `effectiveOrgId` / `effectiveCity`**, mirroring the submit payload's `form.org_id || manageableHouses[0]?.id` and `form.city || cities[0]?.name` fallbacks. On the single-house path `form.org_id` is filled by the existing auto-select effect, but on the multi-house and no-city-picked paths the raw form fields are empty while the request still carries a value — querying those directly would have produced a caption naming a different city than the proposal (T-07-15).

**No numeral from `constants.py` reaches TSX.** `Locked · {requirementsMet} of {requirementsTotal} completed` interpolates both server values, and the collaborator counter reads `collaboratorThreshold`. The only literal `6` in the file is inside the `fest_collaborators_required` error *heading*, which is fixed copy from 07-UI-SPEC §6, not a computed threshold.

## The two answers the plan's `<output>` asked for

**1. Did any 07-UI-SPEC §6 copy have to change to fit the layout?** No. Every string — all four caption states, the revert notice, both counter lines, both error headings — went in verbatim. The scale card had room for the caption without a layout change because the grid already equalises card heights.

**2. Did the auto-revert need an effect, or did it fall out of render-time derivation?** It needed an effect. The revert has to *write* `scale`, which is user-owned state; a render-time derivation could only have computed a shadow "effective scale", which would then have disagreed with the selected-card highlight and with the submit payload. The effect is guarded on `[festIneligible, scale]` and its body is `if (festIneligible && scale === 'regional_fest')`, so it fires at most once per transition into ineligibility: the `setScale('regional_meetup')` invalidates its own condition.

## Deviations from Plan

None. Both tasks executed as written.

Two small shape choices inside the plan's latitude, recorded because a later reader will see them in the diff:

- The scale map's arrow body became a block with an early `return` for the locked case, rather than a ternary inside one `<button>`. A single button carrying both class sets and both title rows would have been the larger diff and the harder read; the shared sub-caption string is hoisted to a `sub` const so it is not duplicated.
- The revert notice's dismissal uses a `chooseScale(s)` wrapper on the two live cards (`setFestReverted(false); setScale(s)`) rather than 07-UI-SPEC §5.1's "for that render pass" wording. A render-pass-scoped notice would vanish on the next unrelated keystroke in the form — the gold strip has to survive until the user actually reacts to it.

## Verification

| Check | Result |
|---|---|
| `cd frontend && npm run build` (after each task) | exit 0 |
| `npx vitest run` (full frontend suite) | 27 files, 183 tests passed — no regression |
| `grep -n 'aria-disabled' ProposalNew.tsx` | :261, on the locked fest button |
| `disabled={` inside the locked button's JSX | 0 — the card stays focusable |
| `grep -n 'fest-lock-reason'` | :262 (`aria-describedby`) and :275 (caption `id`) |
| `grep -n 'aria-live'` | :277, on the caption region |
| All five §6 caption strings verbatim | `Pick a city to check eligibility.` :109, `Checking eligibility…` :110, `Couldn't check eligibility. The server enforces this on submit.` :111, `` Locked ·  `` :118, `— not yet` :284 |
| `grep -n 'useOrgProgression'` | :93, called with `effectiveOrgId, effectiveCity` |
| `grep -n 'fest_locked\|fest_collaborators_required'` | :716, :717 — exactly the two `ERROR_HEADINGS` entries |
| `grep -n 'collaboratorThreshold'` | :644, read from the response |
| `Submit proposal` button `disabled` expression | absent from `git diff` — byte-identical |
| `git diff --stat frontend/package.json frontend/package-lock.json` | empty — zero new dependencies |

**Not verified automatically:** the loading, fetch-error and indeterminate captions, the gold revert notice, the gold→teal counter flip and the 6+ chip wrap are all render-state visuals with no automated gate on this page. They are on 07-VALIDATION.md's manual-only list and are exercised at plan 07-05's checkpoint. This is the plan's stated verification design, not a gap introduced here.

## Known Stubs

None. Every branch renders real server data or a specified message; nothing is hardcoded to an empty value or a placeholder.

## Threat Flags

None beyond the plan's register. T-07-11 holds: `festLocked` gates only rendering — the card's `onClick` is a noop and the submit button is untouched, so a user who bypasses the form entirely still meets `assert_fest_eligible` (07-01). T-07-14 is closed by `!progression?.festEligible` failing closed on error. T-07-15 is closed by the effective-org/city derivation. T-07-13 is closed: the counter reads `collaboratorThreshold`. No dependency was installed, so T-07-SC is not applicable.

## Notes for later plans

- **07-05** owns the two remaining §5.3/§5.4 surfaces (`ApprovalQueue` `ErrorStrip`, the accepted-count header) and the `SponsorshipBanner`. It also owns the manual checkpoint that exercises this plan's four caption states.
- The `#fest-lock-reason` id is unique per page render because only one card can be locked. If a second lockable scale is ever added, that id must become per-scale or the `aria-describedby` will point at the wrong caption.

## Self-Check: PASSED

- `frontend/src/pages/ProposalNew.tsx` — FOUND
- commit `89f7be4` (feat, task 1) — FOUND
- commit `90b7aa1` (feat, task 2) — FOUND
