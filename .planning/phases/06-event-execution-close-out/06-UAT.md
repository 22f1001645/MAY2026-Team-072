---
status: testing
phase: 06-event-execution-close-out
source: [06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md, 06-06-SUMMARY.md, 06-07-SUMMARY.md, 06-08-SUMMARY.md, 06-09-SUMMARY.md]
started: 2026-08-19T17:24:05Z
updated: 2026-08-19T12:00:01Z
---

## Current Test

number: 4
name: Post-Event Reflection Auto-save
expected: |
  As an organiser, typing in the 'Challenges faced' or 'Key learnings' fields in the 'Post-Event Reflection' panel and clicking away shows a 'Saving...' indicator briefly as it auto-saves.
awaiting: user response

## Tests

### 1. Timeline Event Display
expected: As an organiser viewing an event that has passed, I can open the 'Event Timeline' accordion in the Manage Event page and see chronological events (e.g., 'registration', 'attendance') with distinct icons.
result: pass

### 2. Draft Expenses
expected: As a team member, I can add multiple expense items in the 'Reimbursement' panel on the Manage Event page.
result: issue
reported: "not able to attach bill — file upload area on /events/:id/expenses page does not respond"
severity: major

### 3. Submit Reimbursement
expected: As a Meetup Head, I can provide a social post URL and submit the reimbursement draft. This shows a confirmation dialog and then replaces the form with a success badge.
result: pass

### 4. Post-Event Reflection Auto-save
expected: As an organiser, typing in the 'Challenges faced' or 'Key learnings' fields in the 'Post-Event Reflection' panel and clicking away shows a 'Saving...' indicator briefly as it auto-saves.
result: [pending]

### 5. Submit Reflection
expected: As a Meetup Head, clicking 'Submit Reflection' disables the form and replaces it with a 'Reflection submitted ✓' success badge.
result: [pending]

### 6. Event Check-in
expected: As an organiser on the live check-in page, I can tap a registered student to mark them as attended. The live counter progress bar increments.
result: [pending]

### 7. QR Scanner
expected: As an organiser on the live check-in page, scanning a valid QR ticket shows a green success banner and increments the check-in count. Scanning it again shows a gold duplicate banner.
result: [pending]

### 8. My Registrations QR Ticket
expected: As a student, my confirmed registrations on the 'My registrations' page show a QR code that can be scanned for check-in.
result: [pending]

### 9. Attendee Feedback Submission
expected: As a student who has attended a past event, I see a 'Rate This Event' panel on the event details page. I can select a 1-5 star rating, add a comment, and submit.
result: [pending]

### 10. Attendee Feedback Idempotency
expected: As a student who has already submitted feedback, revisiting the event details page shows my previously submitted star rating and a 'Feedback Submitted ✓' badge instead of the form.
result: [pending]

## Summary

total: 10
passed: 2
issues: 1
pending: 7
skipped: 0

## Gaps

- gap_id: G-06-2
  truth: "Bill attachment (file upload) on /events/:id/expenses page must allow photo/PDF upload ≤10MB"
  status: failed
  reason: "User reported: not able to attach bill — Drop zone does not respond"
  severity: major
  test: 2
  artifacts: []
  missing: []
