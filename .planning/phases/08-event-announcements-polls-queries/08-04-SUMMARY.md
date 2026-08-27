---
phase: 08-event-announcements-polls-queries
plan: 04
subsystem: frontend
tags: [react, typescript, tanstack-query, polls, event-channel, ui]

requires:
  - phase: 08-event-announcements-polls-queries
    plan: 01
    provides: POST/GET /events/<id>/polls, POST .../polls/<pid>/vote, PATCH .../polls/<pid>/close
  - phase: 08-event-announcements-polls-queries
    plan: 03
    provides: EventPoll type, api.polls/createPoll/castVote/closePoll, usePolls/useCreatePoll/useCastVote/useClosePoll
  - phase: 08-event-announcements-polls-queries
    plan: 05
    provides: QuerySection.tsx — NOT SATISFIED at execution time, see Deviations
provides:
  - PollCard — ballot / results card for one EventPoll (frontend/src/components/PollCard.tsx)
  - EventChannelSection — collapsible poll list + organiser create-poll form (frontend/src/components/EventChannelSection.tsx)
  - EventChannelSection mounted under the Event chat button on EventDetail
affects: [08-05 QuerySection mount point, 08-06 verification]

actuals:
  tokens: 3000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "The ballot/results switch reads `my_vote` from the server rather than local state, so an invalidated refetch flips the card and two tabs cannot disagree"
    - "Client-side poll validation restates PollCreateSchema's bounds (question 5-300, 2-6 non-blank options) to avoid a round trip that can only 422"
    - "Existing primitives only — components/ui.tsx, not the components/ui/*.tsx directory the plan named"

key-files:
  created:
    - frontend/src/components/PollCard.tsx
    - frontend/src/components/EventChannelSection.tsx
  modified:
    - frontend/src/pages/EventDetail.tsx

key-decisions:
  - "Q&A was left as a marked, non-rendering seam rather than faked: QuerySection.tsx does not exist because 08-05 has not run, and a 'coming soon' placeholder would have been a stub attendees can see"
  - "PollCard reads `poll.vote_counts ?? []` — 08-03 flagged that create/close responses omit that field, and this is the one line that stops the predicted `undefined.reduce`"
  - "The EventDetail mount restates only the registrant-or-team term; the enclosing block already asserts session, non-past and non-cancelled, and duplicating those three would be a second place for them to drift"
  - "No requirement marked complete — consistent with 08-01/08-02/08-03; CHAT-01 has no runtime proof yet and 08-06 owns that"

patterns-established:
  - "A blocked cross-plan import is answered with a named, greppable seam (TODO(<plan-id>) plus the exact two lines) and a WINDOWS ledger entry, not with a placeholder component or a duplicate of the missing file"

requirements-completed: []

coverage:
  - id: D1
    description: "PollCard shows the ballot for an open, unvoted poll and the vote distribution once voted or closed, with the caller's own choice highlighted"
    requirement: CHAT-01
    verification:
      - kind: static
        ref: "npm run build (tsc -b && vite build) passes; the branch is `showResults = poll.my_vote !== null || closed`, with counts/percentages and a check mark on `poll.my_vote === i`"
        status: pass
    human_judgment: true
  - id: D2
    description: "Organisers see a Create Poll form inside EventChannelSection accepting 2 to 6 options"
    requirement: CHAT-01
    verification:
      - kind: static
        ref: "OPTIONS_MIN/OPTIONS_MAX = 2/6 read off PollCreateSchema; the remove button is suppressed at 2 and the add button at 6; the form is behind `canManage`"
        status: pass
    human_judgment: true
  - id: D3
    description: "EventChannelSection renders as a collapsible section directly below the Event chat button on EventDetail"
    requirement: CHAT-01
    verification:
      - kind: static
        ref: "EventDetail.tsx — the block sits inside the same `currentUser && !isPast && status !== 'cancelled'` wrapper, immediately after the chat button, gated on `(registered && !isWaitlisted) || canManage`"
        status: pass
    human_judgment: true
  - id: D4
    description: "Closing a poll disables voting and shows a Closed badge"
    requirement: CHAT-01
    verification:
      - kind: static
        ref: "`closed` forces `showResults`, so the ballot buttons are not rendered at all rather than merely disabled; the badge switches to tone=neutral 'Closed'"
        status: pass
    human_judgment: true
  - id: D5
    description: "The addition does not regress the existing frontend suite"
    requirement: CHAT-01
    verification:
      - kind: unit
        ref: "npm test — 183/183 across 27 files, including the 05-09 no-kanban-polling gate"
        status: pass
    human_judgment: false

duration: 20min
completed: 2026-08-23
status: complete
---

# Phase 8 Plan 04: Poll UI Summary

**Polls are now a surface: a card that shows a ballot until you vote and a distribution afterwards, a collapsible channel section that lists them and lets the organising team publish one, and both mounted under the Event chat button for registered attendees and the team.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-08-23
- **Completed:** 2026-08-23
- **Tasks:** 3
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments

- `PollCard.tsx` renders one `EventPoll` in whichever of its two faces applies, driven entirely by server state (`my_vote`, `status`) rather than a local "I voted" flag, so the 15s channel refetch keeps two open tabs in agreement.
- `EventChannelSection.tsx` lists every poll, badges the open count in its header, and gives the organising team an inline create form whose bounds are lifted from `PollCreateSchema` rather than guessed.
- `EventDetail.tsx` mounts the section under the existing Event chat button, for the same audience and under the same lifecycle guards.
- Verified with the project's real gate per CLAUDE.md: `npm run build` (which *is* the type-check here) clean, `npm test` green at 183/183.

## Task Commits

1. **Task 1: PollCard.tsx** - `0f3633d` (feat)
2. **Task 2: EventChannelSection.tsx** - `de90d92` (feat)
3. **Task 3: Mount in EventDetail.tsx** - `bc04e5d` (feat)

## Files Created/Modified

- `frontend/src/components/PollCard.tsx` - ballot buttons, result bars with counts and percentages, own-vote check mark, organiser "Close poll" action, errors surfaced through `useToast`.
- `frontend/src/components/EventChannelSection.tsx` - collapsible `Card` with an open-poll count badge, the poll list, the organiser create form, and a marked seam where Q&A mounts.
- `frontend/src/pages/EventDetail.tsx` - one import and a ten-line block directly under the Event chat button.

## Decisions Made

- **Q&A is a seam, not a stub.** `QuerySection.tsx` does not exist (see Deviations), so nothing is rendered in its slot at all. The alternative — a "Q&A coming soon" panel — would have shipped a visible placeholder to attendees for the sake of matching the plan's prose. Nothing renders, and the exact two lines that will render it sit in a `TODO(08-05)` comment at the slot.
- **`poll.vote_counts ?? []`.** 08-03 typed `createPoll`/`closePoll` as `Omit<EventPoll, 'vote_counts' | 'my_vote'>` and predicted, in writing, that a card rendered off one of those returns would throw inside a results bar. One nullish coalesce closes that off; the mutations already invalidate `['polls', id]`, so the real shape arrives on the next fetch either way.
- **A closed poll hides the ballot rather than disabling it.** `closed` forces the results branch, so there are no dead buttons to tab through — the accessible version costs the same as the greyed-out one.
- **The EventDetail guard restates one term, not four.** The plan's snippet repeats `currentUser`, `!isPast` and `status !== 'cancelled'`, all of which the enclosing block already asserts. Repeating them creates a second copy of the lifecycle rule that can drift from the chat button's; only `(registered && !isWaitlisted) || canManage` is genuinely new here.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `QuerySection.tsx` does not exist — the dependency this plan was re-waved for was not met**

- **Found during:** Task 2
- **Issue:** The plan's own objective states it was moved from Wave 3 to Wave 4 specifically "so this plan's worktree has that file to import". At execution time `frontend/src/components/QuerySection.tsx` is absent and 08-05 is still in `incomplete_plans` — the orchestrator dispatched 08-04 ahead of the plan it depends on. `import QuerySection from './QuerySection'` would not have compiled, failing every task's stated verification.
- **Fix:** Built the Polls half of `EventChannelSection` in full and left the Q&A slot as a non-rendering, greppable seam carrying the exact two lines 08-05 needs to add. Did **not** create `QuerySection.tsx` here: 08-05 devotes three tasks to it and to `OrgQueriesPanel`, and pre-empting the file would guarantee a conflict rather than avoid one.
- **Files modified:** `frontend/src/components/EventChannelSection.tsx`
- **Verification:** `npm run build` clean; the seam is a comment, so nothing renders in that slot.
- **Committed in:** `de90d92` (Task 2 commit)
- **Follow-up required:** recorded in `.planning/WINDOWS.md` (kind `stub`, phase 08) so it survives past this summary.

**2. [Rule 3 - Blocking] The `components/ui/` directory the plan reads from does not exist**

- **Found during:** Task 1
- **Issue:** Every task's `read_first` names `frontend/src/components/ui/Badge.tsx`, `ui/Button.tsx`, `ui/Progress.tsx`, `ui/Card.tsx`. This codebase has a single `frontend/src/components/ui.tsx` (640 lines) exporting all of them; there is no `ui/` directory. Imports written against the plan's paths would not resolve.
- **Fix:** Imported from `'./ui'` throughout, matching `EventChat.tsx` and every other component in the folder.
- **Files modified:** `frontend/src/components/PollCard.tsx`, `frontend/src/components/EventChannelSection.tsx`
- **Verification:** `npm run build` passes; `Badge`, `Button`, `Card`, `Progress`, `Input` and `useToast` are all confirmed exports of `ui.tsx`.
- **Committed in:** `0f3633d`, `de90d92`

**3. [Rule 1 - Correctness] `Badge` has no `tone="default"`**

- **Found during:** Task 1
- **Issue:** The plan specifies `<Badge tone="default">Closed</Badge>`. `Badge`'s tone union is `'teal' | 'gold' | 'neutral' | 'success' | 'warn' | 'danger'` — `"default"` is a type error.
- **Fix:** `tone="neutral"`, which is the union member that carries the intended grey treatment.
- **Files modified:** `frontend/src/components/PollCard.tsx`
- **Verification:** `npm run build` passes.
- **Committed in:** `0f3633d`

**4. [Rule 2 - Missing critical functionality] Mutation failures were silent**

- **Found during:** Task 1
- **Issue:** The plan describes `castVoteMut.mutate(...)` with no error path. A duplicate vote, a poll closed in another tab between the refetch and the click, or an expired POR all answer 4xx, and the user would have seen the card simply not change.
- **Fix:** `onError: (err) => addToast((err as Error).message, 'error')` on all three mutations, using the existing `useToast` and the `ApiError` message `lib/api.ts` already parses out of the backend's `{ error, code }` envelope.
- **Files modified:** `frontend/src/components/PollCard.tsx`, `frontend/src/components/EventChannelSection.tsx`
- **Verification:** `npm run build` passes; `useToast` is the same primitive `EventDetail` already uses.
- **Committed in:** `0f3633d`, `de90d92`

---

**Total deviations:** 4 auto-fixed (2 blocking, 1 correctness, 1 missing functionality). Deviation 1 is a real ordering fault in the phase, not a plan-text error, and is the only one with work left behind it.
**Impact on plan:** Same three files, same three components, same mount point. The only scope reduction is the Q&A slot, which had no code to mount.

## Issues Encountered

- **`npm run build`, not `npx tsc --noEmit`.** All three tasks specify the latter; per CLAUDE.md this project's type-check *is* `npm run build` (`tsc -b && vite build`), and `tsc --noEmit` is not usable against composite project references here. Used the real gate, as 08-03 did.
- **The plan was executed out of its declared wave.** `08-04-PLAN.md` says `wave: 4, depends_on: [08-02, 08-03, 08-05]`; `08-05-PLAN.md` says `wave: 3`, and 08-05 had not run. Everything in this plan that did not depend on 08-05 was completed; see Deviation 1.
- **No backend was started.** Every call goes through hooks 08-03 already checked against the controller and schema source. Runtime behaviour is 08-06's to prove.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| Q&A sub-section not mounted | `frontend/src/components/EventChannelSection.tsx` | ~158 | `QuerySection.tsx` (plan 08-05) does not exist yet. Nothing renders in the slot — this is an unbuilt slot, not fake output. Wiring is two lines, written verbatim in the `TODO(08-05)` comment at the slot. Recorded in `.planning/WINDOWS.md`. |

Nothing else. The poll surface is wired end-to-end onto real endpoints; no mock data, no placeholder copy.

## Threat Flags

None. No new network surface — three client calls onto routes 08-01 already built and gated. `canManage` here is render-only, exactly as `EventDetail` already uses it; every create/close request is still authorised by `can_manage_activity_required` server-side, so a user who forces the organiser view sees a button and gets a 403.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **08-05 must mount `QuerySection` itself.** Its `files_modified` list does not include `EventChannelSection.tsx`, so the two-line wiring will not happen unless 08-05 adds that file to its scope. Grep `TODO(08-05)` — the lines are written out in place.
- **No test was added for the ballot/results switch.** The plan pins this work to three files and 08-06 is the verification plan. If 08-06 wants CHAT-01 pinned structurally, the cheap version is a render test in the idiom of `src/components/__tests__/CloseOutPanels.test.tsx`: one `EventPoll` with `my_vote: null` (expect option buttons) and one with `my_vote: 0` (expect percentages), which is the only branch in `PollCard` worth a regression net.
- **The section lives in the narrow event sidebar.** It is the same column as the Event chat button, so a six-option poll is a tall, narrow card. Worth a human look during 08-06's UAT; nothing about it is wrong, but it is the one layout choice a static check cannot judge.
- **CHAT-01 is not marked complete.** Polls exist end-to-end for the first time with this plan, but nothing has exercised them against a running backend. 08-06 owns that call, matching 08-01/08-02/08-03.

## Self-Check: PASSED

- `frontend/src/components/PollCard.tsx` — FOUND
- `frontend/src/components/EventChannelSection.tsx` — FOUND
- `frontend/src/pages/EventDetail.tsx` — FOUND (import + mount block present)
- Commits `0f3633d`, `de90d92`, `bc04e5d` — all FOUND in git log
- `npm run build` clean; `npm test` 183/183; working tree clean apart from planning docs

---
*Phase: 08-event-announcements-polls-queries*
*Completed: 2026-08-23*
