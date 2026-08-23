---
phase: 08-event-announcements-polls-queries
plan: 03
subsystem: frontend
tags: [typescript, tanstack-query, api-client, polling, channel]

requires:
  - phase: 08-event-announcements-polls-queries
    plan: 01
    provides: POST/GET /events/<id>/polls, POST .../polls/<pid>/vote, PATCH .../polls/<pid>/close, PollCreateSchema/PollVoteSchema
  - phase: 08-event-announcements-polls-queries
    plan: 02
    provides: POST/GET /events/<id>/queries, GET .../queries/mine, POST .../queries/<qid>/respond, QuerySubmitSchema/QueryRespondSchema
  - phase: 02-auth-session
    provides: request<T>() with in-memory access token and single-flight refresh
provides:
  - EventPoll / EventPollVote / EventQuery types (frontend/src/lib/types.ts)
  - api.polls / createPoll / castVote / closePoll / myQueries / orgQueries / submitQuery / respondQuery
  - usePolls / useCreatePoll / useCastVote / useClosePoll / useMyQueries / useOrgQueries / useSubmitQuery / useRespondQuery
  - channelRefetchInterval — the shared 15s ±3s jitter, now also applied to useAnnouncements
affects: [08-04 EventChannelSection, 08-05 QuerySection and PollSection, 08-06 verification]

actuals:
  tokens: 2344
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "Channel queries poll on a jittered interval and stop in a backgrounded tab (D-13/D-14) — the deliberate opposite of the Kanban board's AC-35 no-polling gate"
    - "Mutation payloads are destructured so the activity id never reaches the request body — marshmallow Schema defaults to unknown=RAISE"
    - "Response types describe the wire exactly: create/close polls are typed Omit<EventPoll, 'vote_counts' | 'my_vote'> because only the list endpoint computes those"

key-files:
  created: []
  modified:
    - frontend/src/lib/types.ts
    - frontend/src/lib/api.ts
    - frontend/src/lib/queries.ts

key-decisions:
  - "The three new types keep the wire's snake_case, matching Notification rather than AnnouncementMessage — nothing adapts these shapes in api.ts, and a camelCase type with no adapter behind it is wrong at runtime"
  - "createPoll and closePoll return Omit<EventPoll, 'vote_counts' | 'my_vote'>, because EventPoll.to_dict() carries neither — only channel_service.list_polls adds them"
  - "useCreatePoll destructures id out of its variables before calling api.createPoll; PollCreateSchema is a plain marshmallow Schema (unknown=RAISE), so an extra key answers 422 rather than being ignored"
  - "channelRefetchInterval is defined immediately above useAnnouncements, its first caller, rather than in the Phase 8 block at the foot of the file"
  - "The plan's get/post/patch helpers do not exist in this codebase; every call goes through the existing request<T>(path, options), which is what carries the access token and the single-flight refresh"

patterns-established:
  - "A channel query is a live surface and polls; a workspace board is not and does not. Both rules now have their reasoning recorded next to the code, and the no-polling gate scopes itself to task hooks so the two can coexist in one module"

requirements-completed: []

coverage:
  - id: D1
    description: "EventPoll, EventPollVote and EventQuery are exported from frontend/src/lib/types.ts and match the shapes channel_service actually returns"
    requirement: CHAT-01
    verification:
      - kind: static
        ref: "npm run build (tsc -b && vite build) passes; field-by-field read against EventPoll.to_dict(), EventPollVote.to_dict(), EventQuery.to_dict() and channel_service.list_polls"
        status: pass
    human_judgment: false
  - id: D2
    description: "api exposes all eight poll and query calls against the paths channel_controller registers, with bodies the marshmallow schemas accept"
    requirement: CHAT-02
    verification:
      - kind: static
        ref: "grep of the eight api keys returns 8; each path and body checked against channel_controller.py routes and PollCreateSchema/PollVoteSchema/QuerySubmitSchema/QueryRespondSchema field names"
        status: pass
    human_judgment: false
  - id: D3
    description: "All eight hooks are exported, mutations invalidate the list key they affect, and both query lists are keyed apart (['queries','mine',id] vs ['queries','org',id])"
    requirement: CHAT-02
    verification:
      - kind: static
        ref: "grep of the nine export names (eight new plus useAnnouncements) returns 9; npm run build passes"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every channel query polls at 15s ± 3s and carries refetchIntervalInBackground: false, including useAnnouncements"
    requirement: CHAT-04
    verification:
      - kind: static
        ref: "channelRefetchInterval = 15_000 + Math.random() * 6_000 - 3_000, i.e. [12s, 18s]; refetchIntervalInBackground: false appears on all four channel queries (useAnnouncements, usePolls, useMyQueries, useOrgQueries)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Adding polling to queries.ts does not breach the 05-09 AC-35 no-polling gate"
    requirement: CHAT-04
    verification:
      - kind: unit
        ref: "npm test — src/__tests__/no-kanban-polling.test.ts passes (3 tests); full suite 183/183 across 27 files"
        status: pass
    human_judgment: false

duration: 25min
completed: 2026-08-23
status: complete
---

# Phase 8 Plan 03: Frontend Channel Data Layer Summary

**The whole client side of the event channel below the UI: three wire-accurate types, eight API calls onto the routes 08-01 and 08-02 built, and eight TanStack hooks that refresh polls, questions and announcements every ~15 seconds while the tab is in front and stop dead when it is not.**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-08-23
- **Completed:** 2026-08-23
- **Tasks:** 3
- **Files modified:** 3 (0 created, 3 modified)

## Accomplishments

- `types.ts` gained `EventPoll`, `EventPollVote` and `EventQuery`, each checked field-by-field against the `to_dict()` that produces it rather than transcribed from the plan.
- `api.ts` gained the eight poll and query calls, all routed through the existing `request<T>()` so they inherit the access-token header and the single-flight refresh from Phase 2.
- `queries.ts` gained the eight hooks plus the shared `channelRefetchInterval`, and `useAnnouncements` — which previously never refreshed at all — was brought onto the same interval, closing CHAT-04's actual gap.
- Verified with the project's real gate: `npm run build` (which is the type-check) clean, and `npm test` green at 183/183, including the 05-09 structural gate that fails the build if polling reaches the task board.

## Task Commits

1. **Task 1: TypeScript interfaces in types.ts** - `3987a1f` (feat)
2. **Task 2: API client functions in api.ts** - `dc80c97` (feat)
3. **Task 3: TanStack Query hooks with polling in queries.ts** - `fa2bb5b` (feat)

## Files Created/Modified

- `frontend/src/lib/types.ts` - `EventPoll` (with `vote_counts`/`my_vote`), `EventPollVote`, `EventQuery`, under a Phase 8 section header that records why they are snake_case.
- `frontend/src/lib/api.ts` - the eight calls plus the three new type imports; `createPoll`/`closePoll` typed to the narrower shape those two routes return.
- `frontend/src/lib/queries.ts` - `channelRefetchInterval` above `useAnnouncements`, the updated `useAnnouncements`, and the eight new hooks in a Phase 8 block at the foot of the file.

## Decisions Made

- **The three types keep snake_case.** `types.ts` holds both conventions already: `AnnouncementMessage` is camelCase because `adaptEvent`-style adaptation stands behind it, `Notification` is snake_case because nothing adapts it. These three are the second kind — no adapter was added, so a camelCase type would have described a shape that never arrives. CLAUDE.md's rule is that adaptation happens *once, in api.ts* if it happens; it does not require adaptation where there is none.
- **`createPoll` and `closePoll` are typed `Omit<EventPoll, 'vote_counts' | 'my_vote'>`.** `EventPoll.to_dict()` returns six keys; the counts and the caller's own vote are computed in `channel_service.list_polls` and exist only on the list response. Typing all three calls as a full `EventPoll` would have promised two fields that are not on the wire — the sort of lie that surfaces as `undefined.length` inside a results bar three plans later. Both mutations invalidate `['polls', id]`, so the full shape arrives on the very next fetch anyway.
- **`channelRefetchInterval` lives immediately above `useAnnouncements`.** It is shared by a Phase 5-era hook and four Phase 8 ones; putting it at its first use keeps a reader from meeting an unexplained identifier 400 lines before its definition.
- **Every call goes through `request<T>()`.** The plan's snippets assume `get`/`post`/`patch` helpers; this codebase has none. `request` is not a stylistic preference here — it is what attaches the in-memory access token and runs the single-flight refresh on a 401, so a hand-rolled `fetch` would have logged the user out on the first expiry.

## Deviations from Plan

**1. [Rule 1 - Bug] `useCreatePoll` would have 422'd on every call**

- **Found during:** Task 3
- **Issue:** The plan's `useCreatePoll` passes its whole variables object as the request body — `api.createPoll(v.id, v)` — so the payload carries `id` alongside `question`/`options`/`closes_at`. `PollCreateSchema` is a plain marshmallow `Schema`, whose `unknown` defaults to `RAISE`, so the server would have answered 422 `validation_error` for every poll creation. Nothing in the plan's own verification (`tsc --noEmit`) could have caught it: the extra key is type-correct.
- **Fix:** Destructured in the `mutationFn` signature — `({ id, ...data }) => api.createPoll(id, data)` — so only the three schema fields reach the body, with a comment naming `unknown=RAISE` as the reason.
- **Files modified:** `frontend/src/lib/queries.ts`
- **Verification:** `PollCreateSchema` read directly (`backend/app/schemas/__init__.py:163-174`) — three declared fields, no `Meta.unknown` override; the destructure leaves exactly those three. `npm run build` and `npm test` pass.
- **Committed in:** `fa2bb5b` (Task 3 commit)

**2. [Rule 3 - Blocking] The plan's `get`/`post`/`patch` API helpers do not exist**

- **Found during:** Task 2
- **Issue:** Task 2's snippet is written against `get<T>(path)` / `post<T>(path, data)` / `patch<T>(path, data)`. `api.ts` exports no such helpers — there is one `async function request<T>(path, options: RequestInit)` and every existing call uses it. The snippet would not have compiled.
- **Fix:** Wrote all eight calls with `request<T>(path, { method, body: JSON.stringify(...) })`, matching the surrounding `broadcast`/`postAnnouncement`/`submitFeedback` calls exactly.
- **Files modified:** `frontend/src/lib/api.ts`
- **Verification:** `npm run build` passes; the eight keys are present and each path matches a route in `channel_controller.py`.
- **Committed in:** `dc80c97` (Task 2 commit)

**3. [Rule 1 - Correctness] `closePoll` sent an empty JSON body**

- **Found during:** Task 2
- **Issue:** The plan's `patch<EventPoll>(..., {})` implies a `{}` body on the close route. `close_poll` in `channel_controller.py` reads no body at all and validates nothing.
- **Fix:** `request(..., { method: 'PATCH' })` with no body, as with `verifyExpense` and the other bodiless PATCH calls in the file.
- **Files modified:** `frontend/src/lib/api.ts`
- **Verification:** `channel_controller.close_poll` takes no `request.get_json()`; build passes.
- **Committed in:** `dc80c97` (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (2 correctness, 1 blocking). All three were latent 422/compile failures that the plan's stated verification (`tsc --noEmit`) could not have surfaced.
**Impact on plan:** No scope change — same three files, same eight calls, same eight hooks. Each fix narrows the code onto what the backend actually accepts.

## Issues Encountered

- **The 05-09 no-polling gate had to be checked, not assumed.** `src/__tests__/no-kanban-polling.test.ts` scans `src/lib/queries.ts` for `refetchInterval`, and this plan adds four of them to that exact file. The gate is scoped by `taskHooksIn()` to blocks starting `export const use*Task*`, and it resets that flag on every `^export const use` line — so the Phase 8 block at the foot of the file, and the helper defined above `useAnnouncements`, both fall outside it. Confirmed by running the suite rather than by reading the regex: 3/3 in that file, 183/183 overall.
- **`npm run build`, not `npx tsc --noEmit`.** All three tasks specify the latter; per CLAUDE.md this project's type-check *is* `npm run build` (`tsc -b && vite build`) and there is no `--noEmit` script. Used the real gate.
- No backend was started and no test in this plan hits the network — the eight calls are verified against the controller and schema source, and their runtime behaviour is 08-06's to prove.

## Known Stubs

None. Every hook calls a real endpoint that 08-01 and 08-02 already built and smoke-tested; nothing returns mock or placeholder data. There is no UI yet to render any of it — that is 08-04 and 08-05's scope, not a stub in this plan.

## Threat Flags

None. This plan adds no new surface: eight client calls onto eight routes that already exist and are already gated server-side. No authorization decision is made here, and no gate is duplicated client-side that could drift from the server's.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **08-04 / 08-05 can import all eight hooks directly.** `usePolls(id)` yields `EventPoll[]` with `vote_counts` index-aligned to `options` and `my_vote` as the caller's chosen index or `null` — enough to render a results bar and to decide whether to show the ballot or the result. `useMyQueries` and `useOrgQueries` are keyed apart, so a registrant view and a team view can be mounted on the same page without either clobbering the other's cache.
- **Mutation results are the narrow shape.** `useCreatePoll` and `useClosePoll` resolve to a poll *without* `vote_counts`/`my_vote`. Render from the invalidated list, not from the mutation's return value.
- **`responded_by` and `user_id` are raw ids, and `EventQuery` carries no author name** — 08-02 flagged the same thing. A UI wanting "asked by Arav" needs `EventQuery.to_dict()` widened server-side first; it was deliberately not faked client-side here.
- **The unanswered badge 08-CONTEXT asks for** is `useOrgQueries(id).data?.filter(q => q.status === 'open').length` — no extra hook needed.
- **No test was added for `channelRefetchInterval`.** It is a one-line arithmetic expression and the plan pins this work to three files; if 08-06 wants CHAT-04 pinned structurally, the cheap version is a source scan asserting every `['polls'|'queries'|'announcements']` query carries `refetchIntervalInBackground: false`, in the idiom of `no-kanban-polling.test.ts`.
- **No requirement marked complete.** CHAT-01/02/04 are also owned by 08-04, 08-05 and 08-06; a data layer with no UI on top of it cannot satisfy any of them. Same call 08-01 and 08-02 made.

## Self-Check: PASSED

- `frontend/src/lib/types.ts` — FOUND (3 of 3 new interfaces exported)
- `frontend/src/lib/api.ts` — FOUND (8 of 8 api keys present)
- `frontend/src/lib/queries.ts` — FOUND (9 of 9 hook exports present, incl. updated `useAnnouncements`; 4 channel queries carry `refetchIntervalInBackground: false`)
- Commits `3987a1f`, `dc80c97`, `fa2bb5b` — all FOUND in git log
- `npm run build` clean; `npm test` 183/183; working tree clean apart from planning docs

---
*Phase: 08-event-announcements-polls-queries*
*Completed: 2026-08-23*
