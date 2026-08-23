# Phase 8: Event Announcements, Polls & Queries — Plan

**Phase:** 08
**Status:** Ready to execute
**Requirements:** CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Depends on:** Phase 1 (RBAC, schemas, blueprints), Phase 5 (EventChat, campaign live state)

## Phase Goal

Add polls and a formal Q&A system to Ekatva OS event pages, sitting alongside the existing EventChat (open two-way chat, unchanged). Organisers create polls; registrants vote once and submit questions; team members respond. All channel reads auto-refresh every ~15 seconds using TanStack Query's `refetchInterval` with jitter, stopping when the browser tab is backgrounded.

## Architecture Decisions (from 08-CONTEXT.md)

- D-01: EventChat (free two-way chat) is kept AS-IS. Not modified.
- D-02: Polls + Q&A section is NEW, collapsible, inline below the EventChat button on EventDetail.
- D-04: Only team members (canManage) can create polls.
- D-05: One vote per registrant — enforced by existing `uq_poll_vote` DB unique constraint.
- D-08: Any registered attendee can submit a query.
- D-09: Any team member can respond to a query (single response per query).
- D-13/14: refetchInterval = 15000 ± 3000ms, refetchIntervalInBackground: false.
- D-15: Full-list refetch (no cursor pagination) — adequate for meetup scale.

## Wave Structure

### Wave 1 (Tracer — Backend channel service + poll endpoints)

**08-01-PLAN.md** — `channel_service.py` + poll endpoints tracer

### Wave 2 (Parallel, blocked on Wave 1)

**08-02-PLAN.md** — Query (Q&A) backend endpoints
**08-03-PLAN.md** — Frontend: TanStack polling + TypeScript types + API layer

### Wave 3 (Blocked on Wave 2)

**08-04-PLAN.md** — Frontend: PollCard + EventChannelSection + EventDetail integration
**08-05-PLAN.md** — Frontend: QuerySection (registrant) + OrgQueriesPanel (ManageEvent)

### Wave 4 (Blocked on Wave 3)

**08-06-PLAN.md** — Wiring, UAT smoke-test, registration-window guard

---

## 08-01-PLAN.md — Tracer: channel_service.py + poll API

**Type:** tracer
**Wave:** 1
**Requirement:** CHAT-01

**Scope:**
1. Create `backend/app/services/channel_service.py`
2. Create `backend/app/controllers/channel_controller.py` with blueprint `channel_bp` registered at `url_prefix="/api/v1"`
3. Register `channel_bp` in `backend/app/__init__.py`
4. Add `PollCreateSchema`, `PollVoteSchema` to `backend/app/schemas/__init__.py`
5. Implement poll CRUD endpoints (4 endpoints):

```
POST   /events/<id>/polls              → create_poll()     [can_manage_activity_required]
GET    /events/<id>/polls              → list_polls()      [auth_required]
POST   /events/<id>/polls/<pid>/vote   → cast_vote()       [auth_required]
PATCH  /events/<id>/polls/<pid>/close  → close_poll()      [can_manage_activity_required]
```

**`channel_service.py` functions:**

```python
def create_poll(activity_id: str, question: str, options: list, closes_at, current_user) -> EventPoll
def list_polls(activity_id: str, viewer_id: str) -> list[dict]  # includes vote_counts, my_vote
def cast_vote(activity_id: str, poll_id: str, option_index: int, current_user) -> dict
def close_poll(activity_id: str, poll_id: str, current_user) -> EventPoll
```

**Key implementation rules:**
- `list_polls`: use `options=joinedload(EventPoll.votes)` to avoid N+1; build `vote_counts` array in Python
- `cast_vote`: wrap INSERT in try/except `IntegrityError` → 409 `{"error": "already_voted"}`
- `cast_vote`: validate `option_index` is in range [0, len(poll.options)) — return 422 if out of range
- `cast_vote`: check `poll.status == POLL_OPEN` — return 409 `{"error": "poll_closed"}` if not
- `cast_vote`: call `_assert_channel_open(activity)` first (activity must be EVENT_LIVE)
- Poll response shape includes `vote_counts: [int, ...]` and `my_vote: int | null`

**Schemas to add:**

```python
class PollCreateSchema(Schema):
    question = fields.Str(required=True, validate=validate.Length(min=5, max=300))
    options = fields.List(
        fields.Str(validate=validate.Length(min=1, max=100)),
        required=True,
        validate=validate.Length(min=2, max=6),
    )
    closes_at = fields.DateTime(load_default=None, allow_none=True)

class PollVoteSchema(Schema):
    option_index = fields.Int(required=True, validate=validate.Range(min=0))
```

**Verification:**
- `curl -X POST /api/v1/events/<id>/polls` with organiser token returns 201 with poll id
- `curl -X GET /api/v1/events/<id>/polls` returns `vote_counts` array parallel to `options`
- `curl -X POST /api/v1/events/<id>/polls/<pid>/vote` twice returns 409 on second attempt
- `curl -X PATCH /api/v1/events/<id>/polls/<pid>/close` sets status to `"closed"`
- Non-team member attempting `POST /polls` returns 403

---

## 08-02-PLAN.md — Query/Q&A backend endpoints

**Type:** feature
**Wave:** 2 (parallel with 08-03)
**Requirement:** CHAT-02, CHAT-03

**Scope:** Add to `channel_controller.py` and `channel_service.py`:

```
POST   /events/<id>/queries               → submit_query()    [auth_required + reg check]
GET    /events/<id>/queries               → list_queries()    [can_manage_activity_required]
GET    /events/<id>/queries/mine          → my_queries()      [auth_required + reg check]
POST   /events/<id>/queries/<qid>/respond → respond_query()   [can_manage_activity_required]
```

**`channel_service.py` additions:**

```python
def submit_query(activity_id: str, body: str, current_user) -> EventQuery
def list_queries(activity_id: str) -> list[EventQuery]  # all queries, org view
def my_queries(activity_id: str, current_user) -> list[EventQuery]  # own queries only
def respond_query(activity_id: str, query_id: str, response_body: str, current_user) -> EventQuery
```

**Key rules:**
- `submit_query`: requires `registration_check` (RegistrationRepository.find must not be None); raise ApiError 403 if not registered
- `submit_query`: call `_assert_channel_open(activity)` — only EVENT_LIVE events accept new queries from registrants
- `respond_query`: check query.status == QUERY_OPEN; raise 409 if already answered; set responded_by, responded_at, status=QUERY_ANSWERED
- `my_queries`: filter `EventQuery.user_id == current_user.id` AND `activity_id`
- `list_queries`: order by `created_at DESC`; include respondent name in `responded_by` field if joined

**Schemas to add:**

```python
class QuerySubmitSchema(Schema):
    body = fields.Str(required=True, validate=validate.Length(min=5, max=1000))

class QueryRespondSchema(Schema):
    response_body = fields.Str(required=True, validate=validate.Length(min=1, max=2000))
```

**`_assert_channel_open` helper** (shared with poll vote):
```python
def _assert_channel_open(activity):
    if activity.status != EVENT_LIVE:
        raise ApiError(
            "Posting to this event is no longer available.",
            "registration_window_closed",
            409,
        )
```

**Verification:**
- Registered student can POST /queries and get 201
- Non-registered student gets 403 on POST /queries
- Team member can GET /queries and see all submissions
- Student can GET /queries/mine and only see their own
- Team member can POST /queries/<id>/respond → query status becomes "answered"
- Second respond attempt returns 409

---

## 08-03-PLAN.md — Frontend: TypeScript types + API layer + TanStack hooks

**Type:** feature
**Wave:** 2 (parallel with 08-02)
**Requirement:** CHAT-04

**Scope:**

### 1. TypeScript types (`frontend/src/lib/types.ts`)

Add interfaces:
```typescript
export interface EventPoll {
  id: string
  activity_id: string
  question: string
  options: string[]
  status: 'open' | 'closed'
  closes_at: string | null
  vote_counts: number[]
  my_vote: number | null
}

export interface EventQuery {
  id: string
  activity_id: string
  user_id: string
  body: string
  status: 'open' | 'answered'
  response_body: string | null
  responded_by: string | null
  responded_at: string | null
  at: string
}
```

### 2. API methods (`frontend/src/lib/api.ts`)

Add to the `api` object:
```typescript
polls: (id: string) => get<EventPoll[]>(`/events/${id}/polls`),
createPoll: (id: string, data: { question: string; options: string[] }) =>
  post(`/events/${id}/polls`, data),
castVote: (id: string, pollId: string, option_index: number) =>
  post(`/events/${id}/polls/${pollId}/vote`, { option_index }),
closePoll: (id: string, pollId: string) =>
  patch(`/events/${id}/polls/${pollId}/close`, {}),
myQueries: (id: string) => get<EventQuery[]>(`/events/${id}/queries/mine`),
orgQueries: (id: string) => get<EventQuery[]>(`/events/${id}/queries`),
submitQuery: (id: string, body: string) => post(`/events/${id}/queries`, { body }),
respondQuery: (id: string, queryId: string, response_body: string) =>
  post(`/events/${id}/queries/${queryId}/respond`, { response_body }),
```

### 3. TanStack Query hooks (`frontend/src/lib/queries.ts`)

```typescript
const channelRefetchInterval = () => 15_000 + Math.random() * 6_000 - 3_000

// Update existing useAnnouncements to add polling
export const useAnnouncements = (id?: string) =>
  useQuery({
    queryKey: ['announcements', id],
    queryFn: () => api.announcements(id!),
    enabled: !!id,
    refetchInterval: channelRefetchInterval,
    refetchIntervalInBackground: false,
  })

// New hooks
export const usePolls = (id?: string) =>
  useQuery({
    queryKey: ['polls', id],
    queryFn: () => api.polls(id!),
    enabled: !!id,
    refetchInterval: channelRefetchInterval,
    refetchIntervalInBackground: false,
  })

export const useMyQueries = (id?: string) =>
  useQuery({
    queryKey: ['queries', 'mine', id],
    queryFn: () => api.myQueries(id!),
    enabled: !!id,
    refetchInterval: channelRefetchInterval,
    refetchIntervalInBackground: false,
  })

export const useOrgQueries = (id?: string) =>
  useQuery({
    queryKey: ['queries', 'org', id],
    queryFn: () => api.orgQueries(id!),
    enabled: !!id,
    refetchInterval: channelRefetchInterval,
    refetchIntervalInBackground: false,
  })

export const useCreatePoll = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; question: string; options: string[] }) =>
      api.createPoll(v.id, v),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['polls', v.id] }),
  })
}

export const useCastVote = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; pollId: string; option_index: number }) =>
      api.castVote(v.id, v.pollId, v.option_index),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['polls', v.id] }),
  })
}

export const useClosePoll = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; pollId: string }) => api.closePoll(v.id, v.pollId),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['polls', v.id] }),
  })
}

export const useSubmitQuery = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; body: string }) => api.submitQuery(v.id, v.body),
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['queries', 'mine', v.id] }),
  })
}

export const useRespondQuery = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; queryId: string; response_body: string }) =>
      api.respondQuery(v.id, v.queryId, v.response_body),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['queries', 'org', v.id] })
    },
  })
}
```

**Verification:**
- TypeScript compiles with no errors on the new types/hooks
- `usePolls('fake-id')` in a test component fires the right URL
- `refetchInterval` function returns a value in [12000, 18000] range

---

## 08-04-PLAN.md — Frontend: PollCard + EventChannelSection + EventDetail wiring

**Type:** feature
**Wave:** 3 (blocked on 08-02, 08-03)
**Requirement:** CHAT-01

**Scope:**

### 1. `PollCard.tsx` (`frontend/src/components/PollCard.tsx`)

Props: `poll: EventPoll`, `activityId: string`, `canManage: boolean`

Behaviour:
- If `poll.my_vote === null` AND `poll.status === 'open'`: show vote buttons for each option
- If `poll.my_vote !== null` OR `poll.status === 'closed'`: show results (vote count bars)
- Vote count bar: `<Progress value={poll.vote_counts[i]} max={Math.max(...poll.vote_counts, 1)} />` + count label
- Organiser view: show "Close poll" button when `canManage && poll.status === 'open'`
- After voting: call `useCastVote`, then `invalidateQueries` shows updated counts
- Status badge: `<Badge tone="teal">Open</Badge>` / `<Badge tone="default">Closed</Badge>`
- Error state: catch 409 "already_voted" → show "Already voted" toast; catch 409 "poll_closed" → show "Poll is now closed" toast

### 2. `EventChannelSection.tsx` (`frontend/src/components/EventChannelSection.tsx`)

Props: `activityId: string`, `canManage: boolean`

Behaviour:
- Collapsible wrapper: `useState(false)` for `isOpen`; click header to toggle
- Header shows: "Polls & Q&A" title + unanswered-query count badge if `canManage`
- Two sub-sections (always visible when expanded):
  - **Polls section**: renders list of `<PollCard>` from `usePolls(activityId)`
  - **Q&A section**: renders `<QuerySection>` (from 08-05)
  - Organiser-only: "Create poll" form (question input + dynamic options array, 2-6 items)
- Loading state: skeleton/spinner while polls load
- Empty state: "No polls yet" / "No questions yet"

### 3. EventDetail.tsx integration

After line 507 (after the EventChat button block), add:

```tsx
{currentUser && registered && !isWaitlisted && !isPast && e.status !== 'cancelled' && (
  <div className="mt-4">
    <EventChannelSection activityId={e.id} canManage={canManage} />
  </div>
)}
```

Also add imports: `import EventChannelSection from '../components/EventChannelSection'`

**Verification:**
- EventDetail shows the collapsible "Polls & Q&A" section for registered users
- Poll voting updates counts immediately (optimistic or after invalidation)
- Non-registered users do NOT see the section
- Organiser sees "Create poll" form; non-organiser does not

---

## 08-05-PLAN.md — Frontend: QuerySection (registrant) + OrgQueriesPanel (ManageEvent)

**Type:** feature
**Wave:** 3 (parallel with 08-04, blocked on 08-02, 08-03)
**Requirement:** CHAT-02

**Scope:**

### 1. `QuerySection.tsx` (`frontend/src/components/QuerySection.tsx`)

Registrant-facing Q&A view (inside `EventChannelSection` for non-organisers):

- **Query submission form**: textarea (5-1000 chars) + submit button
  - On submit: call `useSubmitQuery` → invalidates `['queries', 'mine', id]`
  - Disable form while mutation is pending
- **My queries list**: renders from `useMyQueries(activityId)`
  - Each query shows: `body`, `status` badge (Open/Answered), `response_body` when answered
  - Empty state: "You haven't asked any questions yet."
- Auto-refreshes every ~15s via `useMyQueries` hook's `refetchInterval`

### 2. `OrgQueriesPanel.tsx` (`frontend/src/components/OrgQueriesPanel.tsx`)

Organiser-facing Q&A management view (in ManageEvent page):

- Uses `useOrgQueries(activityId)` — lists ALL queries for the event
- Section header: "Attendee Questions" + `<Badge>{unansweredCount}</Badge>` unanswered count
- Each query card shows:
  - Registrant user_id (or name if available), timestamp, body
  - Status: `<Badge tone="warn">Open</Badge>` / `<Badge tone="teal">Answered</Badge>`
  - If status == "open": respond textarea + submit button (calls `useRespondQuery`)
  - If status == "answered": shows `response_body` read-only
- Order: open queries first, answered queries after

### 3. ManageEvent.tsx integration

Add `OrgQueriesPanel` to ManageEvent.tsx as a new collapsible section (follow same pattern as existing sections like Roster, Tasks, Expenses):

```tsx
<section id="queries-section">
  <OrgQueriesPanel activityId={id} />
</section>
```

Add import: `import OrgQueriesPanel from '../components/OrgQueriesPanel'`

**Verification:**
- Registrant can submit a query and see it appear in "My questions" list
- Query shows as "Open" until team responds; then shows "Answered" with response
- Organiser can see all queries in ManageEvent, respond to open ones
- Unanswered count badge updates correctly

---

## 08-06-PLAN.md — Registration-window guard + wiring + smoke UAT

**Type:** feature
**Wave:** 4 (blocked on Wave 3)
**Requirement:** CHAT-03, CHAT-04

**Scope:**

### 1. Registration-window guard in channel_service.py

Verify `_assert_channel_open` is called correctly in:
- `cast_vote()` — only registrant channel writes are gated
- `submit_query()` — only registrant channel writes are gated

Organiser actions (create poll, close poll, respond query) are NOT gated.

### 2. Verify existing `useAnnouncements` polling update

Confirm `useAnnouncements` in `frontend/src/lib/queries.ts` now includes `refetchInterval: channelRefetchInterval` (added in 08-03). Verify it is used in both `EventDetail.tsx` and `EventChat.tsx` correctly.

### 3. End-to-end smoke test (manual UAT)

Test scenario using the running dev servers:

**Poll flow:**
1. Log in as organiser → navigate to a LIVE event → open ManageEvent
2. In EventDetail (organiser view) → expand Polls & Q&A section → create a poll with 3 options
3. Log in as registered student → navigate to same event → see poll in Polls & Q&A section
4. Vote on option 2 → see vote counts update
5. Vote again → get "Already voted" error
6. Log back in as organiser → close the poll → student sees "Closed" badge, no vote button

**Q&A flow:**
1. Student → submit a question "What time does it start?"
2. Organiser → ManageEvent → Attendee Questions → see the question
3. Organiser → respond "It starts at 10am"
4. Student → My questions → query shows "Answered" with response

**Polling (CHAT-04):**
1. Open event page in a background tab
2. With DevTools network panel open, confirm no API calls to /polls or /queries/mine while tab is backgrounded
3. Switch to foreground → confirm polling resumes within 15s

### 4. Commit docs

Update ROADMAP.md Phase 8 Plans section:
```
**Plans**: 6/6 plans executed
```

**Verification (success criteria cross-check):**
- SC1: ✅ Organiser creates polls, registrants vote once (uq_poll_vote enforces)
- SC2: ✅ Registrant submits query, team responds; my_queries shows only own queries
- SC3: ✅ `_assert_channel_open` returns 409 when event status != "live"
- SC4: Rate limiting deferred (ROADMAP research flag resolved: no live deployment target)
- SC5: ✅ refetchInterval ~15s with jitter, refetchIntervalInBackground: false
