# Phase 6: Event Execution & Close-Out - Discussion Log

**Date:** 2026-08-18
**Session duration:** ~10 minutes
**Areas discussed:** QR Check-In UX, Event Timeline, Reimbursement draft/submit flow, Post-event reflection & attendee feedback

---

## Area 1: QR Check-In UX

**Q1: Where does the QR scanner live?**
Options: New /events/:id/checkin page with tabs | Panel on ManageEvent | Standalone modal
**Selected:** New dedicated CheckIn page at the existing /events/:id/checkin route (EventDetail already links here)
**Notes:** Two tabs -- QR Scanner and Roster (fallback). Satisfies QR-03 structurally.

**Q2: Scan result feedback?**
Options: Inline success card | Toast only | Toast for success + persistent error card for failures
**Selected:** (Recommended) Toast for success + persistent error card for failures
**Notes:** Camera stays live. Errors need reading time; successes are glanceable.

**Q3: How is the attendee's QR surfaced?**
Options: My Registrations page (qrcode.react) | Via email/notification | You decide
**Selected:** (Recommended) My Registrations page -- inline above registration card, qrcode.react encodes registration.id

**Q4: Where on My Registrations does the QR appear?**
Options: Inline above registration card (recommended) | Dedicated /ticket page | You decide
**Selected:** (Recommended) Inline above the registration card, only for upcoming/confirmed events

**Continue?** Next area

---

## Area 2: Event Timeline

**Q1: Where does the timeline live in the UI?**
Options: Tab on EventDetail/ManageEvent | Dedicated section on ManageEvent (recommended) | Separate route
**Selected:** (Recommended) Scrollable section at the bottom of ManageEvent (organiser-only)

**Q2: How is timeline data served?**
Options: New GET /activities/:id/timeline endpoint (recommended) | Frontend assembles from multiple endpoints | You decide
**Selected:** (Recommended) New GET /activities/:id/timeline endpoint -- backend assembles and sorts the projection

**Q3: Which event types appear?**
Options: All 7 individual events (recommended) | Collapsed check-in milestones | You decide
**Selected:** (Recommended) proposal submitted -> admin approved -> first registration -> campaign pushed live -> each check-in -> report submitted -> reimbursement submitted

**Continue?** Next area

---

## Area 3: Reimbursement draft/submit flow

**Q1: Where does the reimbursement UI live?**
Options: Section on ManageEvent (recommended) | Separate /reimbursement route | You decide
**Selected:** (Recommended) Reimbursement accordion/panel on ManageEvent

**Q2: How are bills submitted (REIMB-02)?**
Options: Social URL text input + bill_name text field (recommended) | File upload for bills + social URL | Social URL + bill description only
**Selected:** (Recommended) Text input for social-post URL (validated via url_safety.py) + existing bill_name text field

**Q3: Where does social_post_url live in the schema?**
Options: Nullable column on expenses table (recommended) | New ReimbursementSubmission model | You decide
**Selected:** (Recommended) Add social_post_url as nullable column on expenses table -- required only on Meetup Head final submit

**Continue?** Next area

---

## Area 4: Post-Event Reflection & Attendee Feedback

**Q1: Where does the reflection UI live (FEEDBACK-01)?**
Options: Panel on ManageEvent (recommended) | Dedicated /report page | You decide
**Selected:** (Recommended) Post-Event Reflection panel on ManageEvent -- challenges/learnings textareas, aria-disabled submit for non-Meetup-Head

**Q2: Where does the attendee feedback form live (FEEDBACK-02)?**
Options: Section on EventDetail (recommended) | Separate /feedback route | You decide
**Selected:** (Recommended) Section on EventDetail -- visible after event date, gated on Attendance record

**Q3: Attendee rating scale?**
Options: 1-5 integer stars (recommended) | 1-10 NPS score | Emoji reactions
**Selected:** (Recommended) 1-5 integer stars -- maps directly to EventFeedback.rating Integer column

**Continue?** I'm ready for context

---

## Claude's Discretion

None -- user selected recommended options throughout.

## Deferred Ideas

None -- discussion stayed within phase scope.
