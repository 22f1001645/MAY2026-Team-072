# Phase 5: Post-Acceptance Pipeline (Design → Campaign → Live → Workspace) — Pattern Map

**Mapped:** 2026-08-15
**Files analyzed:** 24 (13 new backend/test, 11 new/modified frontend)
**Analogs found:** 17 exact-or-role-match / 24 — 4 partial, 3 **no analog (new shape)**

> **Verification note.** Every excerpt below was read from disk this session. The three negative
> results RESEARCH.md recorded were re-run and **all three confirmed**:
> `grep -rn "onBlur" frontend/src/` → 0 matches; `grep -rni "moveUp\|moveDown\|reorder" frontend/src/` → 0 matches;
> `grep -rn "FormData" frontend/src/` → 0 matches.
> `ls backend/app/controllers/` and `ls backend/app/services/` confirm **no** `org_profile_controller.py`,
> `upload_controller.py`, `url_safety.py`, `org_profile_service.py`. `grep -n "Textarea" frontend/src/components/ui.tsx` → 0 matches.
> **Phase 4 is not on disk.** Any row citing a Phase-4 artifact is marked accordingly and given a
> today-executable fallback analog.

---

## File Classification

### Backend — new

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `backend/app/controllers/schedule_controller.py` | controller | CRUD / request-response | `backend/app/controllers/proposal_controller.py` | **exact** |
| `backend/app/controllers/campaign_controller.py` | controller | CRUD + file-I/O + transform | `backend/app/controllers/proposal_controller.py` | **exact** (except the poster multipart route — see § No Analog #2) |
| `backend/app/controllers/task_controller.py` | controller | CRUD / request-response | `backend/app/controllers/proposal_controller.py` | **exact** |
| `backend/app/services/schedule_service.py` | service | CRUD + position renumber | `backend/app/services/proposal_service.py:219-256` | **role-match** |
| `backend/app/services/campaign_service.py` | service | singleton upsert + transform | `backend/app/services/settings_service.py:13-21` | **role-match** |
| `backend/app/services/task_service.py` | service | CRUD | `backend/app/services/proposal_service.py` | **role-match** |
| `backend/app/services/attendance_service.py` (MOD) | service | guard insert | itself, `:114-138` | **exact** |
| `backend/app/constants.py` (MOD) | config | static reference data | `backend/app/constants.py:136-152` | **exact** |
| `backend/app/schemas/__init__.py` (MOD) | validation | request-response | `backend/app/schemas/__init__.py:93-99` | **exact** |
| `backend/app/controllers/__init__.py` (MOD) | config | registration list | itself, `:3-29` | **exact** |
| `backend/tests/test_event_schedule.py` | test | integration | `backend/tests/test_proposal_collaboration.py:1-75` | **exact** |
| `backend/tests/test_campaign_package.py` | test | integration + mocked vendor | `backend/tests/test_proposal_collaboration.py:1-75` | **role-match** (no mocked-vendor analog exists anywhere in `backend/tests/`) |
| `backend/tests/test_activity_tasks.py` | test | integration | `backend/tests/test_proposal_collaboration.py:1-75` | **exact** |

### Frontend — new / modified

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `frontend/src/lib/api.ts` (MOD) | service (wire seam) | request-response | itself, `:277-300` | **exact** (JSON routes) / **none** (poster multipart — § No Analog #2) |
| `frontend/src/lib/queries.ts` (MOD) | hook | server cache | `frontend/src/lib/queries.ts:145-162` | **exact** |
| `frontend/src/pages/CampaignBuilder.tsx` | page | CRUD form | `frontend/src/pages/ProposalNew.tsx` | **role-match** |
| `frontend/src/pages/KanbanWorkspace.tsx` | page | CRUD board | `frontend/src/pages/ManageEvent.tsx` | **role-match** |
| `frontend/src/components/KanbanBoard.tsx` | component | CRUD board | `ManageEvent.tsx` tasks tab (mock-backed) | **partial** |
| `frontend/src/components/PipelineStepper.tsx` | component | presentational | — | **none** (§ No Analog #3) |
| `frontend/src/components/ScheduleRow.tsx` | component | per-field auto-save | `ProposalNew.tsx:228-262` for *layout only* | **partial** (§ No Analog #1) |
| `frontend/src/components/PresetAccordion.tsx` | component | read-only + populate | `ProposalNew.tsx:261-265` (`+ Add …` ghost button) | **partial** |
| `frontend/src/components/MailTemplateEditor.tsx` | component | transform + edit | `ProposalNew.tsx:215-219` (raw `<textarea>`) | **role-match** |
| `frontend/src/components/RegistrationLinkCard.tsx` | component | clipboard | `frontend/src/pages/EventDetail.tsx:325-337` | **exact** |
| `frontend/src/components/PushLiveGate.tsx` | component | mutation + confirm dialog | `ManageEvent.tsx:44-48` + `ui.tsx` `Dialog` | **role-match** |
| `frontend/src/components/PosterUpload.tsx` | component | file-I/O | — | **none** (§ No Analog #2) |
| `frontend/src/__tests__/no-kanban-polling.test.ts` | test | source scan | `frontend/src/__tests__/no-por-literals.test.ts` | **exact** |

---

## Pattern Assignments

### `backend/app/controllers/{schedule,campaign,task}_controller.py` (controller, request-response)

**Analog:** `backend/app/controllers/proposal_controller.py` — read in full this session.

**Imports + blueprint declaration** (`proposal_controller.py:1-22`):

```python
from flask import Blueprint, g, jsonify, request

from ..errors import ApiError
from ..models import ActivityCollaborator
from ..rbac import (
    admin_required,
    auth_required,
    can_manage_activity_required,
    can_manage_org,
    organiser_required,
)
from ..repositories.repos import ActivityRepository, OrgRepository
from ..schemas import (
    CollabRespondSchema,
    DecisionSchema,
    ProposalSchema,
    ReassignMeetupHeadSchema,
    ReportSchema,
)
from ..services import proposal_service

proposal_bp = Blueprint("proposals", __name__, url_prefix="/api/v1")
```

Load-bearing: **`url_prefix="/api/v1"` lives on the blueprint**, so routes are declared as
`"/activities/<activity_id>/schedule"`, never `"/api/v1/activities/..."`.

**Guard + route pattern — copy verbatim** (`proposal_controller.py:118-130`):

```python
@proposal_bp.post("/activities/<activity_id>/reassign-meetup-head")
@can_manage_activity_required
def reassign_meetup_head(activity_id):
    """PROPOSAL-05: reassign Meetup Head to any user, by proposer or admin.

    Guard: can_manage_activity covers the proposer (organiser_id), all team members,
    org POR holders, and admin — the full set of people who legitimately manage the
    event. The campaign-live gate in the service is a Phase 5 stub."""
    data = ReassignMeetupHeadSchema().load(request.get_json() or {})
    result = proposal_service.reassign_meetup_head(
        g.activity, data["new_meetup_head_user_id"], g.current_user
    )
    return jsonify(result), 200
```

Four properties the planner must preserve:
1. **The URL param must be named `activity_id`.** `activity_scoped(predicate, param="activity_id")`
   reads `kwargs.get(param)` [`backend/app/rbac.py:314, 327`]. Any other name → `activity is None` → 404 for everyone.
2. The guard leaves the loaded row on `g.activity` [`rbac.py:333`]. **Services take the object, never re-query by id.**
3. Schema `.load()` → service → `jsonify(...), status`. **No `db.session` appears anywhere in `proposal_controller.py`** (verified: 0 matches in the file).
4. `@can_manage_activity_required` for all schedule/campaign/task mutations; `@meetup_head_required` for push-live only.

**Ready-made guards** (`backend/app/rbac.py:366-369`, verbatim):

```python
can_manage_activity_required = activity_scoped(can_manage_activity)
can_participate_in_activity_required = activity_scoped(can_participate_in_activity)
meetup_head_required = activity_scoped(is_meetup_head)
can_manage_org_required = org_scoped(can_manage_org)
```

**Error raising** (`proposal_controller.py:102-111`) — inline 404/403 when a guard cannot apply:

```python
    if not collab:
        raise ApiError("Collaboration invite not found", "not_found", 404)
    ...
        raise ApiError(
            "Authority over the collaborating organisation is required",
            "forbidden",
            403,
        )
```

---

### `backend/app/controllers/__init__.py` (MOD — config)

**Analog:** itself. **Two edits per new controller**, and the file carries a comment that is the receipt for having got this wrong once (`:14-29`):

```python
from .settings_controller import settings_bp

ALL_BLUEPRINTS = [
    auth_bp,
    # auth_controller contributes TWO blueprints — every other controller below
    # contributes exactly one, and that asymmetry is precisely why this entry was
    # missed and the admin override endpoint 404'd.
    admin_auth_bp,
    ...
    settings_bp,
]
```

Currently **11 entries, 10 imports**. Phase 5 adds three of each.

---

### `backend/app/services/campaign_service.py` (service, singleton upsert)

**Analog:** `backend/app/services/settings_service.py` — the **entire file is 21 lines** and is the codebase's only find-or-create shape:

```python
# backend/app/services/settings_service.py:13-21 — verbatim
def update_recognition_points(data: dict) -> dict:
    setting = SystemSetting.query.filter_by(key="recognition_points").first()
    if not setting:
        setting = SystemSetting(key="recognition_points", value_json=data)
        db.session.add(setting)
    else:
        setting.value_json = data
    db.session.commit()
    return setting.value_json
```

`_get_or_create_campaign(activity)` copies this shape but reads `activity.campaign` (the
`uselist=False` backref) instead of a `filter_by` — the guard already loaded the Activity onto `g.activity`.

**Constant-import discipline** — `proposal_service.py:1-23` imports **22 constants by name**; not one enum
value is restated as a bare string:

```python
from ..constants import (
    ACTIVITY_FEE_INR,
    ...
    COLLAB_ACCEPTED,
    ...
    TEAM_ROLE_MEETUP_HEAD,
)
```

Phase 5 imports `CAMPAIGN_LIVE`, `TASK_TODO`, `FORM_FIELD_TYPES`, `COLLAB_ACCEPTED`, `ACTIVITY_FEE_INR` the same way.

**Existing Phase-5 stub to fill** — `proposal_service.py:204-217` already names the exact `ApiError` shape
the `assert_editable` chokepoint should raise:

```python
    The live-campaign gate (cannot reassign after the campaign goes live) is a
    no-op stub — the Campaign model lands in Phase 5 (CAMPAIGN-06). Fill this
    stub when that model exists:

        campaign = Campaign.query.filter_by(activity_id=activity.id).first()
        if campaign and campaign.status == CAMPAIGN_LIVE:
            raise ApiError("Cannot reassign Meetup Head after campaign goes live",
                           "campaign_live", 409)
```

The stub's marker sits at `proposal_service.py:227` (`# Phase 5 live-campaign gate — stub intentionally left as no-op until Phase 5.`). **Phase 5 should replace it with a call to `campaign_service.assert_editable(activity)`.**

---

### `backend/app/services/attendance_service.py` (MOD — TEAM-04 crew guard)

**Analog:** itself. Current state, verbatim (`:114-127`):

```python
def award_volunteer_points(activity_id: str, user_id: str, role_name: str, organiser) -> dict:
    """FR-G3 — Award volunteer contribution points (20 points) for an assigned role."""
    activity = ActivityRepository.by_id(activity_id)
    if not activity:
        raise ApiError("Event not found", "event_not_found", 404)

    db.session.add(
        ContributionPoint(
            user_id=user_id,
            activity_id=activity_id,
            action="volunteered",
            points=get_recognition_points()["volunteered"],
        )
    )
```

Confirmed: **there is no membership check of any kind between the 404 and the write.** The new guard goes
immediately after the 404, before the first `db.session.add`. Do **not** change the route decorator —
`("POST", "/api/v1/events/<activity_id>/volunteer")` is a frozen `LEGACY_COARSE_ROUTES` entry.

---

### `backend/app/schemas/__init__.py` (MOD — validation)

**Analog:** `AcademicStatusSchema` (`:93-99`), whose docstring *is* the convention:

```python
class AcademicStatusSchema(Schema):
    """AUTH-04 self-confirmation. The allowlists are imported, never restated —
    a third copy of these enums is how the UI, the schema and the service drift
    apart."""

    academic_level = fields.Str(required=True, validate=validate.OneOf(ACADEMIC_LEVELS))
    academic_status = fields.Str(required=True, validate=validate.OneOf(ACADEMIC_STATUSES))
```

Nullable-partial-update shape for the PATCH schemas — `EditEventSchema` (`:85-90`):

```python
class EditEventSchema(Schema):
    title = fields.Str(load_default=None, allow_none=True)
    description = fields.Str(load_default=None, allow_none=True)
    starts_at = fields.DateTime(load_default=None, allow_none=True)
    venue = fields.Str(load_default=None, allow_none=True)
    update_message = fields.Str(load_default="", allow_none=True)
```

**Column widths to respect** (read from `models/__init__.py` this session): `ActivityTask.title` `String(200)` (`:536`),
`ActivityTask.status` `String(20)` (`:540`), `EventScheduleItem.time_block` `String(60)` (`:573`),
`EventScheduleItem.title` `String(200)` (`:574`), `EventScheduleItem.owner_label` `String(120)` (`:576`).

---

### Models — read, do not re-sort

Both Phase-5 models already ship a `to_dict()` and an **ordered backref**. A service that adds its own
`.order_by()` creates a second, divergent definition.

```python
# backend/app/models/__init__.py:545-551 — verbatim
    activity = db.relationship(
        "Activity",
        backref=db.backref(
            "tasks",
            cascade="all, delete-orphan",
            order_by="(ActivityTask.position, ActivityTask.created_at, ActivityTask.id)",
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "activity_id": self.activity_id,
            "title": self.title,
            "description": self.description,
            "assignee_id": self.assignee_id,
            "deadline": _iso(self.deadline),
            "status": self.status,
            "position": self.position,
        }
```

Identical shape at `:579-586` (`schedule_items`) with `to_dict()` at `:588-598`.
**Therefore `return [i.to_dict() for i in activity.schedule_items]` satisfies the ordering criteria with zero query code.**

---

### `backend/tests/test_{event_schedule,campaign_package,activity_tasks}.py` (test, integration)

**Analog:** `backend/tests/test_proposal_collaboration.py:1-75`.

**Module header + local seed helpers** (verbatim, `:1-70`):

```python
"""Phase 3 tests: Proposal Collaboration, Team Roster & Budget Guardrails.

Covers: PROPOSAL-00, PROPOSAL-01, ... BUDGET-01.

Test fixture design follows conftest.py conventions: user lookup by email,
org lookup by type, helper functions to obtain auth headers.
"""
...
def _token(client, email, password):
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    return res.get_json()["access_token"]


def _auth(client, email, password):
    return {"Authorization": f"Bearer {_token(client, email, password)}"}


def _seed_org(name, typ="society", city="Chennai"):
    o = Organisation(name=name, type=typ, city=city)
    _db.session.add(o)
    _db.session.commit()
    return o
```

**Fixtures already purpose-built for this phase** (`backend/tests/conftest.py:112-119`, `:148-154`):

```python
@pytest.fixture
def crew_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'crew@ekatva.os', 'crew12345')}"}


@pytest.fixture
def meetup_head_headers(client):
    return {"Authorization": f"Bearer {_token(client, 'head@ekatva.os', 'head12345')}"}
```

```python
# conftest.py:131-133 — the lookup convention, verbatim
# --- Lookup helpers for the seeded rows (01-05) -----------------------------
# Fetch by email or type rather than by insertion position, so a later addition
# to _seed_minimal cannot silently repoint one of these at a different row.
```

`crew_headers` is the **negative control** for AC-25 and `meetup_head_headers` the positive one.
Each new test file adds its own module-local `_seed_activity(...)` — `conftest.py` seeds zero activities.

---

### `frontend/src/lib/api.ts` (MOD — the one wire seam)

**Analog:** `api.confirmAcademicStatus` (`:277-283`), which is also the file's own statement of the rule:

```typescript
  /** User self-confirms their academic level + status (AUTH-04).
   *  Callers pass camelCase; this wrapper is the only module that knows the
   *  wire format, in the request direction as well as the response one. */
  confirmAcademicStatus: (academicLevel: string, academicStatus: string) =>
    request<any>('/auth/academic-status', {
      method: 'PATCH',
      body: JSON.stringify({ academic_level: academicLevel, academic_status: academicStatus }),
    }),
```

`request()` sets `Content-Type: application/json` unconditionally, attaches the Bearer token, does
double-submit CSRF on mutations, and unwraps `{error, code}` into `ApiError` (`api.ts:69-115`):

```typescript
  if (!res.ok) {
    const msg = body?.error || `Request failed (${res.status})`
    throw new ApiError(msg, body?.code || 'error', res.status, body?.details)
  }
```

**`body?.code` is what the UI keys off — there is no `reason` field anywhere.** Any SPEC criterion
written as `reason="X"` maps to `code === "X"`.

---

### `frontend/src/lib/queries.ts` (MOD — hooks)

**Query hook with the `enabled` gate** (`:14-15`):

```typescript
export const useEvent = (id?: string) =>
  useQuery({ queryKey: ['event', id], queryFn: () => api.event(id!), enabled: !!id })
```

**Mutation + invalidation** (`:153-162`):

```typescript
export const useUpdateEvent = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { id: string; payload: any }) => api.updateEvent(v.id, v.payload),
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ['event', id] })
      qc.invalidateQueries({ queryKey: ['events'] })
    },
  })
}
```

File header states the constraint (`:4-5`): *"server state lives here, never duplicated in UI state"*.
No `refetchInterval` exists anywhere in the file — AC-35 holds by default.

---

### `frontend/src/pages/KanbanWorkspace.tsx` + `components/KanbanBoard.tsx`

**Analog:** `frontend/src/pages/ManageEvent.tsx` — page scaffold is an exact match; the task board itself
is only a **partial** match because today's tasks are a local mock array.

**Page scaffold** (`ManageEvent.tsx:1-23, 33-47`):

```tsx
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TASKS } from '../lib/mock'
import { useCancelEvent, useEvent, useRoster, useUpdateEvent } from '../lib/queries'
import { Badge, Button, Card, Input, Progress, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx, daysUntil } from '../lib/format'

export default function ManageEvent() {
  const { id } = useParams()
  const { data: e, isLoading, isError, error } = useEvent(id)
  const [tasks, setTasks] = useState(TASKS) // v1 tasks are thin — local, not persisted
  ...
  if (isLoading) return <Loading label="Loading event…" />
  if (isError) return <ErrorState error={error} />
  if (!e) return <div>Event not found</div>
```

The `Loading` / `ErrorState` triple and `useParams()` → `useX(id)` are the exact shape both new pages copy.

**What does NOT transfer:** `const [tasks, setTasks] = useState(TASKS)` with `TASKS` from
`frontend/src/lib/mock.ts:317-323` — a 5-element array of `{id, label, assignee, done}`. That shape has
**no status column, no deadline, no position**, and is not persisted. Phase 5 replaces this consumer with
`useTasks(activityId)`. `ActivityTask`'s docstring names it explicitly (`models/__init__.py:528-531`):
*"Replaces the client-side mock array in frontend/src/lib/mock.ts, which was never persisted."*

**Authorization input** — `EventDetail.tsx:30`, verbatim, the only sanctioned form:

```tsx
  const canManage = role !== 'student' || capabilities?.manageableActivityIds?.includes(id!)
```

Never a POR string. `frontend/src/__tests__/no-por-literals.test.ts` fails the build on quoted POR
literals, and `"Coordinator"` is one of the scanned nine.

---

### `frontend/src/components/RegistrationLinkCard.tsx` (D-11 — a genuine one-for-one reuse)

**Analog:** `frontend/src/pages/EventDetail.tsx:325-337` — **exact**:

```tsx
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 w-full text-gold hover:text-gold border border-gold/20 hover:bg-gold/10"
                      onClick={() => {
                        const inviteUrl = `${window.location.origin}/events/${e.id}?ref=${currentUser?.id ?? ''}`
                        navigator.clipboard.writeText(inviteUrl)
                        addToast('Invite link copied! Earn points for every friend who registers.')
                      }}
                    >
                      Share invite link
                    </Button>
```

Copy the `onClick` shape and the `addToast` follow-up, but **read `registration_url` from the server
payload** rather than assembling it from `window.location.origin` — D-12 makes the URL shape a
published contract, so the server owns it.

---

### `frontend/src/components/MailTemplateEditor.tsx`

**Analog:** `ProposalNew.tsx:213-218` — the only multi-line text field in the codebase, and it is a **raw
`<textarea>` with hand-written classes**, because `ui.tsx` exports no `Textarea`:

```tsx
              onChange={(e) => set('description', e.target.value)}
              placeholder="What is it, who's it for, and why should someone give up their evening for it?"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none"
```

> **Phase-4 dependency.** UI-SPEC §1 lists `Textarea` as a "Phase 4 addition". **It is not on disk** —
> `grep -n "Textarea" frontend/src/components/ui.tsx` → 0 matches; the file exports `Input` (`:279`) and
> `Select` (`:356`) only. Until Phase 4 lands, either use the raw-`<textarea>` excerpt above or add the
> primitive by copying `Input`'s body (`ui.tsx:279-289`):
> ```tsx
> export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
>   return (
>     <input
>       className={cx(
>         'w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40',
>         className,
>       )}
>       {...props}
>     />
>   )
> }
> ```

---

### `frontend/src/__tests__/no-kanban-polling.test.ts`

**Analog:** `frontend/src/__tests__/no-por-literals.test.ts` — **exact**. Same directory, same
`import.meta.glob('?raw')` source-scan idiom, same "fail the build on a forbidden token" contract.
Copy its structure wholesale; swap the literal list for `refetchInterval` / `setInterval` / `WebSocket`.

---

## Shared Patterns

### Authorization (all activity-scoped routes)

**Source:** `backend/app/rbac.py:314-340, 366-369`
**Apply to:** every route in all three new controllers

```python
def activity_scoped(predicate, param="activity_id"):
    """Build a guard that loads the Activity named in the URL and asks `predicate`.

    404 before the predicate, 403 after it. ...
    The loaded Activity is left on `g.activity` so the view does not re-query."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = _load_current_user()
            activity_id = kwargs.get(param)
            activity = Activity.query.get(activity_id) if activity_id else None
            if activity is None:
                raise ApiError("Event not found", "not_found", 404)
            if not predicate(user, activity):
                raise ApiError(_denial(predicate), "forbidden", 403)
            g.activity = activity
            return fn(*args, **kwargs)
```

`meetup_head_required = activity_scoped(is_meetup_head)` has **no admin short-circuit and no
`can_manage_activity` fallback** — that absence is the requirement for CAMPAIGN-06.

### Error contract

**Source:** `backend/app/errors.py:19-23` (via `api.ts:109-112` on the client)
**Apply to:** every new service and every new test assertion

Services raise `ApiError(message, code, status, details)`; the envelope emits `{"error", "code"}` plus
`details` only when truthy. **There is no `reason` key.** Client-side, `ApiError.code` is what pages
branch on.

### Layering

**Source:** `backend/app/controllers/proposal_controller.py` (whole file — 0 occurrences of `db.session`)
**Apply to:** all three new controllers

Controller parses → Marshmallow `.load()` → service call → `jsonify(...), status`. Services are the only
writers and the only place `db.session.commit()` appears.

### Constant importing

**Source:** `backend/app/services/proposal_service.py:1-23`, `backend/app/schemas/__init__.py:93-96`
**Apply to:** every new service, schema, and test

Import the enum constant; never restate `"live"`, `"todo"`, `"text"` as a bare string. The
`AcademicStatusSchema` docstring names restating an enum as the drift mechanism.

### Frontend authorization input

**Source:** `frontend/src/pages/EventDetail.tsx:30`
**Apply to:** `CampaignBuilder.tsx`, `KanbanWorkspace.tsx`, `PushLiveGate.tsx`

`capabilities?.manageableActivityIds?.includes(id!)` — never a POR literal.
Note: `manageableActivityIds` gates *management*; it does **not** tell you who the Meetup Head is.
D-07's disabled-button state needs a separate server-supplied flag (e.g. `is_meetup_head` on the
campaign payload) — no existing client-side analog computes Meetup Head identity.

### Page scaffold

**Source:** `frontend/src/pages/ManageEvent.tsx:11-23`
**Apply to:** both new pages

```tsx
  const { id } = useParams()
  const { data: e, isLoading, isError, error } = useEvent(id)
  ...
  if (isLoading) return <Loading label="Loading event…" />
  if (isError) return <ErrorState error={error} />
  if (!e) return <div>Event not found</div>
```

---

## No Analog Found

These have **no close match in the codebase**. The planner should size them as new shapes and use
RESEARCH.md's patterns rather than a codebase excerpt.

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `frontend/src/components/ScheduleRow.tsx` — the **blur-save half** | component | per-field auto-save | **`grep -rn "onBlur" frontend/src/` → zero matches, re-verified this session.** D-03 cites "the ProposalNew.tsx field pattern"; `ProposalNew.tsx` is an `onChange`-into-local-state form with one submit at the end. There is no save-on-blur, no per-field saving indicator, and no revert-on-error anywhere. UI-SPEC E2's contract (`"Saving…"` fade + `addToast("Failed to save","error")` + revert to last-saved) is **entirely new code**. |
| `frontend/src/components/ScheduleRow.tsx` — the **reorder half** | component | index swap | **`grep -rni "moveUp\|moveDown\|reorder" frontend/src/` → zero matches.** D-01 cites the `ProposalNew.tsx` budget-row pattern, which is **add/remove only** — `setLines([...lines, {…}])` at `:262-264` and `setLines(lines.filter((x) => x.id !== l.id))` at `:250`. **There is no index swap.** What genuinely transfers is the repeating-row *layout* and the `+ Add …` ghost button (below). |
| `frontend/src/components/PosterUpload.tsx` + the `api.ts` multipart branch | component / service | file-I/O | **`grep -rn "FormData" frontend/src/` → zero matches.** `_rawRequest` hard-sets `'Content-Type': 'application/json'` (`api.ts:73`), which breaks multipart boundaries — a new branch is required. Server side, `upload_dir()` / `upload_controller.py` / `url_safety.py` are **Phase 4 (planned, not on disk)**: `ls backend/app/controllers/` shows 10 controllers, none of them upload-related. **Nearest analog that exists today: none.** This is the phase's largest greenfield slice. |
| `frontend/src/components/PipelineStepper.tsx` | component | presentational | No stepper, wizard, or multi-step progress indicator exists. `ui.tsx` exports `Progress` (a horizontal bar) and `Badge`, which are the closest primitives but not the shape. Build from UI-SPEC §2.1 directly. |
| `backend/app/services/campaign_service.py` — the **LLM call** | service | transform | No `google-genai` call site, no lazy-import-vendor pattern, and no mocked-vendor test fixture exists anywhere in `backend/`. `google-genai` is **absent from `backend/requirements.txt`** and `GEMINI_API_KEY` absent from `config.py`. Analog would be **Phase 4 plan 04-05 (planned, not on disk)**. Use RESEARCH.md § Pattern 3 verbatim. |
| `backend/app/services/campaign_service.py` — `brand_kit_for(org)` | service | read | **Phase 4 (planned, not on disk)** — no `org_profile_service.py` in `backend/app/services/` (verified by `ls`). The `BrandKit` **model** does exist (`models/__init__.py:182-211`) with a single `voice_tone` column, so a Phase-5-local reader over `activity.org.brand_kit` is executable today if Phase 4 slips. |
| `backend/tests/test_blueprint_registration.py` | test | structural | Not in `backend/tests/` (verified by `ls` — 24 test files, none named that). **Phase 4 plan 04-01 (planned, not on disk).** Phase 5 adds three blueprints — the largest single-phase addition — so if Phase 4 slips, Phase 5 must create this file. |

### The genuinely reusable half of D-01/D-02/D-10

`ProposalNew.tsx:228-265` — repeating-row layout, per-row delete button, and the `+ Add …` ghost button.
This is the *layout* analog for `ScheduleRow`, the form-field rows, and D-10's inline add-task row:

```tsx
            {lines.map((l) => (
              <div key={l.id} className="flex gap-2">
                <input
                  value={l.label}
                  onChange={(e) =>
                    setLines(lines.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Budget line (e.g. Transport)"
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none"
                />
                <button
                  type="button"
                  aria-label={`Remove budget line ${l.label || ''}`.trim()}
                  onClick={() => setLines(lines.filter((x) => x.id !== l.id))}
                  className="grid w-9 place-items-center rounded-lg border border-white/10 text-graytext-mid hover:border-red-400/40 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setLines([...lines, { id: Date.now(), label: '', amount: '' }])}
            className="mt-3 text-[14px] font-semibold text-teal hover:text-teal-accent"
          >
            + Add budget line
          </button>
```

Note the `aria-label` on the icon button — UI-SPEC §7 requires the same on the Up/Down controls.

---

## Additional Verified Constraints for the Planner

1. **`Badge` accepts only `children` and `tone`** (`ui.tsx:161-186`) — no `onClick`, no `className`.
   D-09's clickable status pill cannot be a bare `Badge`. `Select` **does** accept `className`
   (`ui.tsx:356-387`) and is the better base.
2. **Route-shape mismatch.** UI-SPEC §3/§4 specify `/activities/:id/campaign` and
   `/activities/:id/workspace`, but every existing organiser route in `App.tsx:112-114` is
   `/events/:id/manage`, `/events/:id/expenses`, `/events/:id/checkin`. The planner must pick one and
   note it; the *API* prefix is `/activities/<activity_id>/…`, the *client* prefix today is `/events/:id/…`.
3. **`text-danger` is not a Tailwind token** — `Badge`'s danger tone resolves to `text-red-300`
   (`ui.tsx:174`). Use `text-red-300` directly.
4. `backend/app/services/settings_service.py` is **21 lines total** — it is the whole singleton-upsert
   analog, not an excerpt from a larger file.

---

## Metadata

**Analog search scope:** `backend/app/{controllers,services,schemas,models,rbac.py,constants.py,errors.py}`,
`backend/tests/`, `frontend/src/{pages,components,lib,__tests__}`
**Files scanned:** 22 opened with Read/targeted reads; 6 directory listings; 5 grep sweeps
**Pattern extraction date:** 2026-08-15
