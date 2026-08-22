# Phase 6: Event Execution & Close-Out - Context

**Gathered:** 2026-08-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase covers the day-of event operations and post-event close-out:

1. **QR Check-In** — attendee displays a signed QR code from My Registrations; any team member scans it on the CheckIn page; tap-based roster fallback always available.
2. **Event Timeline** — read-only projection over existing records (AuditLog + Registration + Attendance + Report + Expense) assembled by a new backend endpoint; no new source-of-truth table.
3. **Post-Event Reflection** — any team member drafts challenges/learnings on ManageEvent; only the Meetup Head can submit.
4. **Attendee Feedback** — star rating (1-5) + optional comment on EventDetail; gated on having an Attendance record; one submission per attendee.
5. **Reimbursement** — any team member drafts expense rows; Meetup Head submits the final request with a social-post URL (validated) and bill references; social_post_url stored on the Expense row.

The QR-04 attendance count is the sole authoritative number for points, fee utilisation, and budget reasonableness. Photo evidence (social post link) is supplementary context for admin review only.

</domain>

<decisions>
## Implementation Decisions

### QR Check-In (QR-01/02/03/04)

- **D-01:** QR scanner lives at the **existing `/events/:id/checkin` route** (already linked from EventDetail at line 244) as a new `CheckIn` page with two tabs: **QR Scanner** (camera, `@yudiel/react-qr-scanner`) and **Roster** (existing tap-based check-in). QR-03 is satisfied structurally -- the roster tab is always present, not a fallback hidden behind camera denial. -- **Reversibility:** reversible.

- **D-02:** Scan result feedback: **toast for success** (glanceable, scanner stays live) + **persistent error card for failures** (duplicate scan, invalid/wrong-event code -- these need reading time). The scanner camera stays running between scans. -- **Reversibility:** reversible.

- **D-03:** The attendee's QR code is rendered using `qrcode.react` (already in STACK.md) **inline above the registration card on My Registrations**, encoding the `registration.id`. Renders only for confirmed registrations whose event is upcoming. No new route needed for the student side. -- **Reversibility:** reversible.

### Event Timeline (TIMELINE-01/TIMELINE-02)

- **D-04:** Timeline lives as a **scrollable section at the bottom of ManageEvent** (organiser-only view). Students do not see the timeline; the requirement's "anyone with access" resolves to the organiser surface for this milestone. -- **Reversibility:** reversible.

- **D-05:** A new **`GET /api/v1/activities/:id/timeline`** endpoint assembles and sorts the projection server-side and returns an ordered list of `{type, actor, description, at}` events. Frontend renders a simple vertical list from this single response. -- **Reversibility:** reversible.

- **D-06:** Event types in the timeline (in chronological order): proposal submitted -> admin approved -> first registration -> campaign pushed live -> each individual check-in (with student name + method) -> report submitted -> reimbursement submitted. All sourced from existing AuditLog rows (after TIMELINE-02 backfill) plus direct queries on Registration and Attendance for events that predate the AuditLog backfill. -- **Reversibility:** reversible.

- **D-07 (TIMELINE-02):** The three services that claim to record audit events but do not actually write AuditLog rows -- `registration_service`, `attendance_service`, and `expense_service` -- are backfilled in this phase. New AuditLog writes use the existing AuditLog model and the `note` JSON column for structured detail (consistent with the Phase 2 decision). -- **Reversibility:** reversible.

### Reimbursement (REIMB-01/REIMB-02)

- **D-08:** Reimbursement UI lives as a **Reimbursement accordion/panel on ManageEvent**, showing draft expense rows (label + amount + bill_name) with an inline add-row affordance. The Meetup Head sees a Submit Reimbursement button; other team members see it disabled with a tooltip (consistent with Phase 5 D-07 pattern for push-live gate). -- **Reversibility:** reversible.

- **D-09:** Bills are submitted as **text references only** (`bill_name` field, already on the Expense model). REIMB-02 social-post link is a text input validated server-side via `url_safety.py` (reuses Phase 4 ORG-02 allowlist). No file upload for bills in Phase 6. -- **Reversibility:** reversible.

- **D-10:** `social_post_url` is added as a **nullable column on the expenses table** (new Alembic migration required). It is nullable on draft rows and required (server-validated, non-empty + url_safety pass) only on the Meetup Head final submit action. -- **Reversibility:** costly -- `social_post_url` on Expense becomes part of the admin reimbursement review payload once rows exist with it populated; removing it later would break the admin view.

- **D-11:** The draft/submit state machine follows `EXPENSE_DRAFT -> submitted` (wiring the already-declared `EXPENSE_DRAFT` constant). Any team member can create/edit draft expense rows. The Meetup Head submit action transitions all draft rows to submitted in one call, alongside the social_post_url. The existing `EXPENSE_FLOW` (submitted -> verified -> approved -> paid) is unchanged. -- **Reversibility:** one-way -- once draft rows exist and the submit endpoint is shipped, reversing the two-step (draft->submit) model requires a migration and client update.

### Post-Event Reflection (FEEDBACK-01)

- **D-12:** Reflection UI is a **Post-Event Reflection panel on ManageEvent** with `challenges` and `learnings` textareas. Any team member can save a draft (auto-save on blur, consistent with Phase 5 D-03). The Meetup Head sees a Submit Report button enabled; other team members see it `aria-disabled` with tooltip (same pattern as Phase 5 push-live gate). -- **Reversibility:** reversible.

### Attendee Feedback (FEEDBACK-02)

- **D-13:** Attendee feedback form lives in a **section on EventDetail** (student-facing), visible only after the event date and only when the viewing student has an Attendance record. Uses a **1-5 star integer rating** (maps directly to `EventFeedback.rating` Integer column) + optional comment textarea. The `uq_event_feedback` unique constraint enforces one-submission-per-attendee at the DB level; the service catches the IntegrityError and returns a friendly 409 (same idempotency pattern as QR-02). -- **Reversibility:** reversible.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` §QR Check-In, §Event Timeline & Feedback, §Reimbursement -- canonical requirement text for QR-01..04, TIMELINE-01/02, FEEDBACK-01/02, REIMB-01/02
- `.planning/ROADMAP.md` §Phase 6 -- Phase goal, success criteria, dependency on Phase 5

### Backend Models (all exist; one migration needed for social_post_url)
- `backend/app/models/__init__.py` §Attendance (L786) -- `method` column (qr/manual), unique `registration_id`, `checked_in_by`
- `backend/app/models/__init__.py` §Registration (L746) -- `status`, `attendance` backref (uselist=False)
- `backend/app/models/__init__.py` §Expense (L834) -- `label`, `amount`, `status`, `bill_name`, `submitted_by`; `social_post_url` to be added
- `backend/app/models/__init__.py` §Report (L899) -- `challenges`, `learnings`, `status` (draft/submitted), `submitted_by`, `submitted_at`
- `backend/app/models/__init__.py` §EventFeedback (L985) -- `rating`, `comment`, `uq_event_feedback` unique constraint
- `backend/app/models/__init__.py` §AuditLog (L962) -- `entity`, `entity_id`, `action`, `actor_id`, `actor_name`, `note` (JSON detail)

### Backend Constants
- `backend/app/constants.py` -- `EXPENSE_DRAFT`, `EXPENSE_FLOW`, `EXPENSE_SUBMITTED`, `REPORT_DRAFT`, `REPORT_SUBMITTED`, `ATTENDANCE_METHOD_QR`, `ATTENDANCE_METHOD_MANUAL`

### Existing Services (Phase 6 extends/backfills these)
- `backend/app/services/attendance_service.py` -- `scan_qr()` (L91, fully implemented, delegates to `check_in()`), `check_in()` (L51)
- `backend/app/services/expense_service.py` -- `submit_expense()` (L8), `advance()` (L28), `for_activity()` (L57); Phase 6 adds draft creation and Meetup Head submit
- `backend/app/services/registration_service.py` -- TIMELINE-02 backfills AuditLog writes here
- `backend/app/services/attendance_service.py` -- TIMELINE-02 backfills AuditLog writes here

### RBAC & Authorization
- `backend/app/rbac.py` -- `meetup_head_required` decorator (gates report submit, reimbursement submit); `can_manage_activity_required` (gates draft creation and timeline read)
- `backend/app/controllers/__init__.py` -- ALL_BLUEPRINTS list; every new controller must be registered here

### Frontend Patterns
- `frontend/src/pages/ManageEvent.tsx` -- existing event management page; Phase 6 adds Timeline, Reflection, and Reimbursement panels here
- `frontend/src/pages/EventDetail.tsx` -- existing student-facing event page; Phase 6 adds QR code display and attendee feedback section here; already links to /events/:id/checkin (L244)
- `frontend/src/lib/api.ts` -- `scanQr()` (L563) and `checkIn()` (L558) already implemented; `expensesFor()` and `submitExpense()` (L590-592) exist
- `frontend/src/components/ui.tsx` -- Card, Badge, existing UI primitives
- `frontend/src/pages/KanbanWorkspace.tsx` -- aria-disabled + tooltip pattern for role-gated buttons (reuse for Meetup Head gates)

### QR Libraries (resolved in STACK.md)
- `.planning/codebase/STACK.md` -- `@yudiel/react-qr-scanner` 2.6.0 (scan), `qrcode.react` 4.2.0 (render); both live-verified maintained

### Prior Phase Context
- `.planning/phases/05-post-acceptance-pipeline-design-campaign-live-workspace/05-CONTEXT.md` -- D-07 (aria-disabled + tooltip for role-gated buttons), D-03 (auto-save on blur), push-live gate pattern
- `.planning/STATE.md` -- "any team member drafts, only the Meetup Head submits" rule; AuditLog note column is JSON

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scan_qr()` in `attendance_service.py` (L91) -- fully implemented; handles wrong-event 400, duplicate returns {status: "duplicate"} with student name; Phase 6 only needs the frontend CheckIn page and QR rendering
- `@yudiel/react-qr-scanner` and `qrcode.react` -- already in package.json per STACK.md; no new dependencies
- `EventFeedback` model -- fully declared with `uq_event_feedback` unique constraint; service + controller to be written in Phase 6
- `Report` model -- `challenges`, `learnings`, `status`, `submitted_by`, `submitted_at` all declared; service layer exists but lacks draft-mode endpoints
- `EXPENSE_DRAFT` constant -- declared and annotated with a comment pointing to Phase 6 as the consumer
- `url_safety.py` (`is_safe_url()`) -- Phase 4 social link validator; reuse directly for `social_post_url` validation
- `meetup_head_required` decorator -- already built in Phase 1 plan 01-05; gates report submit and reimbursement submit
- `Registration.to_dict()` includes `attended: bool` -- frontend can gate the QR render and feedback form without an extra API call

### Established Patterns
- **IntegrityError idempotency** -- `scan_qr()` catches re-scan via attendance check; EventFeedback one-submission uses same catch-IntegrityError pattern
- **aria-disabled + tooltip for role-gated buttons** -- established in Phase 5; use for Report submit and Reimbursement submit buttons
- **Auto-save on blur** -- established in Phase 5 (ScheduleRow); use for Report draft textareas
- **AuditLog JSON note** -- established in Phase 2; note column carries structured JSON detail for TIMELINE-02 backfill writes
- **New Alembic migration needed** -- for `social_post_url` column on expenses table only
- Blueprint registration: new controllers must be added to ALL_BLUEPRINTS in controllers/__init__.py
- URL parameter on activity-scoped routes must be `activity_id`

### Integration Points
- `GET /api/v1/activities/:id/timeline` (new) -- assembles projection from AuditLog + Registration + Attendance + Report + Expense; read by ManageEvent timeline section
- `/events/:id/checkin` route (new page CheckIn.tsx) -- uses existing `scanQr()` and `checkIn()` API calls
- `POST /api/v1/activities/:id/feedback` (new) -- creates EventFeedback; guarded by attendance check in service
- `PATCH /api/v1/activities/:id/report` (new or extend) -- draft save (any team member) and submit (meetup_head_required)
- `POST /api/v1/activities/:id/expenses/draft` (new) -- creates EXPENSE_DRAFT row; any team member
- `POST /api/v1/activities/:id/expenses/submit` (new) -- transitions all drafts to submitted + attaches social_post_url; meetup_head_required
- `Registration.attendance` backref (uselist=False) -- used by EventDetail to gate the attendee feedback form render

</code_context>

<specifics>
## Specific Ideas

- **CheckIn page layout:** Two tabs -- "QR Scanner" (full-width camera, @yudiel/react-qr-scanner) and "Roster" (existing tap check-in). Camera stays live between scans. Toast on success, persistent error card on failure.
- **QR code on My Registrations:** `<QRCodeSVG value={registration.id} size={200} />`, rendered inline above the registration card, only for upcoming/confirmed events.
- **Timeline endpoint response shape:** `[{type: "proposal_submitted"|"admin_approved"|"registration"|"campaign_live"|"check_in"|"report_submitted"|"reimbursement_submitted", actor: string|null, description: string, at: ISO8601}]` sorted ascending by `at`.
- **Expense draft rows:** Inline add-row at bottom of draft list (same pattern as KanbanBoard "+ Add task" row). Label + amount + bill_name fields.
- **social_post_url validation:** Server calls `is_safe_url()` from `url_safety.py` before accepting reimbursement submit -- same rejection codes (social_url_scheme / social_url_host) as Phase 4.
- **Attendee feedback gating:** Frontend checks `registration.attended === true` (already in Registration.to_dict()) before rendering feedback form on EventDetail. Backend independently verifies Attendance row existence in the service.

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 6-event-execution-close-out*
*Context gathered: 2026-08-18*
