---
phase: 08-event-announcements-polls-queries
fixed_at: 2026-08-24T02:10:00Z
review_path: .planning/phases/08-event-announcements-polls-queries/08-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 8: Code Review Fix Report

**Fixed at:** 2026-08-24
**Source review:** `.planning/phases/08-event-announcements-polls-queries/08-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 10 (CR-01, CR-02, WR-01…WR-08)
- Fixed: 10
- Skipped: 0
- Info findings (IN-01…IN-05): out of scope for `critical_warning`, untouched

One finding (WR-08) did not reproduce on investigation and was resolved as a
documentation change rather than a behaviour change — details below.

## Verification

All gates were run in the **main checkout** (`main`, after the worktree was
fast-forwarded and torn down), not inside the isolated worktree — the worktree
has no `node_modules` or `.venv`, so its numbers would not have been
reproducible. Per-fix verification inside the worktree was `ast.parse` plus
`pytest tests/test_event_channel.py` using the main checkout's interpreter.

| Gate | Result |
|------|--------|
| `cd frontend && npm run build` (tsc -b && vite build) | passed, 2235 modules |
| `cd frontend && npm test` (vitest) | 28 files, 187 tests passed |
| `cd backend && pytest tests/test_event_channel.py -v --no-cov` | 23 passed (was 16) |
| `cd backend && pytest tests/test_schema_batch.py tests/test_rbac.py --no-cov` | 9 passed |

The full backend suite was **not** run: `tests/test_org_service_unit.py` has a
known pre-existing hang (Broken Window #7), unrelated to this phase.

## Fixed Issues

### CR-01: the channel gated on an event status the application never assigns

**Files modified:** `backend/app/services/channel_service.py`, `backend/tests/test_event_channel.py`
**Commit:** `7641a5d`

Confirmed the defect before fixing it. `grep` over the backend shows
`Activity.status` is only ever assigned `EVENT_UPCOMING`
(`proposal_service.py:160,330`) or `EVENT_CANCELLED`
(`proposal_service.py:370`, `event_service.py:100`); `EVENT_LIVE` appears only
in `constants.py` and in the guard itself. `registration_service.register`
refuses only `EVENT_CANCELLED`, so the guard was rejecting the very window it
claimed to protect, and every write path in the phase was a 409 in production.

Applied the review's direction: the guard now states the **closed** set,
`CHANNEL_CLOSED_STATUSES = (EVENT_COMPLETED, EVENT_ARCHIVED, EVENT_CANCELLED)`,
so a status added later defaults to open. Test side: `_seed_activity` now
defaults to `EVENT_UPCOMING` (the status an approved proposal actually
produces), `CLOSED_STATUSES` is the three genuinely-closed statuses, and
`test_the_channel_is_open_on_the_status_approval_produces` is the regression
test that would have caught the original — it asserts a poll and a query are
both accepted on an `upcoming` event.

### CR-02: `list_polls` performed no authorization

**Files modified:** `backend/app/controllers/channel_controller.py`, `backend/app/services/channel_service.py`, `backend/tests/test_event_channel.py`
**Commit:** `ef0590d`

Verified `can_participate_in_activity_required` is the right existing decorator
(`rbac.py:399`), and that `can_participate_in_activity` falls through to
`can_manage_activity` — so the organiser path in `test_channel_end_to_end`
(which reads `my_vote: null` as a non-voting team member) still passes.

The route now carries that guard instead of bare `auth_required`, the
`g.current_user.id if g.current_user else None` ternary and the service's
`if viewer_id else None` branch are gone (both dead behind the guard), and the
controller docstring was corrected — it previously claimed a narrowing the
route did not do. New test `test_a_stranger_cannot_read_an_events_polls` covers
both halves: 403 for a non-registrant, 404 for an unknown activity (which also
closes IN-04 for free, as the review predicted).

### WR-01: `closes_at` was published but never enforced

**Files modified:** `backend/app/services/channel_service.py`, `backend/tests/test_event_channel.py`
**Commit:** `1d8744e`

Enforced rather than removed. New `_poll_expired()` normalises the naive/aware
mismatch the review flagged (the column is naive, marshmallow returns whatever
the client sent, and comparing across kinds raises). `cast_vote` refuses an
expired poll with the existing `poll_closed` code, and `list_polls` reports the
effective status so `PollCard` stops offering a ballot the server will reject.
Effective state is computed, not written back, because nothing runs on a
schedule to write it. Covered by
`test_a_poll_past_closes_at_refuses_votes_and_reads_as_closed`.

### WR-02: `close_poll` could be closed twice, duplicating the audit row

**Files modified:** `backend/app/services/channel_service.py`, `backend/tests/test_event_channel.py`
**Commit:** `8447eab`

Guarded on `POLL_OPEN` with a 409, matching `respond_query`. The new test
asserts both the 409 and that exactly one `"Poll closed"` audit row exists after
a double close.

### WR-03: every `IntegrityError` became "you have already voted"

**Files modified:** `backend/app/services/channel_service.py`, `backend/tests/test_event_channel.py`
**Commit:** `edb7ee0`

**The review's literal suggestion is wrong on this project's dev database and
was not applied as written.** `if "uq_poll_vote" not in str(exc.orig)` breaks
the 409 under SQLite, which does not name the constraint — it reports
`UNIQUE constraint failed: event_poll_votes.poll_id, event_poll_votes.user_id`.
Applying it verbatim turned `test_channel_end_to_end` red, which is how this was
caught. The committed `_is_duplicate_vote()` matches either dialect's wording
(Postgres names the constraint, SQLite names the columns) and re-raises anything
else. A parametrised test pins all four messages — both true positives and a
foreign-key and NOT NULL false positive.

### WR-04: three components rendered an empty state on API error

**Files modified:** `frontend/src/components/EventChannelSection.tsx`, `frontend/src/components/QuerySection.tsx`, `frontend/src/components/OrgQueriesPanel.tsx`
**Commit:** `70d1a66`

All three now read `isError`/`error` and render the shared `ErrorState` from
`components/states.tsx` (which already distinguishes a network failure and tells
the user to start the backend), restoring the `CLAUDE.md` convention.

### WR-05: `OrgQueriesPanel` shared one mutation across the whole queue

**Files modified:** `frontend/src/components/OrgQueriesPanel.tsx`
**Commit:** `c2241b7`

Added `sendingId` state, set in `sendReply` and cleared in `onSettled` (guarded
against clearing a newer in-flight id). The disabled prop and the "Sending…"
label are now per row, so a team can work the queue in parallel.

### WR-06: a registrant could never read a late answer

**Files modified:** `frontend/src/pages/EventDetail.tsx`, `frontend/src/components/EventChannelSection.tsx`, `frontend/src/components/QuerySection.tsx`, `frontend/src/components/PollCard.tsx`
**Commit:** `ff82228`

Took the review's direction — keep the read half mounted, hide the write
affordances. `EventChannelSection` moved out of the `!isPast` block and gained a
`closed` prop that hides the poll composer, passes `readOnly` to `QuerySection`
(thread visible, composer replaced by an explanatory line) and `channelClosed`
to `PollCard` (result view, never a ballot). The "Close poll" control is
deliberately left available to the team, because `close_poll` is ungated after
the event by design (D-17). Cancelled events remain excluded, unchanged.

### WR-07: `PollCard` guarded `vote_counts` but not `my_vote`

**Files modified:** `frontend/src/components/PollCard.tsx`
**Commit:** `9d34245`

`const myVote = poll.my_vote ?? null` normalises once; `showResults`, the `mine`
comparison and the "you did not vote" line all read it. The two adjacent lines
now defend the same hazard the same way.

### WR-08: the ballot between a successful vote and the refetch

**Files modified:** `frontend/src/lib/queries.ts`
**Commit:** `446f7f8`
**Status: fixed as documentation — the reported window does not exist.**

Checked against the installed `@tanstack/query-core@5.101.4`
(`build/modern/mutation.js:123`): `await this.options.onSuccess?.(...)` runs
before `dispatch({ type: "success" })`, so the mutation stays `isPending` until
the callback's promise settles. `useCastVote`'s `onSuccess` is a concise arrow
body, so it *already* returns the `invalidateQueries` promise, and
`invalidateQueries` awaits the refetch of active queries by default. The buttons
are therefore already disabled through the refetch and a second click cannot
land.

No behaviour change was made. A comment was added in place explaining why the
promise must keep being returned, so a later refactor to a block body
(`onSuccess: (_d, v) => { qc.invalidateQueries(...) }`) does not silently open
the window the review described.

## Skipped Issues

None.

## Notes carried forward

- **WR-03 negative path is unit-tested, not integration-tested.** Triggering a
  real foreign-key violation through the HTTP stack is not practical (SQLite
  does not enforce FKs by default in this configuration), so the dialect-message
  matching is pinned at the function level instead.
- **IN-01…IN-05 were left alone** — Info tier, out of `critical_warning` scope.
  IN-04 is nonetheless resolved by the CR-02 guard.
- `frontend/src/components/QuerySection.tsx` has one JSX block left at its
  original indentation inside the new `readOnly` ternary, to keep the diff to
  the lines that changed rather than reindenting twenty untouched ones.

---

_Fixed: 2026-08-24_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
