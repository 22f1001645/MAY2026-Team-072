---
phase: 08-event-announcements-polls-queries
plan: 05
subsystem: frontend
tags: [react, typescript, tanstack-query, queries, qa, event-channel, ui]

requires:
  - phase: 08-event-announcements-polls-queries
    plan: 02
    provides: POST/GET /events/<id>/queries, GET .../queries/mine, POST .../queries/<qid>/respond
  - phase: 08-event-announcements-polls-queries
    plan: 03
    provides: EventQuery type, api.myQueries/orgQueries/submitQuery/respondQuery, useMyQueries/useOrgQueries/useSubmitQuery/useRespondQuery
provides:
  - QuerySection — registrant compose box plus their own question thread (frontend/src/components/QuerySection.tsx)
  - OrgQueriesPanel — team work queue with inline replies (frontend/src/components/OrgQueriesPanel.tsx)
  - Attendee Q&A tab on ManageEvent
  - QuerySection mounted in EventChannelSection, closing 08-04's deferred seam
affects: [08-06 verification]

actuals:
  tokens: 2300
  tasks: 4
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A per-query draft map (Record<queryId, string>) rather than one shared draft string, so an organiser's half-typed answer belongs to exactly one question"
    - "Client-side bounds restate QuerySubmitSchema (5-1000) so an obviously invalid question never costs a 422 round trip"
    - "Raw ids are shown as ids (`Attendee 3f2a91c4`) because EventQuery carries no author name — flagged by 08-02 and 08-03 and deliberately not faked"

key-files:
  created:
    - frontend/src/components/QuerySection.tsx
    - frontend/src/components/OrgQueriesPanel.tsx
  modified:
    - frontend/src/pages/ManageEvent.tsx
    - frontend/src/components/EventChannelSection.tsx

key-decisions:
  - "QuerySection reads useMyQueries, never useOrgQueries — the support-ticket model in CHAT-02 means an attendee's question about food or accessibility is visible to the team and to nobody else"
  - "OrgQueriesPanel became a fifth ManageEvent tab rather than an always-mounted section: the page already has a tab strip, and a sixth stacked card below the roster would have been the odd one out"
  - "Task 4 was added beyond the plan file to mount QuerySection at 08-04's TODO(08-05) seam — the plan's files_modified omitted EventChannelSection.tsx, so nothing else in the phase would have wired it"
  - "No requirement marked complete, consistent with 08-01 through 08-04 — CHAT-02 has no runtime proof yet and 08-06 owns that call"

patterns-established:
  - "A seam left by an out-of-order plan is closed by the plan that owns the missing file, in its own commit, with the ledger entry marked fixed in the same pass — not left for a verification plan to discover"

requirements-completed: []

coverage:
  - id: D1
    description: "A registrant can write a question and send it to the organising team from the event channel"
    requirement: CHAT-02
    verification:
      - kind: static
        ref: "QuerySection submits through useSubmitQuery onto POST /events/<id>/queries; the button is disabled until the trimmed body clears QuerySubmitSchema's 5-character floor; npm run build passes"
        status: pass
    human_judgment: true
  - id: D2
    description: "A registrant sees their own questions with an Open/Answered badge and the team's response"
    requirement: CHAT-02
    verification:
      - kind: static
        ref: "useMyQueries drives the list; the badge is tone=teal 'Answered' / tone=warn 'Open' off q.status, and the response card renders only when response_body is present"
        status: pass
    human_judgment: true
  - id: D3
    description: "Organisers see every question on the event with a count of the unanswered ones"
    requirement: CHAT-02
    verification:
      - kind: static
        ref: "OrgQueriesPanel reads useOrgQueries; unansweredCount = queries.filter(q => q.status === 'open').length feeds a header Badge; open questions sort above answered ones"
        status: pass
    human_judgment: true
  - id: D4
    description: "Organisers can type and send a reply to an open question in place"
    requirement: CHAT-02
    verification:
      - kind: static
        ref: "Each open query carries its own Textarea keyed into the drafts map; Send Reply calls useRespondQuery, which invalidates ['queries','org',id]"
        status: pass
    human_judgment: true
  - id: D5
    description: "The Q&A section is mounted in the event channel — no TODO seam remains"
    requirement: CHAT-02
    verification:
      - kind: static
        ref: "grep 'TODO(08-05)' over frontend/src returns nothing; EventChannelSection imports and renders <QuerySection activityId={activityId} />"
        status: pass
    human_judgment: false
  - id: D6
    description: "The addition does not regress the existing frontend suite"
    requirement: CHAT-02
    verification:
      - kind: unit
        ref: "npm test — 183/183 across 27 files; npm run build (tsc -b && vite build) clean"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-23
status: complete
---

# Phase 8 Plan 05: Event Q&A UI Summary

**Q&A is now a two-sided surface: attendees ask the organising team a question from the event channel and watch their own thread turn from Open to Answered, and the team works through those questions as a queue on a new ManageEvent tab, replying in place.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-23
- **Completed:** 2026-08-23
- **Tasks:** 4 (3 planned + 1 added, see Deviations)
- **Files modified:** 4 (2 created, 2 modified)

## Accomplishments

- `QuerySection.tsx` gives a registrant a compose box bounded by the server's own rule and a thread of their questions with the team's answers attached. It reads `/queries/mine`, so the support-ticket model CHAT-02 specifies holds at the data layer, not just in the copy.
- `OrgQueriesPanel.tsx` is a work queue: unanswered questions sort to the top, the header badges how many are left, and each open one carries its own reply box.
- `ManageEvent.tsx` gained an "Attendee Q&A" tab alongside roster, referrers, tasks and push alerts.
- `EventChannelSection.tsx`'s empty Q&A slot — left by 08-04 when it ran ahead of this plan — is filled, and Broken Windows entry 6 is closed.
- Verified with the project's real gate per CLAUDE.md: `npm run build` (which *is* the type-check here) clean on every task, `npm test` green at 183/183.

## Task Commits

1. **Task 1: QuerySection.tsx** - `21d8c95` (feat)
2. **Task 2: OrgQueriesPanel.tsx** - `326f7eb` (feat)
3. **Task 3: Attendee Q&A tab in ManageEvent.tsx** - `c2756cd` (feat)
4. **Task 4 (added): mount QuerySection in EventChannelSection.tsx** - `09fc8c4` (feat)

## Files Created/Modified

- `frontend/src/components/QuerySection.tsx` - compose form with a live character count, the caller's question list, status badges, and a team-response card carrying the answer and its timestamp.
- `frontend/src/components/OrgQueriesPanel.tsx` - Card with an unanswered-count badge, open-first sort, per-query reply drafts, and the recorded answer for questions already handled.
- `frontend/src/pages/ManageEvent.tsx` - one import, a fifth tab in the union and the strip, and a final branch rendering the panel.
- `frontend/src/components/EventChannelSection.tsx` - the `TODO(08-05)` comment replaced by the import and the two-line mount it described.

## Decisions Made

- **The registrant view is `useMyQueries`, full stop.** CHAT-02 is explicit that this is the Swiggy-support-ticket model and not a feed. Wiring `useOrgQueries` into `QuerySection` would have compiled and looked richer, and would have published every attendee's dietary and accessibility questions to every other attendee. The hook choice *is* the privacy boundary on this screen; the server enforces the same split behind it.
- **One reply draft per query id, not one shared string.** `OrgQueriesPanel` keeps `Record<queryId, string>`. A single `useState('')` would have shown the same half-typed answer under every open question and sent it to whichever one was clicked first — the sort of bug that only appears with two open questions on screen, which is the normal case for a busy event.
- **A tab, not another stacked card.** `ManageEvent` already carries a tab strip and, below the fold, the Phase 6 close-out panels. The Q&A queue is something the team sits in rather than glances at, which is what the tabs are for; a card appended under the roster would have been a sixth thing competing for the same vertical space.
- **Ids are displayed as ids.** `EventQuery` has `user_id` and `responded_by` and no names — 08-02 and 08-03 both recorded that widening `to_dict()` server-side is the only honest fix. The panel renders `Attendee 3f2a91c4`, which is visibly an identifier. Inventing "Attendee 1" or guessing from the roster would have put a name next to a question the server never attributed.
- **CHAT-02 is not marked complete.** The requirement also covers registration cancellation and rate-limited submission (CHAT-03), and nothing in this plan has been exercised against a running backend. 08-01 through 08-04 each made the same call and 08-06 owns it. A `requirements.mark-complete CHAT-02` run was reverted for that reason (see Issues).

## Deviations from Plan

### Added Scope

**1. Task 4 — mount `QuerySection` in `EventChannelSection.tsx` (added, not in the plan file)**

- **Found during:** planning the run; assigned explicitly in the execution brief.
- **Issue:** 08-04 executed before this plan because `gsd-tools`' phase-plan-index reported it as wave 1 with no dependencies, despite its own frontmatter declaring `depends_on: [08-02, 08-03, 08-05]`. It could not import a file this plan had not created yet, so it left a non-rendering `TODO(08-05)` seam carrying the exact two lines needed, plus Broken Windows entry 6. This plan's `files_modified` does not list `EventChannelSection.tsx`, so on the plan text alone the seam would have survived the phase and the attendee half of Q&A would have existed without ever being reachable.
- **Fix:** Added a fourth task: import `QuerySection` and render it inside `<div className="border-t border-white/5 pt-3">` at the seam, replacing the TODO comment with a note on why no extra gate is needed there (the enclosing section already gates on registrant-or-team, and `useMyQueries` scopes the data to the caller). Committed separately as `09fc8c4`.
- **Files modified:** `frontend/src/components/EventChannelSection.tsx`
- **Verification:** `npm run build` clean; `npm test` 183/183; `grep -rn "TODO(08-05)" frontend/src` returns nothing.
- **Follow-up:** Broken Windows entry 6 marked fixed (`gsd-tools windows fixed 6`); `open_count` fell from 6 to 5, ids 1-5 untouched.

### Auto-fixed Issues

**2. [Rule 3 - Blocking] The `components/ui/` directory the plan reads from does not exist**

- **Found during:** Task 1
- **Issue:** Both component tasks name `frontend/src/components/ui/Button.tsx`, `ui/Badge.tsx`, `ui/Card.tsx` in `read_first`. There is no `ui/` directory — this codebase has a single `frontend/src/components/ui.tsx` exporting all of them. 08-04 hit and recorded the same thing.
- **Fix:** Imported from `'./ui'`, matching `PollCard.tsx` and every other component in the folder.
- **Files modified:** `frontend/src/components/QuerySection.tsx`, `frontend/src/components/OrgQueriesPanel.tsx`
- **Verification:** `npm run build` passes; `Badge`, `Button`, `Card`, `Textarea` and `useToast` are all confirmed exports of `ui.tsx`.
- **Committed in:** `21d8c95`, `326f7eb`

**3. [Rule 2 - Missing critical functionality] Neither mutation had an error path**

- **Found during:** Task 1
- **Issue:** The plan describes a success toast and a cleared input, and nothing else. A question submitted after the event closed, a reply sent by someone whose POR expired between the page load and the click, or a duplicate submission all answer 4xx — and the user would have seen the box simply not clear, with no reason given.
- **Fix:** `onError: (err) => addToast((err as Error).message, 'error')` on both mutations, surfacing the message `lib/api.ts` already parses out of the backend's `{ error, code }` envelope. Same treatment 08-04 applied to the poll mutations.
- **Files modified:** `frontend/src/components/QuerySection.tsx`, `frontend/src/components/OrgQueriesPanel.tsx`
- **Verification:** `npm run build` passes.
- **Committed in:** `21d8c95`, `326f7eb`

**4. [Rule 1 - Correctness] The plan's `<Badge tone="warn">Open</Badge>` was right; `q.at` was the field at risk**

- **Found during:** Task 1
- **Issue:** The plan describes rendering a "timestamp" without naming the field. `EventQuery` names the creation time `at` (mirroring `Notification.at`), not `created_at` — a reasonable guess would have compiled to `undefined` and rendered `Invalid Date`.
- **Fix:** Read the interface (`lib/types.ts:411-422`) before writing the render; used `q.at` for creation and `q.responded_at` for the answer.
- **Files modified:** `frontend/src/components/QuerySection.tsx`, `frontend/src/components/OrgQueriesPanel.tsx`
- **Verification:** `npm run build` passes; both fields are declared on `EventQuery`.
- **Committed in:** `21d8c95`, `326f7eb`

---

**Total deviations:** 1 added task (assigned in the execution brief, closing a real phase-ordering gap) plus 3 auto-fixed (1 blocking, 1 missing functionality, 1 correctness).
**Impact on plan:** All three planned tasks landed as written, on the same files. The fourth is additive and is the only reason the attendee half of Q&A is reachable in this phase.

## Issues Encountered

- **`npm run build`, not `npx tsc --noEmit`.** All three tasks specify the latter; per CLAUDE.md the type-check in this project *is* `npm run build` (`tsc -b && vite build`), and there is no `--noEmit` script. Used the real gate, as 08-03 and 08-04 did.
- **`requirements.mark-complete CHAT-02` was run and reverted.** It ticked the checkbox but reported `table_unmatched` — the traceability table carries one grouped row (`CHAT-01, CHAT-02, CHAT-03, CHAT-04 | Phase 8 | Pending`) that cannot be updated per requirement. The checkbox change was reverted with a scoped `git checkout -- .planning/REQUIREMENTS.md` rather than left half-applied, matching the call every earlier plan in this phase made: 08-06 marks the CHAT requirements once they have runtime proof. Worth knowing that a per-requirement mark cannot succeed against a grouped traceability row.
- **`useSubmitQuery` invalidates only `['queries','mine',id]` and `useRespondQuery` only `['queries','org',id]`.** That is correct for each caller, but it means an organiser's reply reaches the attendee's open tab on the next ~15s channel refetch rather than instantly. Acceptable and by design (08-03's polling interval exists for exactly this); noted because it is the kind of thing a UAT tester reads as a bug.
- **No backend was started.** Every call goes through hooks 08-03 already checked against the controller and schema source. Runtime behaviour is 08-06's to prove.

## Known Stubs

None. Both components read real endpoints built by 08-02; no mock data, no placeholder copy, no unmounted slot. The `TODO(08-05)` seam that 08-04 left is gone, and the ledger entry recording it is marked fixed.

## Threat Flags

None. No new network surface — four client calls onto routes 08-02 already built and gated. The privacy split is enforced server-side (`/queries/mine` filters to the caller, `/queries` requires the organising team); `QuerySection`'s choice of hook mirrors it rather than substituting for it, so a user who forces the other view gets a 403 rather than other people's questions.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **08-06 can verify Q&A end-to-end now.** Log in as `arav@ekatva.os`, register for a seeded upcoming event, open it, expand the channel card, ask a question; then log in as `saiteja@ekatva.os`, open the same event's manage page, Attendee Q&A tab, reply. The badge count and the attendee's Open→Answered flip are the two observable transitions.
- **The channel card is getting tall.** Polls plus a compose box plus a question thread now live in one collapsible card in the narrow event sidebar. Nothing is wrong with it, but it is the layout call a static check cannot make — worth a human look during UAT, alongside the same note 08-04 left.
- **No render test was added.** This plan pins to four files and 08-06 is the verification plan. If a structural net is wanted, the cheap version is one render test per component in the idiom of `src/components/__tests__/CloseOutPanels.test.tsx`: an `EventQuery` with `status: 'open'` (expect the reply box) and one with `status: 'answered'` (expect the recorded answer, no box), which is the only branch in either component worth pinning.
- **Author names are still ids.** Both surfaces would read better with "asked by Arav", and that needs `EventQuery.to_dict()` widened server-side — the same follow-up 08-02 and 08-03 recorded, now visible in the UI rather than only in a summary.

## Self-Check: PASSED

- `frontend/src/components/QuerySection.tsx` — FOUND
- `frontend/src/components/OrgQueriesPanel.tsx` — FOUND
- `frontend/src/pages/ManageEvent.tsx` — FOUND (import, tab union, tab strip entry and render branch all present)
- `frontend/src/components/EventChannelSection.tsx` — FOUND (import + mount; no `TODO(08-05)` anywhere under `frontend/src`)
- Commits `21d8c95`, `326f7eb`, `c2756cd`, `09fc8c4` — all FOUND in git log
- Broken Windows entry 6 — status `fixed`, `open_count` 6 → 5, ids 1-5 unchanged
- `npm run build` clean; `npm test` 183/183; working tree clean apart from planning docs

---
*Phase: 08-event-announcements-polls-queries*
*Completed: 2026-08-23*
