# Phase 8 Research: Event Announcements, Polls & Queries

**Researched:** 2026-08-23
**Phase:** 08 — Event Announcements, Polls & Queries
**Requirements:** CHAT-01, CHAT-02, CHAT-03, CHAT-04

## RESEARCH COMPLETE

---

## 1. API Endpoint Design

All new endpoints follow the `registration_controller.py` blueprint pattern (`url_prefix="/api/v1"`). A new `channel_controller.py` is recommended to keep the file manageable (registration_controller.py is already 103 lines).

### New blueprint: `channel_bp` (prefix: `/api/v1`)

#### Polls (CHAT-01)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/events/<id>/polls` | `can_manage_activity_required` | Create a poll (organiser only) |
| GET | `/events/<id>/polls` | `auth_required` + registration check | List polls with vote counts + caller's vote |
| POST | `/events/<id>/polls/<poll_id>/vote` | `auth_required` + registration check | Cast vote (DB constraint enforces once) |
| PATCH | `/events/<id>/polls/<poll_id>/close` | `can_manage_activity_required` | Close a poll manually |

**Create poll request body:**
```json
{ "question": "...", "options": ["Option A", "Option B", "Option C"], "closes_at": null }
```

**List polls response shape (per poll):**
```json
{
  "id": "...",
  "question": "...",
  "options": ["Option A", "Option B"],
  "status": "open",
  "created_by": "...",
  "vote_counts": [5, 3],
  "my_vote": 0
}
```
- `vote_counts` — array parallel to `options`, each element is the vote count for that index
- `my_vote` — the `option_index` the caller voted, or `null` if they have not voted

**Vote request body:**
```json
{ "option_index": 1 }
```

Catch `IntegrityError` on the DB insert (from `uq_poll_vote`) and return `409` with `{"error": "already_voted"}` — same pattern as existing double-registration guard.

**Close poll:** No body needed. Sets `status = POLL_CLOSED`.

#### Queries/Q&A (CHAT-02)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/events/<id>/queries` | `auth_required` + registration check | Submit a query (registrant) |
| GET | `/events/<id>/queries` | `can_manage_activity_required` | List all queries (organiser/team view) |
| GET | `/events/<id>/queries/mine` | `auth_required` + registration check | List caller's own queries + responses |
| POST | `/events/<id>/queries/<query_id>/respond` | `can_manage_activity_required` | Team responds to a query |

**Submit query request body:**
```json
{ "body": "Will meals be vegetarian?" }
```

**Respond request body:**
```json
{ "response_body": "Yes, all meals will be vegetarian." }
```

**Query response shape (team view):**
```json
{
  "id": "...",
  "user_id": "...",
  "body": "Will meals be vegetarian?",
  "status": "open",
  "response_body": null,
  "responded_by": null,
  "responded_at": null,
  "at": "2026-08-23T18:00:00Z"
}
```
On respond: set `status = QUERY_ANSWERED`, `responded_by = current_user.id`, `responded_at = utcnow()`.

**Registration-window guard (CHAT-03):**
Reject POST `/queries` and POST `/polls/<id>/vote` when `activity.status` is NOT `EVENT_LIVE` (constant: `"live"` from `constants.py:256`). Return `409` with `{"error": "registration_window_closed", "message": "Posting to this event's channel is no longer available."}`.

The condition: `activity.status != EVENT_LIVE` blocks channel writes. Note: announcements and poll creation by organisers (`can_manage_activity_required`) are exempt from this gate since organiser access is not registration-window-scoped.

---

## 2. Marshmallow Schema Patterns

`backend/app/schemas/__init__.py` uses plain `marshmallow.Schema` subclasses with typed fields. No `@dataclass` or `pydantic`. Pattern from `BroadcastSchema` (L158-160):

```python
class BroadcastSchema(Schema):
    title = fields.Str(required=True)
    body = fields.Str(required=True)
```

**New schemas to add:**

```python
class PollCreateSchema(Schema):
    question = fields.Str(required=True, validate=validate.Length(min=5, max=300))
    options = fields.List(
        fields.Str(validate=validate.Length(min=1, max=100)),
        required=True,
        validate=validate.Length(min=2, max=6),  # at least 2, at most 6 options
    )
    closes_at = fields.DateTime(load_default=None, allow_none=True)


class PollVoteSchema(Schema):
    option_index = fields.Int(required=True, validate=validate.Range(min=0))


class QuerySubmitSchema(Schema):
    body = fields.Str(required=True, validate=validate.Length(min=5, max=1000))


class QueryRespondSchema(Schema):
    response_body = fields.Str(required=True, validate=validate.Length(min=1, max=2000))
```

Import `POLL_STATES`, `QUERY_STATES` constants if schema-level enum validation is needed (optional; service layer can validate).

---

## 3. TanStack Query Polling Pattern

Current `useAnnouncements` hook (queries.ts:276):
```typescript
export const useAnnouncements = (id?: string) =>
  useQuery({ queryKey: ['announcements', id], queryFn: () => api.announcements(id!), enabled: !!id })
```

No `refetchInterval` — so it does NOT currently auto-refresh. Phase 8 must add it.

**Correct pattern for 15s ± 3s jitter with background-tab pause:**

```typescript
// A shared utility — define once, reuse across channel hooks
const channelRefetchInterval = () => 15_000 + Math.random() * 6_000 - 3_000

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
```

**Also add `refetchInterval` to `useAnnouncements`** (CHAT-04 applies to announcements too):
```typescript
export const useAnnouncements = (id?: string) =>
  useQuery({
    queryKey: ['announcements', id],
    queryFn: () => api.announcements(id!),
    enabled: !!id,
    refetchInterval: channelRefetchInterval,
    refetchIntervalInBackground: false,
  })
```

**Key notes:**
- `refetchInterval` accepts a function — each refetch schedules a NEW jitter interval, not a fixed one. This means the interval randomizes on every poll cycle, preventing thundering-herd when multiple tabs open the same event.
- `refetchIntervalInBackground: false` is a TanStack Query v5 option that pauses polling when the browser tab loses focus (via `document.visibilityState`). This is built-in; no extra `visibilitychange` listeners needed.
- `Math.random() * 6000 - 3000` gives [-3000, +3000] range, so effective interval is [12s, 18s].

---

## 4. Vote Count Aggregation

**Model relationships:**
- `EventPoll` has `votes = db.relationship("EventPollVote", back_populates="poll", cascade="all, delete-orphan")`
- `EventPollVote` has `option_index = db.Column(db.Integer)`
- `EventPoll.options` is a JSON array of strings

**Recommended approach — Python list comprehension (Option B):**

For meetup scale (<200 voters), a Python comprehension that uses the already-loaded ORM relationship is simpler than raw SQL and avoids a second DB round-trip:

```python
def poll_with_counts(poll: EventPoll, viewer_id: str) -> dict:
    d = poll.to_dict()
    n_options = len(poll.options)
    d["vote_counts"] = [
        sum(1 for v in poll.votes if v.option_index == i)
        for i in range(n_options)
    ]
    user_vote = next((v.option_index for v in poll.votes if v.user_id == viewer_id), None)
    d["my_vote"] = user_vote
    return d
```

This uses the ORM lazy-load (or eager-load if specified). For the list-all-polls endpoint, add `options=joinedload(EventPoll.votes)` to avoid N+1:

```python
polls = EventPoll.query.filter_by(activity_id=activity_id)\
    .options(joinedload(EventPoll.votes))\
    .order_by(EventPoll.created_at.desc())\
    .all()
```

**Do NOT use raw SQL GROUP BY for this phase** — it adds complexity with no performance benefit at meetup scale. The ORM approach is testable, debuggable, and consistent with the codebase.

---

## 5. Registration Window Guard

**Activity status constants** (constants.py lines 255-259):
```python
EVENT_UPCOMING = "upcoming"
EVENT_LIVE = "live"
EVENT_COMPLETED = "completed"
EVENT_ARCHIVED = "archived"
EVENT_CANCELLED = "cancelled"
```

**Registration-window = activity.status == EVENT_LIVE**

The channel window is "open" only when the event is `"live"`. Writes (query submissions, poll votes) from registrants should be blocked when status is NOT `"live"`. Implementation in service:

```python
from ..constants import EVENT_LIVE
from ..errors import ApiError

def _assert_channel_open(activity):
    if activity.status != EVENT_LIVE:
        raise ApiError(
            "Posting to this event is no longer available.",
            "registration_window_closed",
            409,
        )
```

Call `_assert_channel_open(activity)` at the top of `submit_query()` and `cast_vote()` in `channel_service.py`.

**Note:** Organiser actions (create poll, close poll, respond to query) are NOT gated by this check — the organiser needs to be able to respond to queries even after the event ends.

---

## 6. Frontend Component Structure

### Current EventChat placement

EventChat is opened via a URL search param: `setSearchParams(prev => { prev.set('chat', e.id) })` (EventDetail.tsx:499). This opens a modal/drawer overlay, NOT an inline section. The component itself is imported but the render is portal-based.

**Polls + Q&A placement decision**: A new `EventChannelSection` component renders INLINE below the EventChat button on the registered-attendee card (NOT as a modal). This gives registrants immediate visibility without clicking the chat button.

### Recommended component structure

```
frontend/src/components/
├── EventChannelSection.tsx    # Collapsible wrapper with Polls + Q&A sub-sections
├── PollCard.tsx               # Single poll display: question, options, vote button, results bar
└── QuerySection.tsx           # Q&A: submit form (registrant) + thread view (my queries + responses)
```

**In EventDetail.tsx** — add `EventChannelSection` after the EventChat button, inside the registered-attendee block (around line 507):

```tsx
{registered && !isWaitlisted && !isPast && (
  <div className="mt-4">
    <EventChannelSection activityId={e.id} canManage={canManage} />
  </div>
)}
```

**`EventChannelSection.tsx`** — collapsible outer wrapper with internal toggle between "Polls" and "Q&A" sub-sections:
```tsx
// Two sub-sections inside, always visible when expanded
// Uses usePolls + useMyQueries hooks
// Collapsible via a useState toggle, default: collapsed
```

**ManageEvent additions** — add `OrgQueriesPanel` component to ManageEvent page:
```tsx
// Uses useOrgQueries hook — shows all queries for the event
// Each query shows: registrant body, status badge, respond form (if open)
// Shows unanswered count badge on the section header
```

**Existing reusable UI components** (from `frontend/src/components/ui/`):
- `Card` — outer container for each poll and the Q&A section
- `Badge` — poll status (open/closed), query status (open/answered), unanswered count
- `Button` — vote button, close poll, submit query, respond
- `Progress` — can be adapted to show vote percentage bars in poll results

---

## 7. Key Risks / Gotchas

### Backend
1. **`uq_poll_vote` IntegrityError** — catch `sqlalchemy.exc.IntegrityError` (not `DatabaseError`) and return 409. The existing codebase uses `except IntegrityError` in registration_service — follow that pattern.
2. **`options` is a JSON column** — on SQLite, `db.JSON` serializes as text. `len(poll.options)` works in Python but do NOT pass raw SQL array functions against it.
3. **N+1 on poll list** — always use `joinedload(EventPoll.votes)` when listing polls; without it each poll fires a separate SELECT for votes.
4. **`to_dict()` on `EventPoll` does NOT include `vote_counts` or `my_vote`** — the service must add these; the model's `to_dict()` is intentionally minimal.
5. **`registration_controller.py` import cleanup** — `POST /broadcast` currently uses `@auth_required` (not `can_manage_activity_required`) and allows any registered attendee to post as an organiser — this is a PRE-EXISTING BUG that Phase 8 should NOT change (EventChat design intentionally keeps this). Document but do not fix.

### Frontend
6. **EventChat is a portal/modal overlay** — it opens when `?chat=<id>` is in the URL. The Polls + Q&A section is INLINE (not a portal). This is the correct distinction — do not confuse the two.
7. **`useAnnouncements` already fires in EventDetail.tsx line 39** but has no `refetchInterval`. Adding `refetchInterval` to the hook is safe — it is already enabled only when `currentUser` exists.
8. **`canManage` is derived from `viewFromPathname` + session** — pass it as a prop to `EventChannelSection` to gate poll creation and pass it to `useOrgQueries` (only fetch org query data when organiser).
9. **Type safety** — add `EventPoll`, `EventPollVote`, `EventQuery` TypeScript interfaces to `frontend/src/lib/types.ts` before writing the components. Without these, `poll.vote_counts[i]` will be typed as `any`.

### Validation Architecture (for Nyquist VALIDATION.md)
- Poll create: `options` array must have 2-6 items, each non-empty string
- Poll vote: `option_index` must be 0 <= option_index < len(poll.options), verified in service
- Query submit: `body` 5-1000 chars
- Query respond: `response_body` 1-2000 chars, query must be in `QUERY_OPEN` state
- All channel writes: activity must be `EVENT_LIVE` (for registrant actions)
