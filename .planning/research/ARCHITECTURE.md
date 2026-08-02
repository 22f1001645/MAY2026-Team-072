# Architecture Research

**Domain:** Organiser-dashboard deepening inside an existing three-tier Flask 3 + React 18 SPA (Ekatva OS)
**Researched:** 2026-08-02
**Confidence:** HIGH for integration structure (grounded in a full read of the actual codebase) · MEDIUM for external library picks (QR scanning, LLM provider) · see Confidence Ledger at the end.

---

## Executive Position

The nine capabilities are **not nine equal-weight features**. Read structurally, they are:

- **2 shell changes with zero schema impact** (dashboard switcher, auth refresh) — these touch the same four frontend files and must ship together, first.
- **1 keystone data model** (activity-scoped team/task) that also forces the **single biggest missing abstraction in the codebase: resource-scoped authorization**. Today `organiser_required` is a global boolean. Chat, polls, tasks, campaign creator and timeline all need "is this person on *this* event's crew?" — a predicate that does not exist yet.
- **5 additive domain slices** (entity profile, timeline+feedback, progression-gating, chat+polls, QR check-in) that are mutually independent once the schema and the authorization predicates exist.
- **1 genuinely new architectural layer** (AI campaign creator), which introduces the first outbound third-party call in the system and therefore the first `integrations/` boundary.

The dominant constraint is not technical difficulty — it is **`.planning/PROJECT.md`'s "No Alembic yet"**. This milestone adds roughly **8 new tables and 12 new columns**. Under the current workflow every schema change means editing `models/__init__.py` and re-running a destructive `seed.py` across five developers' machines. That single fact should reorder the roadmap: **declare the entire new schema in one early phase, reseed once, then build feature slices against a frozen schema.** Naive per-feature ordering costs eight destructive reseeds.

---

## Existing Architecture (verified by reading the code)

Facts below are read directly from source, not inferred. They materially change several recommendations.

| Observed fact | File | Why it matters for this milestone |
|---|---|---|
| Routes are **not** role-gated. `AppShell` registers all 14 routes for every authenticated user; only `NAV[role]` in `Layout.tsx` is filtered. | `frontend/src/App.tsx:47-72`, `components/Layout.tsx:18-39,70` | The dashboard switcher is a **navigation-only** change. No router refactor needed. |
| `withPor()` collapses PORs into a single scalar `role` and hardcodes an organiser-POR set that has **already drifted** from the backend (missing `Deputy House Secretary`, `Web Admin`). | `frontend/src/lib/auth.tsx:20-38` vs `backend/app/constants.py:12-20` | Fix by having the server compute capabilities, not by patching the client list. |
| `@jwt.expired_token_loader` already returns a **distinct** `code: "token_expired"` (vs `"unauthorized"` for missing/invalid). | `backend/app/__init__.py:28-38` | The refresh interceptor gets a clean, already-existing signal to distinguish "refreshable" from "log out". No backend error-shape change needed. |
| `rbac.py` has exactly three decorators, all coarse. `organiser_required` grants access to **any** activity for **any** organiser-POR holder. `_load_current_user()` calls bare `verify_jwt_in_request()`. | `backend/app/rbac.py:34-62` | Bare `verify_jwt_in_request()` accepts access tokens only — the refresh endpoint cannot reuse these decorators. And team members (plain students) would be denied by `organiser_required`. |
| `AuditLog` is append-only and already records proposal submit/approve/changes/reject/revoke and report filing. | `models/__init__.py:392-409`, `services/proposal_service.py` | The event timeline is a **projection over AuditLog**, not a new table. |
| `Registration`, `Attendance`, `Expense` transitions do **not** write audit rows. | `registration_service.py`, `attendance_service.py`, `expense_service.py` | The timeline phase's real work is backfilling audit coverage. |
| `BudgetLine` is the established precedent for "0..N child rows owned by a parent, with `.to_dict()` on the child". | `models/__init__.py:211-224` | Social links and poll options should follow this shape, not JSON columns. |
| `Document(activity_id, url, deleted_at)` exists, is activity-scoped, soft-deletes, and is **currently unused by any controller**. | `models/__init__.py:377-389` | It is the natural home for AI-generated campaign artefacts. |
| `Expense.bill_name` stores a **filename string, not a file**. There is no blob storage anywhere in the system. | `models/__init__.py:304` | Poster *upload* has no storage backend. This is a real gap for the AI feature. |
| `api.orgs()` is called on **every search keystroke** in the header. | `components/Layout.tsx:88-92` | Org profile reads are a hot path — favour columns over joins on `Organisation`. |
| `ManageEvent.tsx` imports `TASKS` from `lib/mock.ts` and holds them in `useState`. Never persisted. | `pages/ManageEvent.tsx:3,14,163` | The team/task phase deletes this import; the UI shell already exists. |
| `HOUSE_META` is client-side hardcoded org metadata, Houses-only. | `pages/Orgs.tsx` | Entity-profile work replaces it with server data across all four org types. |
| Frontend has **no test setup**; backend has pytest. Stack is deliberately lean: no state library, no form library, no date library. | `frontend/package.json`, `backend/requirements.txt` | Every new npm dependency is a visible stack decision. Budget carefully: this milestone justifiably adds ~2 (QR generate, QR scan). |

---

## System Overview — Where the Nine Features Land

```
┌───────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND — React 18 SPA                                                       │
├───────────────────────────────────────────────────────────────────────────────┤
│  SHELL (lib/)                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  auth.tsx    │  │  api.ts      │  │ session.tsx  │  │ queries.ts   │        │
│  │ +activeRole  │  │ +refresh     │  │ ->activeRole │  │ +new hooks   │        │
│  │ +availRoles  │  │  interceptor │  │              │  │              │        │
│  │  ①           │  │  ②           │  │  ①           │  │  all         │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         └─────────────────┴─────────────────┴─────────────────┘                │
├───────────────────────────────────────────────────────────────────────────────┤
│  PAGES                                                                         │
│  Layout.tsx①  ManageEvent③  OrgProfile④  EventDetail⑤⑧  ProposalNew⑦          │
│  CheckIn⑨     MyRegistrations⑨  Campaign⑥   Timeline⑤                          │
└───────────────────────────┬───────────────────────────────────────────────────┘
                            │  fetch + Bearer(access) · JSON · {error,code} envelope
                            ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│  BACKEND — Flask 3                                                             │
├───────────────────────────────────────────────────────────────────────────────┤
│  CROSS-CUTTING: rbac.py                                    ← BIGGEST ADDITION  │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │ EXISTING: auth_required · admin_required · organiser_required          │    │
│  │ NEW:      refresh_required②                                            │    │
│  │           can_manage_activity(user, activity)      ③⑤⑥⑨               │    │
│  │           can_participate_in_activity(user, act)   ⑤⑧                  │    │
│  │           can_manage_org(user, org_id)             ④                   │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
├───────────────────────────────────────────────────────────────────────────────┤
│  CONTROLLERS (Blueprints)                                                      │
│  auth②  registration⑨  proposal⑦  community④⑦  ┃ NEW: team③  engagement⑧      │
│                                                  ┃      ai⑥   timeline⑤        │
├───────────────────────────────────────────────────────────────────────────────┤
│  SERVICES (domain logic)                                                       │
│  auth②  attendance⑨  proposal⑤⑦  org④  ┃ NEW: team③  engagement⑧             │
│                                          ┃      progression⑦  timeline⑤        │
│                                          ┃      feedback⑤  ai⑥                 │
├───────────────────────────────────────────────────────────────────────────────┤
│  NEW LAYER: integrations/   ⑥        ← first outbound third-party boundary     │
│  ┌────────────────────────────────────────────────────────────────────────┐    │
│  │ llm_client.py — generate(system, prompt) -> str | None                 │    │
│  │ Timeout-bounded. Returns None on failure -> service falls back to      │    │
│  │ deterministic templates. Mocked wholesale in pytest.                   │    │
│  └────────────────────────────────────────────────────────────────────────┘    │
├───────────────────────────────────────────────────────────────────────────────┤
│  REPOSITORIES — repos.py (+ TeamRepository③ EngagementRepository⑧              │
│                            SocialLinkRepository④ FeedbackRepository⑤)          │
├───────────────────────────────────────────────────────────────────────────────┤
│  MODELS — models/__init__.py                                                   │
│  MODIFIED: User④ · Organisation④ · Registration⑨ · Report⑤ · Document⑥        │
│  NEW:      ActivityTeamMember③ ActivityTask③ SocialLink④ Feedback⑤            │
│            Message⑧ Poll⑧ PollOption⑧ PollVote⑧                               │
└───────────────────────────────────────────────────────────────────────────────┘

① switcher ② refresh ③ team/task ④ entity profile ⑤ timeline+feedback
⑥ AI campaign ⑦ progression ⑧ chat+polls ⑨ QR check-in
```

---

## Component Boundaries — What Talks To What

| Boundary | Direction | Rule |
|---|---|---|
| Controllers → Services | one-way | Controllers never touch models or repositories directly. Existing violation to not repeat: `proposal_controller.py:25` and `misc_controller.py` call `ActivityRepository` directly. Do not extend that pattern. |
| Services → Repositories → Models | one-way | Unchanged. |
| Services → `integrations/` | one-way, new | Only services call integrations. Repositories and controllers never do. Keeps the LLM mockable at one seam. |
| `rbac.py` → Models | one-way | `rbac.py` may import models (already does). New predicates live here, **not** in services, so every new controller shares one definition of "can this person act on this activity". |
| Frontend `activeRole` → Backend | **forbidden** | The switcher is a view preference. It is never sent to the API and never influences an authorization decision. All permission truth stays server-side, POR-derived. |
| Frontend → hardcoded POR lists | **remove** | `withPor()` should consume a server-computed `capabilities` object from `/auth/me`, not maintain its own POR set. |

### The Three New Authorization Predicates

This is the milestone's most important architectural addition. All three go in `backend/app/rbac.py`.

```python
# Superset relationship: manage ⊂ participate
def can_manage_activity(user, activity) -> bool:
    """Crew-level. Gates: task CRUD, campaign generation, QR check-in,
       broadcast, message moderation, poll creation."""
    if user.role == ROLE_ADMIN:                       return True
    if activity.organiser_id == user.id:              return True
    if _holds_active_por_in_org(user, activity.org_id): return True
    return ActivityTeamMember.query.filter_by(
        activity_id=activity.id, user_id=user.id, active=True).first() is not None

def can_participate_in_activity(user, activity) -> bool:
    """Attendee-level. Gates: chat read/write, poll voting, attendee feedback."""
    if can_manage_activity(user, activity):           return True
    return RegistrationRepository.find(activity.id, user.id) is not None

def can_manage_org(user, org_id) -> bool:
    """Org-officer level. Gates: entity profile + social-link editing."""
    if user.role == ROLE_ADMIN:                       return True
    return _has_por_type_in_org(user, org_id, ORG_PROFILE_EDITOR_PORS)
```

`ORG_PROFILE_EDITOR_PORS` is a new `constants.py` set (`House Secretary`, `Deputy House Secretary`, `Society Secretary`, `Regional Coordinator`, `Web Admin`) — deliberately narrower than `ORGANISER_PORS`, which includes `Event Lead`.

**Why predicates, not decorators, for the activity-scoped ones:** the activity must be loaded before the check, and the loading pattern differs per endpoint (path param vs body). Use `@auth_required` for the token, then an explicit service-level guard. Only `can_manage_org` is clean enough to also wrap as a decorator.

---

## Feature-by-Feature Integration

### ① Dashboard Switcher — no backend model change, but one backend fix

**Verdict:** Confirmed — no new table, no new endpoint. But **do change the `/auth/me` payload**.

The naive version (client-side toggle on the existing `withPor` output) works but cements the already-drifted `ORGANISER_POR_TYPES` duplication. Do this instead:

**Backend (modified):**
- `services/auth_service.py` — add `identity_payload(user)` returning `{**user.to_dict(), "capabilities": {"can_organise": is_organiser(user), "is_admin": ..., "organiser_orgs": [...]}}`. Importing `is_organiser` from `rbac` into `auth_service` is safe: `rbac` imports only `constants`/`errors`/`models`, so no cycle.
- `controllers/auth_controller.py` — `/me`, `/login`, `/register` all return `identity_payload(user)`.

**Frontend (modified):**
- `lib/auth.tsx` — `Account` gains `availableRoles: Role[]` (derived from server `capabilities`, not a local POR set) and the provider gains `activeRole` state persisted to `localStorage['ekatva_active_role']`, validated against `availableRoles` on load.
- `lib/session.tsx` — return `activeRole` instead of `currentUser.role`. This one-line change propagates the switcher through every consumer for free.
- `components/Layout.tsx` — render a segmented control above the nav when `availableRoles.length > 1`; on switch, `setActiveRole(r)` then `navigate(homeFor(r))`.

**Data flow:** `login → server computes capabilities → availableRoles → activeRole (persisted, defaults to highest-privilege) → useSession → NAV[activeRole]`. The API layer is untouched; every request still carries only the JWT.

**Build cost:** small. **Depends on:** nothing. **Blocks:** nothing, but it edits the same files as ②.

---

### ② Auth Refresh Token

**Verdict:** Confirmed shape. Backend is ~30 lines; the risk is entirely in the frontend interceptor.

**Backend (modified):**
- `config.py` — `JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)` (down from 12 hours), add `JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)`.
- `rbac.py` — new `refresh_required` decorator wrapping `verify_jwt_in_request(refresh=True)`. **Necessary**, because the existing `_load_current_user()` calls bare `verify_jwt_in_request()`, which rejects refresh tokens.
- `auth_service.py` — `_tokens(user)` returns `{access_token, refresh_token}` via `create_access_token` + `create_refresh_token`.
- `auth_controller.py` — `POST /auth/refresh`, `@refresh_required`, returns a fresh access token (and the identity payload, so a role change mid-session propagates).

Verified against Flask-JWT-Extended official docs: `create_refresh_token(identity=...)`, `@jwt_required(refresh=True)`, `JWT_ACCESS_TOKEN_EXPIRES` (default 15 min), `JWT_REFRESH_TOKEN_EXPIRES` (default 30 days). "Explicit refreshing" is the documented recommendation for non-cookie frontends — which is exactly this SPA.

**Frontend (modified):**
- `lib/api.ts` — this is the delicate part:
  - Store the refresh token under a second key (`ekatva_refresh`).
  - In `request()`, on `!res.ok && res.status === 401 && body?.code === 'token_expired'`, refresh once and retry once. The backend **already** emits `token_expired` distinctly from `unauthorized`, so no guessing is required.
  - **Single-flight guard is mandatory:** a module-level `let refreshPromise: Promise<string> | null`. Every page mounts 2-4 concurrent queries; without the guard an expiry produces a burst of parallel refresh calls.
  - The `/auth/refresh` call itself must bypass the interceptor (no recursion).
  - On refresh failure: clear both tokens, and signal logout. Use a registered callback (`api.onAuthFailure = fn`) set by `AuthProvider` rather than importing auth into api — preserves the existing `auth → api` one-way dependency.
- `lib/auth.tsx` — `setTokens`/`clearTokens`; `logout()` clears both.

**Does refresh need to ship before the switcher?** Architecturally **no** — they are independent. Practically **yes, in the same phase, refresh first**, for two reasons: they edit the same two files (`auth.tsx`, `api.ts`), and refresh changes the token contract every later feature's fetches ride on. Landing refresh after four other frontend slices means rewriting four sets of error handling.

**Deliberately deferred:** a token blocklist/revocation table. The docs note that revoking an access token requires revoking its refresh token too, which needs a persistent blocklist. For a course project with no real money and no sensitive PII, logout-clears-localStorage is proportionate. Record it as a known limitation, not a bug.

---

### ③ Activity-Scoped Team & Tasks — the keystone

**Verdict: two tables, not one.** Association-object pattern, not a bare many-to-many.

```python
class ActivityTeamMember(Base):
    __tablename__ = "activity_team_members"
    __table_args__ = (db.UniqueConstraint("activity_id", "user_id", name="uq_team"),)
    activity_id = db.Column(..., db.ForeignKey("activities.id"), nullable=False, index=True)
    user_id     = db.Column(..., db.ForeignKey("users.id"),      nullable=False, index=True)
    role_label  = db.Column(db.String(80))    # "Logistics", "Photography" — free text
    added_by    = db.Column(..., db.ForeignKey("users.id"))
    active      = db.Column(db.Boolean, default=True, nullable=False)

class ActivityTask(Base):
    __tablename__ = "activity_tasks"
    activity_id = db.Column(..., db.ForeignKey("activities.id"), nullable=False, index=True)
    assignee_id = db.Column(..., db.ForeignKey("users.id"), nullable=True, index=True)
    title       = db.Column(db.String(200), nullable=False)
    detail      = db.Column(db.Text)
    deadline    = db.Column(db.DateTime)
    status      = db.Column(db.String(20), default="open")   # open|in_progress|done
    created_by  = db.Column(..., db.ForeignKey("users.id"))
```

**Why two tables** (this is the load-bearing decision):
1. A collaborator with **zero tasks** is a real, needed state — "who is on this event's crew" is the thing `can_manage_activity` queries. One table forces a dummy task to express membership.
2. `attendance_service.award_volunteer_points()` currently accepts a raw `user_id` with **no record of why that person was on the crew** (`registration_controller.py:58-66`). `ActivityTeamMember` gives it a referent and makes volunteer points auditable — directly serving PRD P6/P7.
3. Tasks can be reassigned within a crew without churning membership rows.
4. Cost is one extra table and one extra join. Acceptable.

**Why `assignee_id → users.id` and not `→ activity_team_members.id`:** keeps the FK graph shallow, makes "my tasks across all events" a single indexed query, and lets a task be created for someone before formalising membership. Enforce the invariant **in the service, not the schema**: `assign_task()` upserts an `ActivityTeamMember` row if one is missing. The team roster is therefore always a superset of task assignees.

**The RBAC consequence — this is why ③ is the keystone.** A crew member is typically a plain student with no organiser POR. `@organiser_required` would deny them access to their own task list. Every team/task endpoint must use `@auth_required` + `can_manage_activity`. Building ③ without that predicate produces a feature that excludes exactly the users it exists for.

| File | Change |
|---|---|
| `models/__init__.py` | +2 models, +2 `Activity` relationships (`team_members`, `tasks`, both `cascade="all, delete-orphan"`) |
| `rbac.py` | `can_manage_activity` |
| `repositories/repos.py` | `TeamRepository` — `team_for(activity_id)`, `tasks_for(activity_id)`, `tasks_for_user(user_id)`, `member(activity_id, user_id)` |
| `schemas/__init__.py` | `TeamMemberSchema`, `TaskSchema`, `TaskUpdateSchema` |
| `services/team_service.py` | **new** — add/remove member, create/update/reassign/complete task, upsert invariant |
| `controllers/team_controller.py` | **new** — `/events/<id>/team`, `/events/<id>/tasks`, `/tasks/<tid>`, `/me/tasks` |
| `controllers/__init__.py` | register `team_bp` |
| `attendance_service.py` | rewire `award_volunteer_points` to resolve/require an `ActivityTeamMember` |
| FE `pages/ManageEvent.tsx` | remove `import { TASKS } from '../lib/mock'`; wire real queries. The tab shell already exists. |
| FE `lib/mock.ts` | delete `TASKS` |
| FE `lib/api.ts` / `queries.ts` / `types.ts` | new endpoints, hooks, `TeamMember` / `Task` types |

---

### ④ Entity Profile + Social Links — hybrid: columns **and** a child table

**Verdict:** Extend `Organisation` with scalar profile columns; add a **separate `SocialLink` table**. Do not pick one or the other.

- **Scalars on `Organisation`** (`tagline`, `description`, `logo_url`, `cover_url`): strictly 1:1, and `api.orgs()` is a hot path fired on every header search keystroke (`Layout.tsx:88-92`). Columns avoid a join there.
- **`SocialLink` as a child table**: the requirement is literally "link-tree style" — 0..N, user-ordered, per-platform. A JSON column blocks ordering and per-row validation, and SQLite JSON support is weak. `BudgetLine` is the exact existing precedent for this shape.

```python
class SocialLink(Base):
    __tablename__ = "social_links"
    org_id     = db.Column(..., db.ForeignKey("organisations.id"), nullable=True, index=True)
    user_id    = db.Column(..., db.ForeignKey("users.id"),         nullable=True, index=True)
    platform   = db.Column(db.String(40), nullable=False)   # instagram|linkedin|discord|website|...
    url        = db.Column(db.String(400), nullable=False)
    label      = db.Column(db.String(80))
    sort_order = db.Column(db.Integer, default=0)
```

One table serving both owners, with a **service-level invariant** that exactly one of `org_id`/`user_id` is set. This is pragmatic polymorphism. The alternative — two tables (`OrgSocialLink`, `UserSocialLink`) — is arguably cleaner SQLAlchemy but doubles the model/repo/schema surface for identical behaviour. **Trade-off stated honestly:** the single table is the right call at this scale; if link types ever diverge per owner, split it.

User profile fields go on `User` as columns (`avatar_url`, `bio`) — and this is the natural place to co-locate the **academic-status fields** from `PROJECT.md` Active req #3 (`level`, `academic_status`, `status_confirmed_at`), since both are `User` column additions and the no-Alembic constraint rewards batching them.

**Payoff:** deletes `HOUSE_META` from `pages/Orgs.tsx` and generalises org metadata from Houses-only to all four org types — resolving the special-case the PROJECT.md Key Decisions table already flags.

**Answering the asked dependency: does team/task need to exist first? No.** ③ and ④ share nothing — different tables, different RBAC predicate (`can_manage_activity` vs `can_manage_org`), different pages, different endpoints. They are genuinely parallelisable across two developers.

| File | Change |
|---|---|
| `models/__init__.py` | `Organisation` +4 cols, `User` +2 cols (+academic-status), `SocialLink` new |
| `constants.py` | `ORG_PROFILE_EDITOR_PORS`, `SOCIAL_PLATFORMS` |
| `rbac.py` | `can_manage_org` |
| `services/org_service.py` | modified — profile update, link CRUD, invariant |
| `controllers/community_controller.py` | modified — `PATCH /orgs/<id>/profile`, `/orgs/<id>/links`, `PATCH /me/profile` (no new blueprint; these are org/community endpoints) |
| FE | new `pages/OrgProfile.tsx`, `pages/MyProfile.tsx`; modified `Orgs.tsx` (drop `HOUSE_META`) |

---

### ⑤ Event Timeline + Dual Feedback — extend `Report`, add `Feedback`, **project** the timeline

Three distinct decisions here, and they differ:

**Organiser reflection → extend `Report`.** Add `challenges` and `learnings` (Text) columns. `Report` is already 1:1 with Activity, organiser-authored, already audited via `AuditRepository.record("report", ...)` (`proposal_service.py:135-146`), and PROJECT.md says it "feeds the existing report flow". A new table would fragment it.

**Attendee rating → new `Feedback` table.** Different author (student, not organiser), different cardinality (0..N, not 1:1), different RBAC. Conflating it with `Report` would be a modelling error.

```python
class Feedback(Base):
    __tablename__ = "feedback"
    __table_args__ = (db.UniqueConstraint("activity_id", "user_id", name="uq_feedback"),)
    activity_id = db.Column(..., db.ForeignKey("activities.id"), nullable=False, index=True)
    user_id     = db.Column(..., db.ForeignKey("users.id"),      nullable=False, index=True)
    rating      = db.Column(db.Integer, nullable=False)   # 1-5
    comment     = db.Column(db.Text)
```
Gate submission on an existing `Registration` (ideally with `Attendance`) — service-level check via `RegistrationRepository.find()`.

**Event timeline → NO new table.** This is the strongest recommendation in this document. The timeline is a **read-model projection** computed in a new `services/timeline_service.py` that merges existing sources sorted by timestamp:

```
AuditLog.for_entity(activity_id)          proposal submitted / approved / changes / revoked / report filed
Activity.created_at, .starts_at           created, scheduled
Registration.created_at (aggregated)      "12 students registered this week"
Attendance.created_at (aggregated)        check-in window
Expense.created_at + status               spend submitted / verified
Feedback / Report                         post-event loop closed
```

`AuditLog` is already append-only and is already the designated home for state changes (`models/__init__.py:392-393`: *"Every state change (approve, verify, publish) lands here"*). A parallel `TimelineEvent` table would duplicate truth and drift the moment someone forgets to write both.

**The real work of this phase is backfilling audit coverage.** `registration_service`, `attendance_service` and `expense_service` currently write **no** audit rows despite the model's stated contract. Adding `AuditRepository.record(...)` calls there is cheap, makes the timeline nearly free, and strengthens P7 independently. Budget the phase accordingly — it is an audit-instrumentation phase wearing a timeline hat.

**Depends on:** ⑨ QR check-in producing check-in audit rows makes the timeline substantially more interesting — group them.

---

### ⑥ AI Campaign Creator — the one new architectural layer

**New boundary: `backend/app/integrations/`.** This is the first outbound third-party call in the system. Putting the SDK call inside a service makes it untestable and un-mockable without monkeypatching. Create:

```
backend/app/integrations/__init__.py
backend/app/integrations/llm_client.py   # generate(system, prompt, *, timeout=20) -> str | None
```

Contract: returns `None` on any failure (no key, timeout, rate limit, malformed response). It never raises into the service. Rule: **services → integrations → external HTTP.** Repositories and controllers never import `integrations`.

**Provider:** use one provider's official Python SDK behind that single `generate()` signature. **Do not add LangChain** — it is a heavy dependency for one call shape and violates the "no new frameworks" constraint in spirit. The provider-abstraction guidance in the ecosystem is right in principle, but the correct abstraction *at this scale* is one 40-line adapter, not a framework. Config via `AI_PROVIDER` / `AI_API_KEY` env in `config.py`.

**Mandatory: deterministic fallback.** If `llm_client.generate()` returns `None`, `ai_service` renders the same artefact from a static template (event title/date/venue/org substituted into a canned mail body). This is non-negotiable for a graded course project — the demo must not depend on a live API key, a network, or a provider's uptime. Make "works with `AI_API_KEY` unset" an explicit acceptance criterion.

**Storage → extend `Document`, do not add a table.** `Document(activity_id, url, deleted_at)` is already the activity-scoped artefact table with soft-delete, and is currently unused by any controller — it was built for exactly this. Add:
```python
kind       = db.Column(db.String(30))   # mail_template | poster | registration_link | campaign_copy
title      = db.Column(db.String(200))
body       = db.Column(db.Text)         # generated text lives here; url stays for uploads
source     = db.Column(db.String(10), default="manual")  # ai | manual
created_by = db.Column(..., db.ForeignKey("users.id"))
```

**Honest scoping of the three sub-features:**
- *Mail-template generation* — squarely in scope. Text in, text out, stored in `Document.body`.
- *Registration-link generation* — **not an AI feature at all.** The event already has a stable URL (`/events/:id`). This is "produce a shareable absolute URL + a QR image", which **reuses the QR generator from ⑨**. Note the overlap; don't build it twice.
- *Poster generate/upload* — **blocked by a real gap: there is no blob storage anywhere in this architecture.** `Expense.bill_name` stores a filename, not a file. Options, in increasing cost: (a) generate a poster *brief* + render a templated SVG/canvas client-side from event data, zero storage, zero image-model cost; (b) add a Flask static `uploads/` dir for upload-only; (c) integrate object storage. **Recommend (a) for v1** and flag image generation as deferred. This should be surfaced early, not discovered mid-phase.

**Unlock gate:** `activity.proposal.status == PROPOSAL_APPROVED`, enforced in `ai_service`, not just hidden in the UI. Caller must satisfy `can_manage_activity`.

**Pitfalls:** never proxy the API key to the browser; never hold a DB transaction open across the LLM call (generate first, then persist); hard timeout with a 503 + fallback.

---

### ⑦ Progression-Gating — confirmed: no new model

**Verdict:** Confirmed. Pure computed policy, and it slots into an existing seam.

`proposal_service.submit_proposal()` already contains a guardrail of exactly this shape — the FR-B2 quota check at `proposal_service.py:25-33`. Progression-gating is a sibling check placed immediately beside it.

**New:** `services/progression_service.py`
```python
def unlocked_scales(org_id) -> list[str]
def assert_scale_allowed(org_id, scale)   # raises ApiError(..., "scale_locked", 403)
def progress_for(org_id) -> dict          # for the UI: what's locked and how far away
```

**New constant** in `constants.py`, next to `MEETUPS_PER_REGION_PER_MONTH`, so the rule stays auditable per the file's own stated purpose:
```python
SCALE_UNLOCK_RULES = {
    "local_meetup":    {},
    "regional_meetup": {"local_meetup": 2},
    "regional_fest":   {"local_meetup": 3, "regional_meetup": 1},
}
```

**New repo method:** `ActivityRepository.completed_activity_count(org_id, scale)`.

**Important trap to flag.** The obvious implementation counts `Activity.status == "completed"`. But `status` only flips to `completed` inside `submit_report()` (`proposal_service.py:143`) — there is no scheduler, no auto-archive job. If organisers don't file reports, **nothing ever unlocks** and the feature silently dead-ends. **Recommend counting `proposal.status == approved AND starts_at < now()` instead** — data that reliably exists without depending on organiser follow-through. (Or fix auto-archive, but that's a bigger, separate change.)

**Read endpoint for the UI:** `GET /api/v1/orgs/<id>/progression` in `community_controller.py` (org-scoped — no new blueprint), so `ProposalNew.tsx` can disable the locked scale option and *explain the requirement* rather than failing on submit. Failing at submit time after a user fills a long form is the worst version of this feature.

| File | Change |
|---|---|
| `constants.py` | `SCALE_UNLOCK_RULES` |
| `repos.py` | `completed_activity_count` |
| `services/progression_service.py` | **new** |
| `services/proposal_service.py` | modified — one call next to the quota check |
| `controllers/community_controller.py` | modified — progression read endpoint |
| FE `pages/ProposalNew.tsx` | modified — disable + explain locked scales |

---

### ⑧ Chat + Polls — four tables, and **polling, not websockets**

**Models — four, not three.** Poll options need their own table so a vote can FK an option and tallies are a `GROUP BY`. Storing options as CSV/JSON on `Poll` makes counting a Python loop and abandons referential integrity. `BudgetLine` sets the precedent.

```python
Message(activity_id, user_id, body, deleted_at)          # soft-delete = organiser moderation
Poll(activity_id, question, created_by, closes_at, active)
PollOption(poll_id, label, sort_order)
PollVote(poll_id, option_id, user_id)                    # UniqueConstraint(poll_id, user_id)
```
Index `Message(activity_id, created_at)` — it carries the whole polling load.

**Transport: HTTP polling via TanStack Query `refetchInterval`. Do not add Flask-SocketIO.**

Rationale, strongest first:
1. **Constraint.** `PROJECT.md` states "no new frameworks". `Flask-SocketIO` + `eventlet`/`gevent` is not a library addition — it replaces the WSGI serving model, breaks the `python run.py` dev flow, complicates the deploy target, and adds monkeypatching that interacts badly with SQLAlchemy connection pooling.
2. **Zero new dependency.** TanStack Query is already installed. `refetchInterval` is one option on an existing hook — the docs describe it as refetching on a timer while at least one observer is active.
3. **Scale reality.** A city meetup is tens of concurrent people over a few hours. A 5s poll returning an empty delta is a single indexed range scan.

Make polling cheap by design:
- **Cursor endpoint:** `GET /events/:id/messages?after=<iso_ts|message_id>` returns only new rows. Never re-fetch the whole thread.
- **Visibility gating:** rely on TanStack's default of not refetching in the background, and additionally gate `enabled` on the chat panel being open.
- **Adaptive interval:** 3s while the panel is focused, 15s otherwise.

**Documented escape hatch:** if latency ever matters, the next step is **Server-Sent Events**, not WebSockets. SSE is a plain `Response(generator, mimetype='text/event-stream')` on stock Flask — no new framework. (MEDIUM confidence: SSE on a threaded WSGI server ties up one worker thread per connected client, which is fine at course scale but is the thing that breaks first.)

**Scoping — "the event's registration window":** access requires `can_participate_in_activity` (registrants + crew + admin). The window opens when the proposal is approved and closes at `starts_at + grace`. **Enforce server-side in the service**; the frontend merely hides the tab. Hiding a UI tab is not access control.

**Structure note:** create **one** `services/engagement_service.py` and **one** `controllers/engagement_controller.py` covering chat and polls together. The codebase already runs 9 blueprints for 18 models; two more blueprints for one feature pair is sprawl.

---

### ⑨ QR Check-In — additive, not a replacement

**Verdict: keep the existing `registration_ids` endpoint.** `POST /events/<id>/attendance {registration_ids}` (`registration_controller.py:33-39`) stays as the bulk/manual path and is already covered by tests. QR is a **second door into the same service function**, not a replacement. Replacing it would break tests and remove the only path that works without a camera.

**Model change (one column):**
```python
# on Registration
checkin_code = db.Column(db.String(10), unique=True, index=True, default=_short_code)
```
A short, human-typeable code from an unambiguous alphabet (no `0/O`, `1/I/l`). **Do not encode a JWT in the QR** — it produces a dense hard-to-scan code, cannot be revoked, and mints an auth credential for a non-auth purpose.

**New endpoint:** `POST /api/v1/events/<activity_id>/attendance/qr` body `{code}`:
1. `can_manage_activity(caller, activity)` — crew, not just POR holders.
2. Resolve `RegistrationRepository.by_checkin_code(code)`.
3. Assert `registration.activity_id == activity_id` (prevents cross-event replay).
4. Delegate to `attendance_service.check_in()` so the points/attendance logic stays in one place.
5. **Idempotent:** return `200 {already_checked_in: true}` on re-scan, not `409`. A camera scanner will fire the same code repeatedly; an error toast per frame is unusable.

**Direction decision — who scans whom.** Recommend **student displays, organiser scans**. The inverse (organiser displays a code, students self-scan) is materially easier to build but silently changes the trust model: `Attendance.checked_in_by` currently means "an organiser attested this", and the entire points economy (`POINTS['attended']`) rests on that. Self-check-in lets someone forward the code on WhatsApp and claim points from home.

**Frontend — two libraries, different risk profiles:**
- **Generating** (`MyRegistrations.tsx`, `EventDetail.tsx`): `react-qr-code` — SVG output, actively maintained, tiny, accessible (`role="img"`). *MEDIUM confidence.* `qrcode.react` is the alternative but its last publish is ~2 years old.
- **Scanning** (`CheckIn.tsx`): **this is the milestone's shakiest external dependency.** `html5-qrcode` is explicitly in maintenance mode (PRs not merged) and wraps ZXing-js, which its own maintainers say they no longer actively maintain. The current option is `react-zxing` v3, which replaced `@zxing/library` with `barcode-detector` (ZXing-C++ via WebAssembly). *LOW–MEDIUM confidence — flag this for phase-level research before committing.*
- **Mandatory manual-code fallback.** `CheckIn.tsx` must ship a plain text input accepting the same `checkin_code`. Graders may run in a VM with no camera; `getUserMedia` requires HTTPS or localhost. The feature must be demonstrable without a working camera, and the fallback is ~10 lines.

**Backfill note:** existing `Registration` rows will have `NULL` codes. Dev is covered by the destructive reseed; anywhere else needs a one-off backfill script. Consequence of no Alembic — call it out.

---

## The No-Alembic Constraint Dominates Build Order

This milestone adds **~8 tables and ~12 columns**. Under "edit models + rerun destructive `seed.py`", the naive feature-by-feature order costs eight destructive reseeds, each wiping every teammate's local data mid-sprint. With five developers, that is the milestone's single largest coordination cost.

**Two paths. Pick one explicitly, don't drift into the bad version.**

**Path A (no new dependency) — batch the schema.** Declare *every* new model and column in one early phase, including tables for features built four phases later. Reseed **once**. Then build feature slices against a frozen schema. Empty tables cost nothing. This inverts the intuitive order and is the recommended default.

**Path B (escalate) — adopt Flask-Migrate now.** One dependency, roughly half a day, and the constraint disappears permanently. Honest arithmetic: eight coordinated destructive reseeds across five machines almost certainly costs more than half a day. This *is* a stack change and PROJECT.md forbids new frameworks, so it must be an explicit team decision rather than a quiet commit. Worth raising once, at milestone start, then moving on.

---

## Suggested Build Order

Ordering is driven by three dependency edges only: **shell-file collisions**, **schema batching**, and **the RBAC predicates**. Everything else is genuinely parallel.

| Phase | Contents | Why here | Schema? | Parallel-safe? |
|---|---|---|---|---|
| **P1 — Identity & Shell** | ② refresh tokens · server-computed `capabilities` in `/auth/me` · ① dashboard switcher | Touches `auth.tsx`, `api.ts`, `session.tsx`, `Layout.tsx` — the four files every later frontend slice also edits. Landing it first means later slices branch from a stable shell. **Refresh before switcher** (same files; refresh changes the token contract every later fetch rides on). Zero DB risk. | No | No — serialize, it's small |
| **P2 — Schema + Authorization Foundation** | All 8 new models + all 12 new columns declared · `can_manage_activity` / `can_participate_in_activity` / `can_manage_org` / `refresh_required` in `rbac.py` · one reseed · academic-status columns ride along | Every later phase needs a table to exist **or** a scoped predicate to exist. Building any feature first forces a second destructive reseed. This is the keystone phase. | **Yes — the only one** | No — serialize |
| **P3 — Team & Tasks** | ③ `team_service` + `team_controller` · `ManageEvent.tsx` rewrite · delete `TASKS` mock · rewire `award_volunteer_points` | Largest user-visible gap; its predicate (`can_manage_activity`) is what P5/P6/P7 reuse. The redesigned organiser dashboard (budget/report surfaced against the team view) needs this to exist. | No | Yes — with P4 |
| **P4 — Org Profile & Progression** | ④ `SocialLink` CRUD + `Organisation` profile + drop `HOUSE_META` · ⑦ `progression_service` + `ProposalNew` gating | Both org-scoped, both small, both independent of the team model. **Explicitly: entity profile does NOT depend on team/task** — different tables, different predicate, different pages. Two devs can run P3 and P4 concurrently. | No | Yes — with P3 |
| **P5 — Check-In, Timeline & Feedback** | ⑨ QR endpoint + scanner + manual fallback · audit backfill in registration/attendance/expense services · ⑤ `timeline_service` · `Report.challenges/learnings` · `Feedback` endpoints | Grouped because **QR check-in is one of the audit events the timeline needs**. Backfilling audit coverage serves both. Feedback closes the loop after attendance exists. | No | Partly |
| **P6 — Chat & Polls** | ⑧ `engagement_service` + polling hooks + moderation | Highest new surface area, lowest coupling to everything else, and the easiest whole phase to cut if the term runs short. Depends only on `can_participate_in_activity` (P2). | No | Yes |
| **P7 — AI Campaign Creator** | ⑥ `integrations/llm_client.py` · `ai_service` · `Document` usage · template fallback | Last because it is the **only** phase with a network, cost, key, and vendor-uptime risk. Its mandatory template fallback means it can degrade gracefully. Deferring it protects the rest of the milestone. Depends on `Document` columns (P2) and the existing approval gate. | No | Yes |

**If the AI feature is graded heavily**, move P7 to run in parallel from P3 onward — but make "works correctly with `AI_API_KEY` unset" the acceptance criterion, not a nice-to-have. That protects the demo regardless of ordering.

**Phases needing deeper research before implementation:** P5 (QR scanner library ecosystem is in flux — both incumbents unmaintained) and P7 (provider choice, cost, and the poster/blob-storage gap).

---

## Data Flow — New Paths

**Dashboard switch (fully client-side, zero network):**
```
click Organiser → setActiveRole('organiser') → localStorage
  → useSession() returns 'organiser' → NAV['organiser'] → navigate(homeFor)
  ✗ nothing sent to the API   ✗ no authorization consequence
```

**Token refresh (single-flight):**
```
useQuery → api.request() → 401 {code:'token_expired'}
  → refreshPromise ??= POST /auth/refresh  (Bearer refresh_token, bypasses interceptor)
  → new access token → setToken → retry original request ONCE
  → on refresh failure: clearTokens + api.onAuthFailure() → AuthProvider logs out
```
Without the `refreshPromise` singleton, one expiry on a page with four concurrent queries fires four refreshes.

**Task assignment (invariant enforced in the service):**
```
ManageEvent → POST /events/:id/tasks {assignee_id, title, deadline}
  → @auth_required → can_manage_activity(user, activity)   [crew, not just POR holders]
  → team_service.assign_task()
        └─ upsert ActivityTeamMember(activity, assignee)   ← keeps roster ⊇ assignees
        └─ insert ActivityTask
        └─ AuditRepository.record("task", ...)
        └─ Notification(assignee)
  → invalidate ['team', id] + ['tasks', id]
```

**QR check-in (idempotent, reuses existing service):**
```
student's phone renders <QRCode value={checkin_code}/>  ← from Registration
organiser scans → POST /events/:id/attendance/qr {code}
  → can_manage_activity → by_checkin_code → assert activity_id matches
  → attendance_service.check_in([reg.id])   ← SAME function as the roster path
  → 200 {checked_in:1} | 200 {already_checked_in:true}   ← never 409
```

**Chat (cursor-based polling, no new transport):**
```
useQuery(['chat', id, cursor], { refetchInterval: 3000, enabled: panelOpen })
  → GET /events/:id/messages?after=<ts>
  → can_participate_in_activity + window open (approved && now < starts_at+grace)
  → returns ONLY new rows (indexed range scan on activity_id, created_at)
```

**Timeline (projection — reads only, writes nothing):**
```
GET /events/:id/timeline → timeline_service.build(activity_id)
  ├─ AuditRepository.for_entity(id)            proposal + report + (new) reg/attend/expense events
  ├─ Activity.created_at / starts_at
  ├─ Registration + Attendance aggregates
  └─ Report / Feedback
  → merge, sort by timestamp, return
  ✗ no TimelineEvent table   ✗ no dual writes   ✗ no drift
```

**AI generation (fallback is the default path, not the error path):**
```
POST /activities/:id/campaign/generate {kind}
  → can_manage_activity + proposal.status == approved
  → ai_service.generate(kind, activity)
        └─ integrations.llm_client.generate(system, prompt, timeout=20) -> str | None
        └─ if None: render deterministic template   ← MUST work with no API key
  → Document(kind, title, body, source='ai'|'manual')
  ✗ LLM call never inside an open transaction   ✗ key never reaches the browser
```

---

## Anti-Patterns to Avoid

**1. Using `activeRole` for authorization.**
Once the switcher exists, the tempting next step is passing `activeRole` in a header or branching permissions on it. That converts a UI preference into a client-controlled privilege claim and violates PRD P3. `activeRole` selects a *view*; PORs decide *permissions*, server-side, always.

**2. Patching the frontend POR list instead of deleting it.**
`ORGANISER_POR_TYPES` in `auth.tsx:20-26` has already drifted from `ORGANISER_PORS` in `constants.py:12-20` (missing `Deputy House Secretary` and `Web Admin`). Adding entries fixes today and guarantees tomorrow's drift. Delete the list; consume a server-computed `capabilities` object.

**3. Guarding team endpoints with `@organiser_required`.**
It is right there, it compiles, and it locks out every crew member who is a plain student — the exact users the feature exists for. Team/task/chat endpoints need `@auth_required` + a resource-scoped predicate.

**4. Creating a `TimelineEvent` table.**
It looks like the obvious model for a timeline and creates a second source of truth beside `AuditLog`. The first time someone writes an audit row without the timeline row (or vice versa), the two diverge silently. Project the timeline from `AuditLog`; if a transition isn't visible, the fix is to *record the audit row*, which is a correctness improvement anyway.

**5. Adding Flask-SocketIO for chat.**
Every "Flask realtime" tutorial leads here. It changes the WSGI serving model, adds `eventlet`/`gevent` monkeypatching that interacts badly with SQLAlchemy pooling, breaks `python run.py`, complicates deploy, and is a framework addition the constraints forbid — all to serve a few dozen concurrent users. Use `refetchInterval`. If that ever stops sufficing, go to SSE, not WebSockets.

**6. Calling the LLM SDK directly from a service or controller.**
Makes the code untestable without network mocking, spreads key handling, and leaves no seam for the fallback. One `integrations/llm_client.py` with a `-> str | None` contract solves all three.

**7. Shipping an AI feature that hard-fails without an API key.**
For a graded, demoed course project, an unreachable provider on demo day is an unrecoverable failure. The template fallback is the primary path; the LLM is the enhancement.

**8. Storing poll options as CSV or JSON on `Poll`.**
Saves one table, then makes tallying a Python loop, breaks referential integrity on `PollVote`, and blocks per-option ordering. `BudgetLine` already establishes the child-table convention.

**9. Signing a JWT into the QR code.**
Produces a visually dense, hard-to-scan code; cannot be revoked; and mints an auth credential for something that is not authentication. A short opaque code with a server-side lookup is smaller, revocable, and hand-typeable as a fallback.

**10. Replacing the bulk check-in endpoint with the QR one.**
Breaks existing pytest coverage and removes the only path that works without a camera. Add alongside; both delegate to the same service function.

**11. Per-feature destructive reseeds.**
Under no-Alembic, each schema change wipes five developers' local data. Batch the schema into one phase.

**12. Hiding the chat tab as "access control".**
The window rule (approved, before `starts_at + grace`) and the participation rule must both be enforced in the service. UI hiding is presentation.

---

## Scaling Considerations

Honest framing: PRD scope is 40,000 students, but the graded artefact runs on SQLite with a seeded demo dataset and tens of concurrent users. Do not architect for the former.

| Scale | Adjustments |
|---|---|
| **Demo / course (≤100 users)** | Everything above works as written on SQLite. Chat polling at 3s is free. No caching. No background jobs. |
| **Single region live (~1k users)** | Switch to Postgres (already supported — `config.py:21-23` normalises the URL). Add indexes: `Message(activity_id, created_at)`, `ActivityTask(assignee_id)`, `Registration(checkin_code)` (unique already implies one). Move chat polling to 5-10s. |
| **Multi-region (10k+)** | The `to_dict()` pattern becomes the bottleneck before the database does — `Activity.to_dict()` calls `registered_count()`/`attended_count()`, each materialising the full relationship (`models/__init__.py:168-172`). At feed scale that is N+1 per card. Replace with aggregate columns or a `func.count` subquery. Then paginate the feed and the timeline. |

**What breaks first, in order:**
1. **`Activity.registered_count()` / `attended_count()` N+1 on the discovery feed** — already latent today, and the timeline projection will amplify it by aggregating registrations per activity.
2. **Chat polling fan-out** — mitigated by the cursor endpoint; without it, every poll re-serialises the whole thread.
3. **`api.orgs()` on every search keystroke** (`Layout.tsx:88-92`) — the org-profile columns keep this a single-table read, but it should eventually be debounced and server-side-filtered.
4. **The LLM call blocking a request thread** — bounded by the 20s timeout; at real volume it needs a job queue, which is well beyond this milestone.

---

## Integration Points

### External Services

| Service | Integration pattern | Notes / gotchas |
|---|---|---|
| LLM provider | Official Python SDK behind `integrations/llm_client.generate() -> str \| None`; key from env | Never expose the key client-side. Hard timeout. Deterministic template fallback is mandatory. No LangChain. *MEDIUM confidence on provider choice — decide in P7.* |
| Camera (`getUserMedia`) | Browser API via a QR-scanner package in `CheckIn.tsx` | Requires HTTPS or localhost. Must have a manual-code fallback. Both incumbent JS scanner libs are unmaintained — *LOW–MEDIUM confidence, research in P5.* |
| Blob storage | **Does not exist** | `Expense.bill_name` stores a filename, not a file. Poster *upload* has no backend. Recommend client-rendered SVG posters for v1; escalate if real uploads are required. |

### Internal Boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `auth.tsx` ↔ `api.ts` | one-way (`auth` imports `api`) | Preserve it. Use a registered `api.onAuthFailure` callback for the refresh-failure path rather than importing auth into api. |
| `rbac.py` ↔ services | services import predicates from `rbac` | `rbac` imports models only. Never let `rbac` import a service — that creates the cycle. |
| services ↔ `integrations/` | one-way, services → integrations | The single mock seam for pytest. |
| `team_service` ↔ `attendance_service` | direct call | Volunteer points resolve through `ActivityTeamMember`. Keep the points-award logic in `attendance_service`; `team_service` supplies the membership. |
| `timeline_service` ↔ everything | read-only | Reads repositories; writes nothing. If a transition is missing from the timeline, fix it by adding an audit write at the source, never by writing from `timeline_service`. |
| Controllers ↔ repositories | should be none | `proposal_controller.py:25` and `misc_controller.py` already bypass services. Don't extend the pattern in new controllers. |

---

## Confidence Ledger

| Claim | Confidence | Basis |
|---|---|---|
| Existing structure, file-level facts, drifted POR list, unused `Document`, route non-gating, `token_expired` code | **HIGH** | Read directly from source this session |
| Flask-JWT-Extended refresh API, config keys and defaults, "explicit refreshing for non-cookie frontends" | **HIGH** | Official Flask-JWT-Extended docs fetched |
| Two-table team/task, child tables for social links & poll options, extend `Report`, project timeline from `AuditLog` | **HIGH** | Standard modelling + consistent with existing `BudgetLine`/`AuditLog` conventions in this codebase |
| Do not add Flask-SocketIO; use `refetchInterval` | **HIGH** on the constraint reasoning, **MEDIUM** on "polling suffices" (scale-dependent, but course scale is tiny) |
| `react-qr-code` for QR generation | **MEDIUM** | WebSearch; actively maintained, SVG, accessible. `qrcode.react` last published ~2y ago |
| QR **scanning** library choice | **LOW–MEDIUM** | `html5-qrcode` in maintenance mode; ZXing-js unmaintained; `react-zxing` v3 is current but unverified against this stack. **Flag for phase research.** |
| LLM provider-abstraction pattern | **MEDIUM** | WebSearch, general ecosystem pattern; specific provider not selected |
| SSE as the websocket alternative on stock Flask | **MEDIUM** | Training + general knowledge; the worker-thread-per-client caveat is real |
| Progression-gating trap (`status=='completed'` never fires without reports) | **HIGH** | Traced directly: only `proposal_service.submit_report():143` sets it, no scheduler exists |
| No blob storage anywhere | **HIGH** | Verified — `Expense.bill_name` is a string; no upload handling in any controller |

**Gaps not resolved here:** specific LLM provider/pricing; whether the team will accept Flask-Migrate; whether poster generation is in or out of scope; frontend testing strategy for the new surfaces (no frontend test setup exists today).

---

## Sources

- [Flask-JWT-Extended — Refreshing Tokens](https://flask-jwt-extended.readthedocs.io/en/stable/refreshing_tokens.html) — `create_refresh_token`, `@jwt_required(refresh=True)`, explicit vs implicit refresh, revocation note
- [Flask-JWT-Extended — Configuration Options](https://flask-jwt-extended.readthedocs.io/en/stable/options.html) — `JWT_ACCESS_TOKEN_EXPIRES` (default 15 min), `JWT_REFRESH_TOKEN_EXPIRES` (default 30 days), `JWT_VERIFY_SUB`, `JWT_TOKEN_LOCATION`
- [TanStack Query — Polling](https://tanstack.com/query/v5/docs/framework/react/guides/polling) — `refetchInterval` semantics
- [html5-qrcode (GitHub)](https://github.com/mebjas/html5-qrcode) — maintenance-mode status
- [react-zxing (npm)](https://www.npmjs.com/package/react-zxing) — v3 uses `barcode-detector` / ZXing-C++ WASM
- [react-qr-code (npm)](https://www.npmjs.com/package/react-qr-code) — SVG QR generation
- [QR library comparison — npm-compare](https://npm-compare.com/@zxing/library,html5-qrcode,jsqr,qr-scanner,qrcode-reader)
- [Quagga2 vs html5-qrcode — Scanbot](https://scanbot.io/blog/quagga2-vs-html5-qrcode-scanner/) — maintenance status of ZXing-js
- [Real-Time Communication in Python Flask: Socket vs Polling](https://medium.com/@robertjosephk/real-time-communication-in-python-flask-socket-vs-polling-11c97f1f2755)
- [SSE, WebSockets, or Polling? — DEV](https://dev.to/itaybenami/sse-websockets-or-polling-build-a-real-time-stock-app-with-react-and-hono-1h1g)
- [Building a Gateway for Multiple LLM Providers — Medium](https://medium.com/@ritukampani/future-proof-your-ai-building-a-gateway-for-multiple-llm-providers-b746f80cc169) — provider-abstraction pattern
- [Building an agent with LangChain and Claude/OpenAI — Render](https://render.com/articles/building-an-agent-with-langchain-and-claude-open-ai) — Flask + LLM integration context
- **Primary source:** the Ekatva OS codebase itself — `backend/app/{models,rbac,constants,config,__init__}.py`, all controllers/services/repositories, `frontend/src/{App.tsx,lib/*,components/Layout.tsx,pages/ManageEvent.tsx}`

---
*Architecture research for: organiser-dashboard deepening on an existing Flask 3 + React 18 three-tier system*
*Researched: 2026-08-02*
