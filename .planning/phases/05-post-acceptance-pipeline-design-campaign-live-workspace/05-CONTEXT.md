# Phase 5: Post-Acceptance Pipeline (Design → Campaign → Live → Workspace) - Context

**Gathered:** 2026-08-14
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase takes an accepted proposal through the full pipeline to a live, active event
with a running team workspace:

1. Schedule Design — organiser fills an ordered agenda with scale-appropriate presets
2. Campaign Builder — mail template (AI-assisted), poster upload, custom registration fields, shareable slug
3. Push-Live Gate — Meetup Head explicitly approves the full package; server enforces it
4. Kanban Workspace — team task board activates only after campaign is live

Nothing reaches students until the Meetup Head pushes live.

</domain>

<spec_lock>
## Requirements (locked via SPEC.md)

**11 requirements are locked.** See `05-SPEC.md` for full requirements, boundaries, and acceptance criteria.

Downstream agents MUST read `05-SPEC.md` before planning or implementing.

**In scope (from SPEC.md):**
- `DESIGN-01` — Event schedule editor: ordered items, presets, edit/reorder/delete before push-live
- `CAMPAIGN-01` — AI mail template generation using brand kit voice/tone (LLM body only)
- `CAMPAIGN-02` — Brand kit context passed to AI; multi-entity collaborator logos in template
- `CAMPAIGN-03` — Poster upload saved to `backend/instance/uploads/`
- `CAMPAIGN-04` — Server-generated registration slug; shareable link
- `CAMPAIGN-05` — Custom registration fields (text/dropdown); no cap in Phase 5
- `CAMPAIGN-06` — Meetup Head push-live gate; 403 for non-Meetup-Head; server + UI enforced
- `TEAM-01` — Kanban workspace activates only after push-live
- `TEAM-02` — Task CRUD (title, description, assignee, deadline, status); persisted server-side
- `TEAM-03` — Team role grants zero org-wide permissions
- `TEAM-04` — `award_volunteer_points` requires actual crew membership check

**Out of scope (from SPEC.md):**
- Email sending, QR check-in (Phase 6), real-time Kanban (no polling), volunteer point triggers from Kanban done lane
- AI poster generation (behind AI_IMAGE_ENABLED flag, off by default)
- Phase 4 brand kit CRUD — Phase 5 reads brand_kits, does not write it
- Schedule editing after push-live

</spec_lock>

<decisions>
## Implementation Decisions

### Schedule Editor (DESIGN-01)

- **D-01:** Reordering via **Up/Down arrow buttons** on each row — no drag-and-drop library needed.
  Reuses the ProposalNew.tsx budget-row pattern. — **Reversibility:** reversible — UI only.

- **D-02:** Scale-appropriate presets shown as **inline accordion rows** — each preset expands to
  preview sample items; clicking it populates the schedule list. Mirrors the budget quick-fill
  pattern. — **Reversibility:** reversible.

- **D-03:** Schedule item edits **auto-save on blur** — each row saves individually when the user
  leaves the field; no explicit Save button. Consistent with ProposalNew.tsx field pattern.
  — **Reversibility:** reversible.

### AI Mail Template (CAMPAIGN-01/02)

- **D-04:** On AI failure (network error, missing API key, rate limit): return a **degraded static
  fallback template** with a visible banner `"AI unavailable — here is a base template to edit"`.
  The organiser can still proceed and edit. Consistent with Phase 4 D-04: 503 ai_unavailable.
  Never block the campaign pipeline on AI availability. — **Reversibility:** reversible.

- **D-05:** After generation (or fallback), display an **inline editable `<textarea>`** showing
  the `mail_body`. Organiser edits in place and saves manually. Same UX as Phase 4
  BrandKitEditor. — **Reversibility:** reversible.

### Campaign Status Machine (CAMPAIGN-06)

- **D-06:** Pipeline progress shown as a **5-step progress stepper** at the top of the campaign
  page: Schedule → Mail Template → Poster → Registration → Meetup Head Approval. Each step
  shows a ✓/incomplete badge. — **Reversibility:** reversible.

- **D-07:** The push-live button is **visible but disabled for non-Meetup-Head team members**,
  with a tooltip `"Only the Meetup Head can publish"`. The Meetup Head sees it enabled. This
  makes the role requirement transparent rather than mysterious. — **Reversibility:** reversible.

### Kanban Board (TEAM-01/02)

- **D-08:** **3 columns: To Do / In Progress / Done** — maps exactly to `TASK_TODO`,
  `TASK_IN_PROGRESS`, `TASK_DONE` constants in `constants.py`. — **Reversibility:** costly —
  adding a 4th column later requires a DB migration and UI refactor.

- **D-09:** Task status changed via **status pill/badge on the card itself** — click cycles or
  opens a small dropdown to select column. No drag-and-drop (no dnd library in project).
  — **Reversibility:** reversible.

- **D-10:** New tasks created via **inline "+ Add task" row at bottom of the To Do column** —
  compact form (title + assignee + deadline). Consistent with ProposalNew.tsx team row inline
  creation pattern. — **Reversibility:** reversible.

### Registration Link (CAMPAIGN-04)

- **D-11:** Registration link displayed as an **inline card with the full URL + Copy button**
  (`navigator.clipboard.writeText()`). No modal needed. — **Reversibility:** reversible.

- **D-12:** The registration slug URL routes to the **existing `/events/{slug}` route**
  (EventDetail page), resolved by slug instead of ID. No new public route needed in Phase 5.
  — **Reversibility:** costly — the slug URL shape becomes a published contract with any
  external links once an event goes live.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Spec
- `.planning/phases/05-post-acceptance-pipeline-design-campaign-live-workspace/05-SPEC.md` — **Locked requirements — MUST read before planning.** 11 requirements, 38 acceptance criteria, edge coverage, prohibitions.
- `.planning/REQUIREMENTS.md` §DESIGN-01, §CAMPAIGN-01–06, §TEAM-01–04 — canonical requirement text
- `.planning/ROADMAP.md` §Phase 5 — Phase description, success criteria, dependency on Phase 4

### Prior Phase Context (decisions that carry into Phase 5)
- `.planning/phases/04-organisation-profile-brand-kit/04-CONTEXT.md` — D-01 (local filesystem upload primitive), D-04 (google-genai lazy-import, 503 degraded pattern)
- `.planning/phases/04-organisation-profile-brand-kit/04-PATTERNS.md` — Pattern map with analogs for all new files Phase 4 introduces; upload controller, url_safety, BrandKitEditor patterns
- `.planning/STATE.md` — Current position; resolved decisions (storage=local filesystem, LLM=Gemini free tier, no deployment target)

### Backend Models & Schema (all exist, no new migration needed)
- `backend/app/models/__init__.py` §EventScheduleItem (L566–598), §ActivityTask (L527–563), §RegistrationFormField (L601–637), §RegistrationFieldResponse (L640–681), §CampaignPackage (L684–724) — ALL Phase 5 tables already migrated
- `backend/app/constants.py` — TASK_TODO, TASK_IN_PROGRESS, TASK_DONE, CAMPAIGN_DRAFT, FORM_FIELD_TYPES constants

### RBAC & Authorization
- `backend/app/rbac.py` — `is_meetup_head`, `can_manage_activity_required`, `meetup_head_required` decorators from plan 01-05
- `backend/app/controllers/__init__.py` — ALL_BLUEPRINTS list; every new controller must be registered here

### Existing Controller Analogs
- `backend/app/controllers/proposal_controller.py` — Blueprint structure, `can_manage_activity_required` usage pattern
- `backend/app/services/proposal_service.py` — service layer pattern; delete-then-insert under unique constraint

### Frontend Patterns
- `frontend/src/pages/ProposalNew.tsx` — up/down arrow reorder pattern (budget rows), inline team-row creation pattern, auto-save on blur field pattern
- `frontend/src/components/BrandKitEditor.tsx` (Phase 4) — inline editable textarea + save button pattern for AI-generated content
- `frontend/src/lib/api.ts` — adaptMe / snake_case→camelCase adapter; all API calls go through this
- `frontend/src/lib/queries.ts` — TanStack Query hook patterns; invalidateQueries on mutation

### Codebase Architecture
- `.planning/codebase/STACK.md` — Technology stack; TanStack Query 5.x for server state
- `.planning/codebase/CONVENTIONS.md` — Code conventions to follow

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EventScheduleItem` model (models/__init__.py:566) — fully declared with position, time_block, title, owner_id, notes; `schedule_items` backref on Activity already ordered `(position, created_at, id)`
- `ActivityTask` model (models/__init__.py:527) — fully declared with title, description, assignee_id, deadline, status, position; `tasks` backref on Activity already ordered
- `CampaignPackage` model (models/__init__.py:684) — status, approved_by, approved_at, pushed_live_at, registration_slug (unique) already declared
- `RegistrationFormField` + `RegistrationFieldResponse` models — custom fields and responses already declared with `uq_form_field_label` constraint
- `is_meetup_head` predicate (rbac.py) — already built by plan 01-05; `meetup_head_required` decorator available
- `can_manage_activity_required` decorator — already built; covers all team members + org POR holders
- Phase 4 upload infrastructure (`upload_controller.py`, `backend/instance/uploads/`, serve route) — Phase 5 poster upload can reuse identical primitive

### Established Patterns
- **No new Alembic migration needed** — all 5 Phase 5 tables already exist in migration `213804635519`
- Blueprint registration: new controller must be added to `ALL_BLUEPRINTS` in `controllers/__init__.py`
- URL parameter on activity-scoped routes must be `activity_id` — `activity_scoped()` resolves on that name
- `google-genai` with `gemini-2.5-flash`, lazy-imported — already established in Phase 4; same import pattern applies to campaign mail generation
- Degraded AI fallback: 503 ai_unavailable / 503 ai_failed, vendor exception text never reaches client (Phase 4 D-04)
- VITE_* env vars NEVER used for server config — GEMINI_API_KEY is server-side only
- Frontend POR gate: `manageableActivityIds` (not a POR string) controls the organiser-facing UI; `no-por-literals.test.ts` enforces this

### Integration Points
- Activity.schedule_items backref → schedule editor reads/writes via `/api/v1/activities/{id}/schedule`
- Activity.campaign backref (uselist=False) → campaign package read/write via `/api/v1/activities/{id}/campaign/*`
- Activity.tasks backref → Kanban reads/writes via `/api/v1/activities/{id}/tasks`
- Activity.form_fields backref → custom field CRUD via `/api/v1/activities/{id}/form-fields`
- `/events/{slug}` route in EventDetail.tsx — registration slug URL maps here (no new route)
- Phase 4's `GET /orgs/{org_id}/brand-kit` → Phase 5 campaign generation reads BrandKit via org relationship on Activity

</code_context>

<specifics>
## Specific Ideas

- Schedule preset data: serve at `GET /api/v1/schedule-presets?scale={scale}`; data is hardcoded in Python (a dict in constants.py), not a DB table — avoids a migration and is simple enough to be hardcoded for v1
- Registration slug format: `{title-slug}-{6-char-random}` e.g. `ml-meetup-hyd-a3f9b2` — URL-safe, human-readable, collision-resistant with max 3 retry attempts
- Kanban assignment picker: show the activity's team members from ActivityTeamMember; assignee stored as `assignee_id` FK to users

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 5-post-acceptance-pipeline-design-campaign-live-workspace*
*Context gathered: 2026-08-14*
