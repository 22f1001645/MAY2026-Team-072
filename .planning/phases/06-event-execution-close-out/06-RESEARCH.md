# Phase 6 Research

## Summary
Phase 6 builds on an already well-structured codebase. The QR scan backend endpoint (`POST /events/:id/scan`) and `scan_qr` service already exist and are fully implemented. The `Expense`, `Report`, `EventFeedback`, and `Attendance` models are defined. `QRCodeCanvas` from `qrcode.react` is already imported in `MyRegistrations.tsx`. Primary work: (1) QR scanner UI component; (2) timeline GET endpoint; (3) expense draft PATCH + report PATCH endpoints; (4) feedback POST endpoint; (5) assembling the new ManageEvent sections and CheckIn page.

## QR Check-In (QR-01, QR-02, QR-03, QR-04)

### Backend (ALREADY EXISTS)
- `POST /api/v1/events/<activity_id>/scan` — registration_controller.py line 43
- Service: `attendance_service.scan_qr()` — returns `{"status": "success"|"duplicate", "student_name": "..."}`
- On invalid registration: raises ApiError("Invalid QR code for this event", "invalid_qr", 400)
- Guard: `@can_manage_activity_required`
- **No new backend endpoint needed for QR scan.**

### Frontend (NEEDS BUILDING)
- `CheckIn.tsx` at `/events/:id/checkin` — ManageEvent.tsx line 47 already links here
- QR scanner: `@yudiel/react-qr-scanner` — need to confirm in package.json
- Student QR ticket: `qrcode.react` already installed (MyRegistrations.tsx line 3)
- QR ticket encodes `registration.id` as the value

## Event Timeline (TIMELINE-01, TIMELINE-02)

### Backend (NEEDS BUILDING)
- New `GET /api/v1/activities/<id>/timeline` endpoint
- Data sources: AuditLog, Registration (first), Attendance (each check-in), Report, Expense
- All tables have `created_at` via Base model
- Sort all entries by `created_at` ascending
- Guard: `@auth_required`

## Reimbursement (REIMB-01, REIMB-02)

### Backend Changes Needed
- Add `social_post_url = db.Column(db.String(500), nullable=True)` to `Expense` model
- New: `PATCH /api/v1/activities/<id>/expenses` — bulk upsert drafts + optional submit
  - Body: `{expenses: [{id?, label, amount, bill_name}], submit?: bool, social_post_url?: str}`
  - Submit gate: caller must be Meetup Head + social_post_url required
- Existing `POST /expenses` remains for backward compat

## Post-Event Reflection (FEEDBACK-01)

### Backend Changes Needed
- `Report` model already has `challenges` and `learnings` columns (nullable Text)
- Need `PATCH /activities/<id>/report` for draft auto-save + submit
  - Draft: update challenges/learnings only
  - Submit: set status="submitted", verify Meetup Head
- Pattern: upsert (create Report if not exists, then update)

## Attendee Feedback (FEEDBACK-02)

### Backend Needed
- `EventFeedback` model exists with UniqueConstraint(activity_id, user_id)
- Need `POST /activities/<id>/feedback` — body: `{rating: int, comment: str}`
  - Guard: @auth_required, check Attendance record exists for this user
  - Return 409 on duplicate submission (UniqueConstraint)
- Need `GET /activities/<id>/feedback/me` — return user's own feedback or null

## QR Ticket Generation (D-03)

### Frontend (PARTIALLY DONE)
- `qrcode.react` installed, `QRCodeCanvas` already imported in MyRegistrations.tsx
- `QRTicket` component: show teal QR (size=180, fgColor="#5CE6C9") for upcoming confirmed regs
- When `registration.attended === true`: show "Attended ✓" badge instead

## Validation Architecture
- QR-01/02/03: scan returns correct status codes, exactly one Attendance row per student
- QR-04: QR-verified count feeds points and fee-utilisation
- TIMELINE-01/02: chronological order, all event types present
- FEEDBACK-02: 409 on double-submit, 403 for non-attendees
- REIMB-01/02: submit blocked without social_post_url, only Meetup Head can submit

## Risks & Dependencies
1. `@yudiel/react-qr-scanner` — must confirm installed in package.json
2. Expense "draft" status: must default new rows to draft, not retroactively change existing submitted rows
3. PATCH /activities/:id/report: needs upsert pattern (create Report row if none exists)
4. ManageEvent links to `/events/:id/expenses` — this route does not exist; fold into ManageEvent as inline accordion
5. App.tsx needs new route for `/events/:id/checkin`
