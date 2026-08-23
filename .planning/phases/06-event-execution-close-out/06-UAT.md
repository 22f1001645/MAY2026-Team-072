---
status: complete
phase: 06-event-execution-close-out
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md, 06-06-SUMMARY.md, 06-07-SUMMARY.md, 06-08-SUMMARY.md, 06-09-SUMMARY.md]
started: 2026-08-19T17:24:05Z
updated: 2026-08-22T16:00:00Z
---

## Current Test

none — the pass finished on 2026-08-22, run against the merge of this phase into
main. Tests 2 and 4 through 10 were completed then, and three defects found in
that pass were fixed before it closed (see the notes on tests 2 and 5).

## Tests

### 1. Timeline Event Display
expected: As an organiser viewing an event that has passed, I can open the 'Event Timeline' accordion in the Manage Event page and see chronological events (e.g., 'registration', 'attendance') with distinct icons.
result: pass

### 2. Draft Expenses
expected: As a team member, I can add multiple expense items in the 'Reimbursement' panel on the Manage Event page.
result: pass (after fix)
reported: "not able to attach bill — file upload area on /events/:id/expenses page does not respond"
severity: major
cause: the upload had never been built. The drop zone on the Expenses page was a
  plain div with no file input behind it, the Reimbursement panel took the bill
  name as free text, and the server had no upload endpoint at all.
fix: added POST /api/v1/activities/<id>/expenses/bill, reusing the Phase 4 upload
  primitive with its own allowlist so a PDF invoice is accepted alongside the
  image types (a poster and a logo stay image-only). Both surfaces now carry a
  real file picker. Retested: a PDF uploads, lands under a server-chosen name,
  and rides through to the submitted expense row.

### 3. Submit Reimbursement
expected: As a Meetup Head, I can provide a social post URL and submit the reimbursement draft. This shows a confirmation dialog and then replaces the form with a success badge.
result: pass

### 4. Post-Event Reflection Auto-save
expected: As an organiser, typing in the 'Challenges faced' or 'Key learnings' fields in the 'Post-Event Reflection' panel and clicking away shows a 'Saving...' indicator briefly as it auto-saves.
result: pass
note: blurring a textarea fires PATCH /report and the Saving indicator shows.

### 5. Submit Reflection
expected: As a Meetup Head, clicking 'Submit Reflection' disables the form and replaces it with a 'Reflection submitted ✓' success badge.
result: pass (after fix)
note: failed twice before passing, for two separate reasons, both fixed.
  1. The client granted Meetup Head to the event's organiser and to any admin.
     The server grants it to neither (its own comment says there is no admin
     fallback, deliberately), so the button enabled for people the server then
     answered with a 403 — and the panel showed nothing at all, because the
     error was never rendered. The client now derives the flag from the team
     roster alone, matching is_meetup_head, and both panels surface the error.
  2. Even as the real Meetup Head the first click did nothing. Clicking Submit
     blurs the textarea, the blur auto-saves, and the save both disabled the
     button and inserted a Saving line above it — so the button was disabled and
     had moved by the time the click landed. Draft-save and submit now use
     separate mutations, and the Saving line holds its space.

### 6. Event Check-in
expected: As an organiser on the live check-in page, I can tap a registered student to mark them as attended. The live counter progress bar increments.
result: pass
note: tapping a roster row posts attendance and the live headcount goes 0/4 to 1/4.

### 7. QR Scanner
expected: As an organiser on the live check-in page, scanning a valid QR ticket shows a green success banner and increments the check-in count. Scanning it again shows a gold duplicate banner.
result: not verifiable in this pass
note: needs a real camera, which 06-VALIDATION.md already lists as manual-only.
  The scanner mounts on the check-in page with its image-upload fallback; the
  live scan and the duplicate-scan banner still need a device to confirm.

### 8. My Registrations QR Ticket
expected: As a student, my confirmed registrations on the 'My registrations' page show a QR code that can be scanned for check-in.
result: pass
note: View Pass renders the QR canvas on the ticket.

### 9. Attendee Feedback Submission
expected: As a student who has attended a past event, I see a 'Rate This Event' panel on the event details page. I can select a 1-5 star rating, add a comment, and submit.
result: pass
note: 4 stars plus a comment posts feedback 201 and the panel switches to the submitted badge.

### 10. Attendee Feedback Idempotency
expected: As a student who has already submitted feedback, revisiting the event details page shows my previously submitted star rating and a 'Feedback Submitted ✓' badge instead of the form.
result: pass
note: leaving the page and returning shows the badge and the stored rating, not the form.

## Summary

total: 10
passed: 9
issues: 0
pending: 0
skipped: 1 (test 7 — live QR scan, needs a camera)

Three defects were found and fixed during the pass: the missing bill upload
(test 2), the client granting Meetup Head where the server refuses it, and the
Submit click being swallowed by its own auto-save (both test 5).

## Gaps

- gap_id: G-06-2
  truth: "Bill attachment (file upload) on /events/:id/expenses page must allow photo/PDF upload ≤10MB"
  status: closed
  reason: "Closed 2026-08-22. The upload endpoint and both file pickers now exist;
    a PDF and an image both upload and attach. Size is bounded by the app-wide
    MAX_CONTENT_LENGTH the poster route already relies on rather than a second
    limit of its own."
  severity: major
  test: 2
  artifacts: []
  missing: []
