---
phase: 08-event-announcements-polls-queries
reviewed: 2026-08-24T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - backend/app/controllers/__init__.py
  - backend/app/controllers/channel_controller.py
  - backend/app/schemas/__init__.py
  - backend/app/services/channel_service.py
  - backend/tests/test_event_channel.py
  - frontend/src/__tests__/channel-polling.test.ts
  - frontend/src/components/EventChannelSection.tsx
  - frontend/src/components/OrgQueriesPanel.tsx
  - frontend/src/components/PollCard.tsx
  - frontend/src/components/QuerySection.tsx
  - frontend/src/lib/api.ts
  - frontend/src/lib/queries.ts
  - frontend/src/lib/types.ts
  - frontend/src/pages/EventDetail.tsx
  - frontend/src/pages/ManageEvent.tsx
findings:
  critical: 2
  warning: 8
  info: 5
  total: 15
status: issues_found
---

# Phase 8: Code Review Report

**Reviewed:** 2026-08-24
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

Phase 8 adds the event channel: organiser polls (CHAT-01), attendee Q&A (CHAT-02/03) and 15s foreground polling (CHAT-04), across a new blueprint, a new service, four schemas, four components and two pages. The layering is correct (controller → service → model), the RBAC guards are activity-scoped rather than role-scoped, the one-vote rule is a real database constraint rather than a check-then-insert, and the audit asymmetry is deliberate and tested.

Two defects are shipping-blocking. The first is a state-machine mismatch that makes **every write path in this phase permanently unreachable in a real deployment** — the guard requires `Activity.status == "live"`, a value nothing in the codebase ever assigns. The test suite does not catch it because every fixture sets `status=EVENT_LIVE` by hand. The second is an authorization gap in `list_polls`, which performs none of the narrowing its own controller docstring promises.

The remaining findings cluster around unenforced/undelivered contracts (`closes_at` is stored and published on the wire but never enforced or rendered), and silent failure in the UI (three of the four new components render an "empty" state on API error, contradicting the project's stated backend-unavailable behaviour).

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: `_assert_channel_open` gates on an event status the application never assigns — polls, votes and queries are permanently 409 in production

**File:** `backend/app/services/channel_service.py:48-54` (with `backend/app/models/__init__.py:329`, `backend/app/services/proposal_service.py:160,330`)

**Issue:** `_assert_channel_open` raises 409 unless `activity.status == EVENT_LIVE` (`"live"`). Grepping the whole backend, `EVENT_LIVE` appears in exactly two places — `constants.py` where it is defined, and this function. No service, repository, controller, scheduled job or `seed.py` ever sets an `Activity.status` to `"live"`:

- `proposal_service.py:160` creates the Activity on approval with `status=EVENT_UPCOMING`
- `proposal_service.py:330` re-sets it to `EVENT_UPCOMING`
- `Activity.status` column default is `"upcoming"`

Therefore `create_poll`, `cast_vote` and `submit_query` return `409 registration_window_closed` for **every activity that exists**, including every seeded demo event. The three read paths work, so the UI renders a poll composer, ballot buttons and a question box that all fail on submit with "Posting to this event is no longer available."

The design rationale (08-CONTEXT D-17) says the gate matches "the registration window". It does not: `registration_service.register` (lines 12-31) opens registration for any published, non-cancelled activity — i.e. for `upcoming`. The guard rejects precisely the window it claims to protect.

The test suite is complicit rather than protective: `_seed_activity(status=EVENT_LIVE)` writes the unreachable status directly onto the row, so `test_channel_end_to_end` passes against a state the product cannot produce. `CLOSED_STATUSES` even asserts that `EVENT_UPCOMING` — the only status real events have — is refused.

**Fix:** Align the guard with the actual registration window, matching `registration_service`:

```python
# backend/app/services/channel_service.py
from ..constants import EVENT_ARCHIVED, EVENT_CANCELLED, EVENT_COMPLETED

CHANNEL_CLOSED_STATUSES = (EVENT_COMPLETED, EVENT_ARCHIVED, EVENT_CANCELLED)


def _assert_channel_open(activity):
    if activity.status in CHANNEL_CLOSED_STATUSES:
        raise ApiError(
            "Posting to this event is no longer available.",
            "registration_window_closed",
            409,
        )
```

Then fix the tests so they cannot pass against an unreachable state: change `CLOSED_STATUSES` to `[EVENT_COMPLETED, EVENT_CANCELLED]`, seed the happy-path fixture with `status=EVENT_UPCOMING` (the status `proposal_service` actually produces), and add a regression test asserting a poll can be created on an event in the status an approved proposal yields:

```python
def test_channel_is_open_on_the_status_approval_actually_produces(client):
    """Guards must gate on a status the application can reach (CR-01)."""
    activity = _seed_activity(status=EVENT_UPCOMING)
    res = client.post(
        f"/api/v1/events/{activity.id}/polls",
        json={"question": "Which slot suits you?", "options": ["Sat", "Sun"]},
        headers=_organiser(client),
    )
    assert res.status_code == 201, res.get_json()
```

If gating on `live` is genuinely intended, the phase is incomplete: an `upcoming → live` transition must exist somewhere before this ships.

### CR-02: `list_polls` performs no authorization at all — any authenticated user can read any event's polls and vote tallies

**File:** `backend/app/services/channel_service.py:88-111`, route at `backend/app/controllers/channel_controller.py:42-48`

**Issue:** The route carries only `@auth_required`. The controller docstring (lines 8-11) states the guards are asymmetric on purpose and that "reading polls, voting, and submitting a query are open to any authenticated caller at the route **and narrowed to actual registrants inside `channel_service`**". `cast_vote` (line 118) and `submit_query` (line 166) do call `can_participate_in_activity`. `list_polls` calls nothing — no `_activity_or_404`, no participation check, no team check.

Consequence: any logged-in student can `GET /api/v1/events/<any-activity-id>/polls` for an event they are not registered for, in a city they are not in, and read every poll question plus the full per-option tally. Activity IDs are enumerable from the public city feed. This is the same class of leak the sibling `/queries` route is team-gated against, and it directly contradicts the frontend's own gating (`EventDetail.tsx:513` renders the channel only for `(registered && !isWaitlisted) || canManage`) — the UI enforces a rule the API does not.

There is no test covering a non-registrant reading polls, which is why this survived.

**Fix:** Use the existing scoped guard, which is exactly the predicate the two write paths already call:

```python
# backend/app/controllers/channel_controller.py
from ..rbac import auth_required, can_manage_activity_required, can_participate_in_activity_required

@channel_bp.get("/events/<activity_id>/polls")
@can_participate_in_activity_required
def list_polls(activity_id):
    polls = channel_service.list_polls(activity_id, g.current_user.id)
    return jsonify(polls), 200
```

`activity_scoped` already 404s on an unknown activity and 403s on a non-participant, which also resolves IN-04. The `g.current_user.id if g.current_user else None` ternary in the controller and the `if viewer_id else None` branch in the service both become dead once the guard is in place — `auth_required`/`activity_scoped` never leave `g.current_user` unset — and should be dropped.

Add the missing test:

```python
def test_a_stranger_cannot_read_an_events_polls(client):
    activity = _seed_activity(status=EVENT_UPCOMING, with_registration=False)
    _seed_poll(activity)
    res = client.get(f"/api/v1/events/{activity.id}/polls",
                     headers=_auth(client, "head@ekatva.os", "head12345"))
    assert res.status_code == 403, res.get_json()
```

## Warnings

### WR-01: `closes_at` is accepted, stored and published on the wire, but never enforced and never surfaced — an "expired" poll accepts votes indefinitely

**File:** `backend/app/services/channel_service.py:69-85,114-140`; `backend/app/schemas/__init__.py:174`; `frontend/src/lib/types.ts:396`

**Issue:** `PollCreateSchema.closes_at` accepts any datetime (including one in the past), `create_poll` persists it, `EventPoll.to_dict()` publishes it, and `EventPoll.closes_at` is a declared field on the frontend type. Nothing ever reads it: `cast_vote` gates only on `poll.status != POLL_OPEN`, and no component renders it. `EventChannelSection`'s composer has no control for it, so the only way to set it is a hand-crafted request.

The result is a published API field that promises a scheduled close and delivers nothing — a poll with `closes_at` an hour in the past still shows "Open" and still accepts votes. This is worse than the field not existing, because a client written against the type would trust it.

**Fix:** Either enforce it in `cast_vote` beside the status check, or remove the field from the schema/response until it is implemented. Enforcing is two lines:

```python
poll = _poll_or_404(activity_id, poll_id)
if poll.status != POLL_OPEN:
    raise ApiError("This poll is closed", "poll_closed", 409)
if poll.closes_at and poll.closes_at <= datetime.now(timezone.utc).replace(tzinfo=None):
    raise ApiError("This poll has closed", "poll_closed", 409)
```

(Note the naive/aware coercion — `closes_at` round-trips from SQLite as naive; compare against a consistently-shaped value or store aware throughout.) If enforced, `list_polls` should also report the effective open/closed state so `PollCard` stops rendering a ballot for an expired poll.

### WR-02: `close_poll` is not guarded on current state — re-closing a closed poll returns 200 and writes a duplicate audit row

**File:** `backend/app/services/channel_service.py:143-149`

**Issue:** `close_poll` sets `poll.status = POLL_CLOSED` unconditionally and records an audit row on every call. Two concurrent organisers, or one double-click on a stale page, produce two `"Poll closed"` rows for the same poll against different actors and timestamps. The append-only audit log is the trail Phase 8 explicitly ships (D-16); duplicate closes make it read as two moderation events where one happened. `respond_query` gets this right (line 209 raises 409 on a non-open query) — `close_poll` is the inconsistent sibling.

**Fix:**

```python
def close_poll(activity_id, poll_id, current_user) -> EventPoll:
    poll = _poll_or_404(activity_id, poll_id)
    if poll.status != POLL_OPEN:
        raise ApiError("This poll is already closed", "poll_closed", 409)
    poll.status = POLL_CLOSED
    AuditRepository.record("poll", poll.id, "Poll closed", current_user)
    db.session.commit()
    return poll
```

### WR-03: `cast_vote` maps every `IntegrityError` to "you have already voted"

**File:** `backend/app/services/channel_service.py:133-139`

**Issue:** The bare `except IntegrityError` assumes the only constraint that can fail is `uq_poll_vote`. The insert also carries FKs on `poll_id` and `user_id` and a `NOT NULL` on `option_index`. A user row deleted mid-session, or a poll deleted by the cascade on activity deletion between `_poll_or_404` and `commit`, produces a foreign-key violation reported to the attendee as `409 already_voted` — a message that is not merely unhelpful but actively false, and one that will send a bug report chasing the wrong constraint.

**Fix:** Narrow to the named constraint before translating:

```python
except IntegrityError as exc:
    db.session.rollback()
    if "uq_poll_vote" not in str(getattr(exc, "orig", exc)):
        raise
    raise ApiError("You have already voted on this poll", "already_voted", 409)
```

### WR-04: Three of the four new components render an empty state on API error, silently hiding 403s and an unreachable backend

**File:** `frontend/src/components/EventChannelSection.tsx:34,98-103`; `frontend/src/components/QuerySection.tsx:20,67-73`; `frontend/src/components/OrgQueriesPanel.tsx:19,56-61`

**Issue:** All three destructure `const { data: xs = [] } = useX(...)` and branch on `isLoading` only. `isError` is never read. A 403 (non-team user reaching `ManageEvent`), a 500, or a backend that is simply not running all land in the same branch as "there is genuinely nothing here", and the user is told:

- `"No polls yet."`
- `"No questions asked yet. Have a question about logistics or food? Ask the organizing team here."`
- `"No questions from attendees yet."`

An organiser looking at a broken Q&A endpoint is told with confidence that nobody has asked anything. This contradicts the project convention in `CLAUDE.md` ("pages without a reachable API show an on-brand 'backend unavailable' state rather than failing silently") and the codebase already has the primitive — `components/states.tsx` exports `ErrorState`, used by both pages that host these components.

Compounding it: with `refetchInterval` set, a persistent 403 keeps re-firing every ~15s with no user-visible signal.

**Fix:** Read `isError`/`error` and render the shared state, e.g. in `OrgQueriesPanel`:

```tsx
const { data: queries = [], isLoading, isError, error } = useOrgQueries(activityId)
...
{isLoading ? (
  <p className="text-caption text-graytext-mid">Loading questions…</p>
) : isError ? (
  <ErrorState error={error} />
) : sorted.length === 0 ? (
```

### WR-05: `OrgQueriesPanel` shares one mutation instance across every query row, so answering one question disables the whole queue

**File:** `frontend/src/components/OrgQueriesPanel.tsx:21,31-32,95`

**Issue:** `respondMut` is a single `useRespondQuery()` instance for the entire list. `respondMut.isPending` is therefore global: while one reply is in flight, every other "Send Reply" button on the page is `disabled`, and `sendReply` early-returns for every other query. On a slow connection over a queue of ten unanswered questions, the panel serialises into one-answer-at-a-time with no indication of why the other buttons went dead — and the pending label `"Sending…"` appears on all of them at once. `PollCard` gets this right by construction (one mutation instance per card).

**Fix:** Track which query is in flight, or extract a per-row component that owns its own mutation:

```tsx
const [sendingId, setSendingId] = useState<string | null>(null)
// ...
disabled={!(drafts[q.id] ?? '').trim() || sendingId === q.id}
// set in sendReply, cleared in onSettled
```

### WR-06: A registrant can never read a late answer — the channel is hidden the moment the event completes, defeating the ungated `respond_query`

**File:** `frontend/src/pages/EventDetail.tsx:83,496,513-517`

**Issue:** `channel_service`'s module docstring and 08-CONTEXT D-17 make a point of leaving `respond_query` ungated so "answering a lingering question after the event has ended is exactly when a team needs to". The organiser's half of that works (`OrgQueriesPanel` on `ManageEvent` is not gated on event date). The asker's half does not: `EventDetail` mounts `EventChannelSection` only when `!isPast`, where `isPast = e.status === 'completed' || e.status === 'archived'` — and `QuerySection`, the only surface on which a registrant reads their own answer, lives inside it. The moment the event is marked completed, every answer the team writes is unreadable by the person who asked. There is also a test asserting the backend behaviour (`test_respond_query_still_permitted_after_the_event_ends`) with no counterpart proving anyone can see the result.

**Fix:** Keep the read half mounted after the event and hide only the write affordances. Pass the closed state down and render `QuerySection` read-only (no composer, existing thread visible) when `isPast`, rather than unmounting the section.

### WR-07: `PollCard` defends `vote_counts` against the create/close response shape but not `my_vote`, so a card fed one shows an empty result view instead of a ballot

**File:** `frontend/src/components/PollCard.tsx:32-34`

**Issue:** Line 32 carries an explicit comment that only the list endpoint returns `vote_counts`/`my_vote`, and guards with `poll.vote_counts ?? []`. Line 34 then does `poll.my_vote !== null` — for the very same `undefined` case the line above guards against, `undefined !== null` is `true`, so `showResults` is `true` and the card renders result bars with `0 · 0%` on every option and "0 votes", with no way to vote. The two lines defend against the same hazard and disagree about it. `api.ts` types those two responses `Omit<EventPoll, 'vote_counts' | 'my_vote'>`, so TypeScript will not catch a future caller that passes one.

**Fix:** Make the guard symmetric with the one directly above it:

```tsx
const myVote = poll.my_vote ?? null
const showResults = myVote !== null || closed
```

and use `myVote` for the `mine` comparison and the "you did not vote" line.

### WR-08: The ballot stays clickable between a successful vote and the refetch that reflects it

**File:** `frontend/src/components/PollCard.tsx:34,81-90`; `frontend/src/lib/queries.ts:812-819`

**Issue:** `castVoteMut` disables the option buttons only while `isPending`. On success the mutation invalidates `['polls', id]` and resolves; the card then re-renders with the *old* cached `my_vote: null` (still the ballot, now re-enabled) until the refetch lands. In that window a user who clicks a second option gets a `409 already_voted` error toast for what looks like a normal first interaction. The 15s poll interval means the window is the network round-trip, but the toast is a hard error rather than a no-op.

**Fix:** Keep the buttons disabled through the refetch — either `await qc.invalidateQueries(...)` inside `onSuccess` (TanStack keeps the mutation pending until the returned promise settles), or disable on `castVoteMut.isSuccess || castVoteMut.isPending`.

## Info

### IN-01: `channel-polling.test.ts` eagerly loads every `.ts`/`.tsx` file in `src` as raw text to read one file

**File:** `frontend/src/__tests__/channel-polling.test.ts:32-40`

**Issue:** `import.meta.glob('../**/*.{ts,tsx}', { eager: true })` pulls the entire source tree into memory as strings, plus a full `Object.fromEntries` remap, and then uses exactly one key: `SOURCES['src/lib/queries.ts']`. The gate itself is well-designed (the known-bad fixture test is a genuinely good touch), the file loading is not.

**Fix:** `import queriesSource from '../lib/queries.ts?raw'` — one line, same typing support from `vite-env.d.ts`, no tree walk.

### IN-02: Phase-8 payloads keep snake_case all the way into components, against the project's adapt-once rule

**File:** `frontend/src/lib/types.ts:379-422`; `frontend/src/lib/api.ts:690-728`; all four new components

**Issue:** `CLAUDE.md` states "Adapt snake_case→camelCase once, in `lib/api.ts`. Don't reshape backend JSON inside page components." Phase 8 adds no adapter, so `poll.vote_counts`, `poll.my_vote`, `q.response_body`, `q.responded_at`, `q.user_id` are read raw in JSX, sitting next to `e.startsAt` and `e.teamMembers` on the same pages. The divergence is deliberate and argued in the types.ts header (citing the `Notification` precedent, and correctly noting that a camelCase type with no adapter behind it is a lie). Recording it so the exception is a decision rather than drift — the codebase now has two conventions for wire shapes and no rule for which applies.

**Fix:** Either add `adaptPoll`/`adaptQuery` beside `adaptEvent`, or amend `CLAUDE.md` to state the actual rule (e.g. "channel and notification payloads stay snake_case").

### IN-03: Stale model comment claims rate limiting is this phase's job

**File:** `backend/app/models/__init__.py:1121-1123`

**Issue:** `EventQuery`'s docstring says "Rate limiting on submissions is CHAT-03's Phase 8 concern, not a schema constraint." Phase 8 has now shipped without it, and 08-CONTEXT:113 records it as resolved out-of-scope. The comment now points a future reader at a phase that is done. Separately, `submit_query` has no throttle of any kind and the app has no rate-limiting infrastructure at all, so a registrant can enqueue unbounded 1000-character questions into the team's work queue — accepted risk given no live deployment target, but worth carrying forward.

**Fix:** Update the comment to `"Rate limiting on submissions is deferred (08-CONTEXT, no live deployment target)."`

### IN-04: `list_polls` answers 200 `[]` for a nonexistent activity while every sibling route 404s

**File:** `backend/app/services/channel_service.py:88-99`

**Issue:** `create_poll`, `cast_vote` and `submit_query` all call `_activity_or_404` first; the team-gated routes get a 404 from `activity_scoped`. `list_polls` queries `filter_by(activity_id=...)` on a garbage id and returns an empty list with 200. A client cannot distinguish "this event has no polls" from "this event does not exist".

**Fix:** Resolved for free by the guard change in CR-02.

### IN-05: Commented-out speculative markup left in `ManageEvent.tsx`

**File:** `frontend/src/pages/ManageEvent.tsx:243-247`

**Issue:** A five-line comment describing a merge decision about `EventAnnouncementsModal` and a hypothetical Broadcast button ("we can render it if activeBroadcastEventId is set, assuming it's available"). `activeBroadcastEventId` is declared at line 31 and never read anywhere else, so the state hook and its setter are dead alongside the comment. Pre-existing rather than introduced by Phase 8, but it sits in a reviewed file and the dead `useState` is a real unused binding.

**Fix:** Delete the comment block and the unused `activeBroadcastEventId` state, or wire the button.

---

_Reviewed: 2026-08-24_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
