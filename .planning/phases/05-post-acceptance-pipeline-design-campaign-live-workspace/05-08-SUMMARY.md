---
phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
plan: 08
subsystem: ui
tags: [react, typescript, vitest, testing-library, tanstack-query, rbac, accessibility]

requires:
  - phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
    provides: "05-02/05-03 campaign_state with its server-computed completeness object and is_meetup_head flag, and the meetup_head_required push-live route"
  - phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
    provides: "05-07 useCampaign query, api.campaign and the adaptCampaign snake_case adapter"
provides:
  - "PipelineStepper — a presentational five-step progress indicator driven entirely by props"
  - "PushLiveGate — the visible, role-explicit, confirmation-guarded publish control"
  - "api.pushLive and the usePushLive mutation, invalidating both the campaign and the task list"
  - "pushedLiveAt on ApiCampaignState, and a named CAMPAIGN_LIVE status constant on the frontend"
  - "CampaignBuilder now fails the whole page when the campaign query fails, rather than rendering a stepper from data that never arrived"
affects: [05-09 kanban workspace, 05-10, 05-11, phase 6 reimbursement gating]

actuals:
  tokens: 22900
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Coherent-prefix rendering: a step shows complete only when it and every step before it is complete, so a filled prefix always means the same thing"
    - "aria-disabled over the disabled attribute for permission-blocked controls, keeping them focusable and their tooltip reachable"
    - "Irreversible actions fire only from a confirmation dialog, never from the first click"

key-files:
  created:
    - frontend/src/components/PipelineStepper.tsx
    - frontend/src/components/PushLiveGate.tsx
    - frontend/src/components/__tests__/PipelineStepper.test.tsx
    - frontend/src/components/__tests__/PushLiveGate.test.tsx
  modified:
    - frontend/src/pages/CampaignBuilder.tsx
    - frontend/src/lib/api.ts
    - frontend/src/lib/queries.ts
    - frontend/src/lib/types.ts

key-decisions:
  - "The stepper's coherent prefix is enforced in the component, not in the caller: the server's completeness booleans are genuinely non-monotonic (an organiser can write the mail before adding a schedule item), so a component that rendered them literally would show a complete step after a pending one"
  - "api.pushLive deliberately does not run the response through adaptCampaign — the route answers with the campaign row alone, with no completeness and no is_meetup_head, so adapting it would have manufactured a payload that looks like a campaign state and is wrong in both of the fields this plan depends on"
  - "CAMPAIGN_LIVE is named once in lib/types.ts rather than spelled as a literal at each comparison, and the pre-existing literal in CampaignBuilder was folded into it"
  - "The confirmation dialog closes on failure so the Push Live button is reachable again, rather than leaving a modal open over a dead Confirm"

patterns-established:
  - "Presentational components are proved presentational by a source-level assertion (no useQuery, no useEffect), not only by their rendered output"
  - "Client-side permission refusals are asserted in the component spec and server-side refusals in the backend suite — two layers, two tests, so neither is mistaken for the other"

requirements-completed: [CAMPAIGN-06]

coverage:
  - id: D1
    description: "The campaign pipeline renders as five fixed steps whose completeness comes from the server, always as a coherent prefix"
    requirement: CAMPAIGN-06
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/PipelineStepper.test.tsx#never renders a complete step after a pending one, for any server combination"
        status: pass
      - kind: unit
        ref: "frontend/src/components/__tests__/PipelineStepper.test.tsx#renders complete before the active step and pending after it"
        status: pass
    human_judgment: false
  - id: D2
    description: "A failed campaign query surfaces as a whole-page error and renders no stepper"
    requirement: CAMPAIGN-06
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/PipelineStepper.test.tsx#surfaces the error for the whole page and renders no stepper"
        status: pass
    human_judgment: false
  - id: D3
    description: "The push-live button is visible but inert, tooltipped and still focusable for anyone who is not the Meetup Head"
    requirement: CAMPAIGN-06
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/PushLiveGate.test.tsx#shows a visible but inert button with a tooltip for anyone but the Meetup Head"
        status: pass
      - kind: unit
        ref: "frontend/src/components/__tests__/PushLiveGate.test.tsx#reads its permission from the server flag alone"
        status: pass
    human_judgment: false
  - id: D4
    description: "The Meetup Head must confirm in a dialog before the campaign is published, and a 403 leaves the control usable"
    requirement: CAMPAIGN-06
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/PushLiveGate.test.tsx#asks the Meetup Head to confirm before anything is published"
        status: pass
      - kind: unit
        ref: "frontend/src/components/__tests__/PushLiveGate.test.tsx#reports a 403 and leaves the button operable"
        status: pass
    human_judgment: false
  - id: D5
    description: "A published campaign replaces the gate with a success badge and the publication date"
    requirement: CAMPAIGN-06
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/PushLiveGate.test.tsx#replaces the gate with a success badge once the campaign is live"
        status: pass
    human_judgment: false
  - id: D6
    description: "End-to-end publish: a non-Meetup-Head crew member sees a focusable, tooltipped, inert button; the Meetup Head publishes through the dialog and the workspace activates"
    requirement: CAMPAIGN-06
    verification: []
    human_judgment: true
    rationale: "Native tooltip rendering, keyboard focus order and the real 403 round-trip cannot be observed in jsdom; the component and the route are each tested in isolation but their meeting needs a browser and two logged-in accounts"

duration: 40min
completed: 2026-08-16
status: complete
---

# Phase 5 Plan 08: Pipeline Stepper and Push-Live Gate Summary

**The campaign builder now shows an organiser exactly which of the five steps are done and puts publication behind a role-explicit, confirmed gate that reads its permission from the server rather than guessing at it.**

## Performance

- **Duration:** 40 min
- **Tasks:** 2 of 2
- **Files modified:** 8 (4 created, 4 modified)

## Accomplishments

- `PipelineStepper` renders the five fixed steps — Schedule, Mail Template, Poster, Registration, Push Live — from the server's `completeness` object, so "done" keeps exactly one definition and the browser never recomputes it.
- The rendered prefix is coherent by construction: a step shows complete only when it and every step before it is complete. This matters because the server's booleans are genuinely non-monotonic — an organiser can write the mail template before adding a single schedule item — and rendering those literally would have put a complete circle after a pending one, which destroys the only thing the shape communicates.
- `PushLiveGate` implements D-07's visible-but-blocked design: every crew member sees the button, a non-Meetup-Head gets `aria-disabled` plus a native tooltip explaining why, and the control stays in the tab order so a keyboard user can actually reach that explanation.
- Publication fires only from a confirmation dialog, and a 403 from the server raises the Meetup Head message and leaves the button usable rather than stranding the organiser.
- A failed campaign query now fails the whole Campaign Builder page instead of rendering a stepper from data that never arrived.

## Task Commits

1. **Task 1: PipelineStepper** — `3abdf60` (test, RED) → `07ec90c` (feat, GREEN)
2. **Task 2: PushLiveGate** — `fd20d6d` (test, RED) → `aa273c7` (feat, GREEN)

## Files Created/Modified

- `frontend/src/components/PipelineStepper.tsx` — the five-step indicator; no query, no state, no effect
- `frontend/src/components/PushLiveGate.tsx` — the publish gate, its tooltip, its dialog and its 403 handling
- `frontend/src/components/__tests__/PipelineStepper.test.tsx` — the five component behaviours plus the parent's error backstop
- `frontend/src/components/__tests__/PushLiveGate.test.tsx` — the six gate behaviours plus the source-level permission check
- `frontend/src/pages/CampaignBuilder.tsx` — builds the five steps from `campaign.completeness`, guards on the campaign query, renders the Publish section
- `frontend/src/lib/api.ts` — `api.pushLive`, and `pushed_live_at` adaptation
- `frontend/src/lib/queries.ts` — `usePushLive`, invalidating `['campaign', id]` and `['tasks', id]`
- `frontend/src/lib/types.ts` — `pushedLiveAt` on `ApiCampaignState` and the exported `CAMPAIGN_LIVE` status

## Decisions Made

- **The coherent-prefix rule lives in the component.** The plan's behaviour 5 asks that a complete step never render after a pending one "for any prop combination the parent can produce", and the parent can genuinely produce an incoherent set, because the server reports each step's completeness independently. Putting the rule in the caller would have meant every future caller re-deriving it; putting it in the component makes the guarantee structural.
- **`api.pushLive` returns the raw response.** The push-live route answers with `campaign.to_dict()`, which carries neither `completeness` nor `is_meetup_head`. Running it through `adaptCampaign` would have produced an object shaped like a campaign state whose completeness was all-false and whose `isMeetupHead` was false — wrong in exactly the two fields this plan renders from. The mutation invalidates instead, and the refetch is the source of truth.
- **`CAMPAIGN_LIVE` is named once.** The page already compared `campaign?.status === 'live'` inline; that literal was folded into the new constant rather than left beside it.
- **The dialog closes on failure.** The plan asks that the button "become operable again" after a 403. Leaving the modal open over a disabled Confirm satisfies the letter and not the intent, so the dialog closes and the gate button is reachable.

## Deviations from Plan

**1. [Rule 2 — missing critical functionality] `pushedLiveAt` was absent from the campaign type**

- **Found during:** Task 2
- **Issue:** `PushLiveGate` needs the publication date for its already-live state, and the plan specifies it as a prop, but `ApiCampaignState` and `adaptCampaign` (landed in 05-07) carried no `pushedLiveAt` — the server returns `pushed_live_at` and the adapter dropped it.
- **Fix:** Added `pushedLiveAt: string | null` to `ApiCampaignState` and the matching line to `adaptCampaign`.
- **Files modified:** `frontend/src/lib/types.ts`, `frontend/src/lib/api.ts`
- **Verification:** `npm run build` (type check) and the already-live behaviour test.
- **Committed in:** `07ec90c`

**2. [Rule 3 — blocking] The parent-level error backstop had no home in the plan's file list**

- **Found during:** Task 1
- **Issue:** The acceptance criterion "when the campaign query errors, the page renders `ErrorState` and the stepper is absent" is a page-level assertion, but the plan's file list contains no CampaignBuilder spec, and the phase has no page-test precedent to extend.
- **Fix:** The assertion lives at the bottom of `PipelineStepper.test.tsx` — its subject is the stepper's absence — with `lib/queries` mocked at module level. No new file was added.
- **Files modified:** `frontend/src/components/__tests__/PipelineStepper.test.tsx`
- **Verification:** The test fails if the page's `campaignError` guard is removed.
- **Committed in:** `3abdf60` / `07ec90c`

---

**Total deviations:** 2 auto-fixed (1 × Rule 2, 1 × Rule 3)
**Impact on plan:** Both were required to satisfy the plan's own acceptance criteria. No scope creep.

## Issues Encountered

The first draft of `PushLiveGate` explained in its header comment why the gate does not read `manageableActivityIds` — which tripped the spec's own source-level assertion that the file never mentions that identifier. The explanation was reworded to name the capability rather than the symbol. The check is worth keeping in that strict form: a component that mentions the symbol at all is one edit away from using it.

## Verification

- `cd frontend && npx vitest run src/components/__tests__/PipelineStepper.test.tsx` — 6 passed
- `cd frontend && npx vitest run src/components/__tests__/PushLiveGate.test.tsx` — 7 passed
- `cd frontend && npm run build` — exit 0
- `cd frontend && npm test` — 19 files, 141 tests passed

## Known Stubs

None. Both components are fully wired to server data; no placeholder values, no mock arrays, no "coming soon" copy.

## Manual verification still owed

Sign in as a non-Meetup-Head crew member and confirm the push-live button is visible, tab-reachable, tooltipped and inert; then as the Meetup Head, publish through the dialog and confirm the workspace activates. Carried into the phase's manual UAT.

## Self-Check: PASSED

- `frontend/src/components/PipelineStepper.tsx` — FOUND
- `frontend/src/components/PushLiveGate.tsx` — FOUND
- `frontend/src/components/__tests__/PipelineStepper.test.tsx` — FOUND
- `frontend/src/components/__tests__/PushLiveGate.test.tsx` — FOUND
- Commits `3abdf60`, `07ec90c`, `fd20d6d`, `aa273c7` — all FOUND in `git log`
