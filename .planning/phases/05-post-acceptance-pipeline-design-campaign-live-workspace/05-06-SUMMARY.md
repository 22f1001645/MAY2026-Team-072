---
phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
plan: 06
subsystem: frontend
tags: [DESIGN-01, schedule-editor, campaign-builder, ui]
status: complete
requires: ["05-01"]
provides:
  - ScheduleRow
  - PresetAccordion
  - api.schedulePresets
  - useSchedulePresets
affects:
  - frontend/src/pages/CampaignBuilder.tsx
  - frontend/src/lib/api.ts
tech-stack:
  added: []
  patterns:
    - "Blur-save with revert-on-reject, one field per PATCH"
    - "Single open-name state for accordion exclusivity (no effect)"
key-files:
  created:
    - frontend/src/components/PresetAccordion.tsx
    - frontend/src/components/__tests__/ScheduleRow.test.tsx
    - frontend/src/components/__tests__/PresetAccordion.test.tsx
  modified:
    - frontend/src/components/ScheduleRow.tsx
    - frontend/src/pages/CampaignBuilder.tsx
    - frontend/src/lib/api.ts
    - frontend/src/lib/queries.ts
decisions:
  - "A schedule PATCH now writes only the keys the caller supplied, so a reorder posts position alone and cannot be clobbered by a blur-save in flight (T-05-30)."
  - "The Saving caption unmounts after its fade rather than sitting at opacity-0, so a saved row carries no invisible label."
  - "isFirst / isLast / disabled remove controls rather than disable them — a permanently disabled arrow on row one is a control that never applies."
  - "ScheduleRow's disabled prop is sourced from the manage capability, not campaign.status: no campaign query exists on the client yet and the server's 409 campaign_live is the real control (T-05-31)."
metrics:
  duration: 35min
  completed: 2026-08-16
actuals:
  tokens: 21000
  tasks: 2
  commits: 2
---

# Phase 5 Plan 06: Schedule Editor Components Summary

Blur-saving agenda rows with arrow reorder and revert-on-failure, plus an inline
preset accordion that populates a whole agenda from the server's static catalogue.

## Prior state

This plan was partially started in an earlier session and committed without a summary
(`76ca505`). `ScheduleRow.tsx` and the `Textarea` primitive already existed; the row's
spec, the CampaignBuilder wiring, and all of Task 2 did not. This execution verified the
existing row against the plan, fixed three points of drift, and completed the rest.

## Tasks

| Task | Name | Commit |
|------|------|--------|
| 1 | ScheduleRow — blur-save, saving indicator, revert-on-error, arrow reorder | `2b30eed` |
| 2 | PresetAccordion — scale-appropriate quick-start agendas | `1e74493` |

## What was built

**Task 1.** `ScheduleRow` saves a single field on blur, holds an inline `Saving…` caption
for 800 ms then fades and unmounts it, and on rejection restores the field to its
last-saved value while raising a `Failed to save` toast. An emptied title is never saved.
`isFirst` / `isLast` hide the corresponding arrow; `disabled` hides both arrows and the
delete control and marks the inputs read-only. `CampaignBuilder` now renders the schedule
as rows, with reorder handlers that post `position` alone.

**Task 2.** `PresetAccordion` renders nothing for an empty catalogue, keeps exactly one
preset expanded via a single open-name state, clamps and scrolls the sample list inside
the card, and truncates names and items with the full text in a native `title` tooltip.
Applying a preset posts each item in sequence through `useCreateScheduleItem`, so the
resulting order is the server's.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `updateScheduleItem` padded every PATCH body with nulls**
- **Found during:** Task 1
- **Issue:** The wrapper sent all six columns on every call (`patch.title ?? null`, etc.).
  It happened to still hit the server's position-only branch because the backend treats
  `None` as absent, but the plan's key link and acceptance criterion both require the
  reorder body to carry `position` and nothing else — and any future backend that
  distinguishes "null" from "absent" would have turned every move into a full-row replace.
- **Fix:** The wrapper now maps only the keys actually supplied, through a
  `SCHEDULE_WIRE_KEYS` table kept in `api.ts` with the rest of the wire vocabulary.
- **Files modified:** `frontend/src/lib/api.ts`
- **Commit:** `2b30eed`

**2. [Rule 1 - Bug] The `Saving…` caption never left the DOM**
- **Found during:** Task 1
- **Issue:** The caption was always rendered and only toggled between `opacity-100` and
  `opacity-0`, so a saved row permanently carried an invisible "Saving…" label — a screen
  reader would read it and the plan's "after it resolves the text is gone" was false.
- **Fix:** A three-value `savePhase` state renders the caption while active, fades it, then
  unmounts it. The pending timers are cleared on unmount.
- **Files modified:** `frontend/src/components/ScheduleRow.tsx`
- **Commit:** `2b30eed`

**3. [Rule 1 - Bug] Reorder arrows were disabled rather than hidden**
- **Found during:** Task 1
- **Issue:** `isFirst` / `isLast` set the `disabled` attribute, contradicting the plan's
  behaviour list and acceptance criteria ("renders no `Move up` control").
- **Fix:** Both arrows are now conditionally rendered.
- **Files modified:** `frontend/src/components/ScheduleRow.tsx`
- **Commit:** `2b30eed`

### Plan Adjustments

**`disabled` source.** The plan says to pass `disabled` from "the campaign payload's
`status` being `live` (read via the campaign query plan 05-02 exposes)". Plan 05-02 landed
backend-only — there is no campaign query, hook, or type on the client. `disabled` is
sourced from `capabilities.manageableActivityIds` instead, which is the strictest signal
available today; the server's 409 `campaign_live` remains the actual enforcement (T-05-31,
disposition *accept*). Switching the source is a one-line change once the campaign query
lands.

**`Textarea`.** Already present in `ui.tsx` from Phase 4 plan 04-07. Per the plan's own
instruction ("If `Textarea` is already present, change nothing in `ui.tsx`"), `ui.tsx` was
not touched.

**PresetAccordion gating.** The accordion is rendered only when the viewer can manage the
activity. Offering "Use this preset" to someone whose POST would 403 would be a lie.

## Verification

| Gate | Result |
|------|--------|
| `npx vitest run src/components/__tests__/ScheduleRow.test.tsx` | 9 passed |
| `npx vitest run src/components/__tests__/PresetAccordion.test.tsx` | 6 passed |
| `npm run build` (tsc -b && vite build) | exit 0 |
| `npm test` | 14 files, 107 tests passed (POR-literal gate green) |
| `grep text-danger\|field-sizing` in both components | no matches |
| `grep refetchInterval` in `queries.ts` | no matches |

Manual verification (organiser at `/events/:id/campaign`: apply a preset, edit a row,
move a row, reload) is deferred to the phase UAT along with Phase 4's.

## Known Stubs

None.

## Threat Flags

None. Both components render values as React children only; no `dangerouslySetInnerHTML`
or `innerHTML` was introduced, no POR literal appears in either file, and no dependency
was added.

## Self-Check: PASSED

- `frontend/src/components/ScheduleRow.tsx` — FOUND
- `frontend/src/components/PresetAccordion.tsx` — FOUND
- `frontend/src/components/__tests__/ScheduleRow.test.tsx` — FOUND
- `frontend/src/components/__tests__/PresetAccordion.test.tsx` — FOUND
- Commit `2b30eed` — FOUND
- Commit `1e74493` — FOUND
