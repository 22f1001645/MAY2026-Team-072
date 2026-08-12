# Requirements: Ekatva OS — Organiser Dashboard Deepening

**Defined:** 2026-08-02
**Core Value:** A Regional Coordinator can propose, get approved, publish, fill, run, and reimburse a city meetup — and a student can discover, register for, and stay updated on it — entirely inside Ekatva OS.

## v1 Requirements

Requirements for this milestone. Each maps to a roadmap phase (see ROADMAP.md).

### Schema Foundation

- [x] **SCHEMA-01**: Backend adopts Flask-Migrate with a metadata naming convention landed before the first migration is generated
- [x] **SCHEMA-02**: All new tables/columns for this milestone (collaborating orgs, team/roles, tasks, event-design schedule, registration form fields, org profile, social links, brand kit, campaign content, feedback, chat, polls, refresh-token blocklist) are declared in one batch, not per-feature
- [x] **SCHEMA-03**: `seed.py` is split into a destructive-reset function and an idempotent-reference-data function, and refuses to run its destructive path against a non-dev `DATABASE_URL`

### Authorization

- [x] **RBAC-01**: Backend exposes `can_manage_activity(user, activity)`, `can_participate_in_activity(user, activity)`, and `can_manage_org(user, org)` predicates in `rbac.py`
- [x] **RBAC-02**: All new Activity/Org-scoped endpoints (team, tasks, campaign, chat, polls, QR check-in, org profile) are guarded by these predicates, not the coarse existing `organiser_required`
- [x] **RBAC-03**: A distinct `is_meetup_head(user, activity)` check gates campaign-approval actions specifically — Meetup Head is a per-activity authority, separate from general `can_manage_activity`

### Auth & Session

- [x] **AUTH-01**: User's session persists via a short-lived access token + long-lived refresh token, with a single-flight client-side refresh interceptor (no forced re-login, no concurrent-refresh race)
- [x] **AUTH-02**: `/auth/me` returns server-computed capabilities (effective organiser status) instead of the frontend deriving it from a second, independently-maintained POR-type list
- [x] **AUTH-03**: POR taxonomy in `constants.py` adds `Society Deputy Secretary` and `Coordinator` (Core Committee role) at House/Society/Region/Council scope, closing the gap confirmed against the IITM BS Students' Constitution
- [ ] **AUTH-04**: User has an academic-status field (level: foundation/diploma/degree; status: active/on-break/withdrawn) with a termly self-confirmation nudge and admin override, fully decoupled from session/login behavior

### Dashboard

- [ ] **DASH-01**: A user holding an organiser POR can switch between their Student view and Organiser view from the nav, without it affecting any authorization decision (view state only, never sent to the API as an auth input)

### Proposal & Collaboration

- [ ] **PROPOSAL-01**: A proposal can name one or more collaborating Organisations (many-to-many), with exactly one designated as the primary/owning entity. A named collaborating org is `pending` until that org's Secretary/Deputy Secretary/RC accepts — only `accepted` collaborators count toward the Mega-Meetup label (PROPOSAL-03) and fest-collaborator threshold (PROG-02)
- [ ] **PROPOSAL-00**: Any organiser-POR holder of the primary entity (RC, Secretary, Deputy Secretary, Event Lead, Coordinator) can submit a proposal for that entity — not restricted to a single role; the existing region+month quota guardrail is what bounds this, not a role restriction
- [ ] **PROPOSAL-02**: At submission time, the proposer assembles a team from a fixed role catalog (Meetup Head, Co-Head, Designer, Video/Content, PR & Outreach, Logistics, Volunteer Coordinator, Finance) — exactly one Meetup Head is required; other roles are optional and repeatable
- [ ] **PROPOSAL-03**: A proposal naming 3 or more collaborating Organisations is auto-labeled "Mega Meetup" (display tag, independent of activity scale)
- [ ] **PROPOSAL-04**: The admin approval queue shows the team/role roster and collaborating-entity list alongside the existing proposal fields (description, highlights, budget, city) for review
- [ ] **PROPOSAL-05**: The proposer or an admin can reassign the Meetup Head to a different team member at any point before the campaign is pushed live; Meetup Head does not require holding an organiser POR
- [ ] **PROPOSAL-06**: A collaborating org's Secretary/Deputy Secretary/RC receives a notification and can accept or decline the collaboration invite; a declined or still-pending collaborator does not count toward PROPOSAL-03 or PROG-02

### Budget Guardrails

- [ ] **BUDGET-01**: For `local_meetup`/`regional_meetup` scale, proposed budget is hard-capped server-side at `min(requested, capacity × ₹200)`, with an absolute ceiling of ₹20,000 and 100-person capacity — submission is rejected above this, same enforcement style as the existing region/month quota guardrail. `regional_fest` scale is exempt (sponsor-funded model, out of this milestone)

### Event Design Template

- [ ] **DESIGN-01**: Once a proposal is accepted, the organiser fills an event-design template: an ordered schedule (time block + activity + owner), with a small set of starter best-practice presets per activity scale to speed up planning

### Campaign Creator

- [ ] **CAMPAIGN-01**: Organiser can generate a mail-template draft for their accepted event; all factual details (dates, venue, fees) are template-interpolated by the backend, never generated by the model
- [ ] **CAMPAIGN-02**: Mail-template tone/voice is driven by the primary (or, for a Mega Meetup, all collaborating) organisation's brand kit; a multi-entity campaign includes every collaborating entity's logo
- [ ] **CAMPAIGN-03**: Organiser can upload a poster image for their event
- [ ] **CAMPAIGN-04**: Organiser can generate/copy a shareable registration link for their event (works independently of AI provider availability)
- [ ] **CAMPAIGN-05**: Registration form uses a fixed core field set (name, contact) plus up to a handful of organiser-defined optional custom fields (text/dropdown) per meetup — not a full dynamic form-builder
- [ ] **CAMPAIGN-06**: The full campaign package (mail template, poster, registration form) requires the assigned Meetup Head's explicit review and approval before it is pushed live to students — never auto-published

### Organisation Profile & Brand Kit

- [ ] **ORG-01**: Secretary/Deputy Secretary can edit their organisation's profile (bio, logo) and social links, across all four org types (house/society/region/council)
- [ ] **ORG-02**: Social links are validated server-side against an http/https scheme + host allowlist (stored-XSS / open-redirect prevention)
- [ ] **ORG-03**: Secretary/Deputy Secretary can define a brand kit (voice/tone descriptors, color palette, sample phrases) for their organisation, feeding CAMPAIGN-02
- [ ] **ORG-04**: An optional AI-assist button drafts a starting brand kit for organisations that don't have one yet, fully editable before saving — never auto-applied without review

### Activity Teams & Tasks

- [ ] **TEAM-01**: Once the campaign is pushed live (CAMPAIGN-06), the team/task workspace (Kanban-style board) activates for the roster assembled at PROPOSAL-02
- [ ] **TEAM-02**: Any team member can be assigned a task (description + deadline + status column), persisted server-side, replacing the current client-side mock array
- [ ] **TEAM-03**: Team/role status on an Activity grants zero org-wide permissions by default — it is not a second authorization system (Meetup Head's campaign-approval authority per RBAC-03 is the sole named exception)
- [ ] **TEAM-04**: Volunteer point awards require actual crew membership on the Activity (closes today's disconnect where `award_volunteer_points` has no real membership check)

### Event Timeline & Feedback

- [ ] **TIMELINE-01**: An event's timeline is a read-only projection over `AuditLog` + `Registration`/`Attendance`/`Report` data — no new source-of-truth table
- [ ] **TIMELINE-02**: `registration_service`, `attendance_service`, and `expense_service` are backfilled to actually write `AuditLog` rows for the state changes they already claim to record
- [ ] **FEEDBACK-01**: Any team member can draft the post-event reflection (challenges, learnings), but only the assigned Meetup Head can submit it — feeds the existing `Report`, same single-submitter pattern as CAMPAIGN-06
- [ ] **FEEDBACK-02**: Attendee can submit a lightweight post-event rating/feedback, gated on having actually attended (per QR-04's authoritative Attendance record)

### Reimbursement

- [ ] **REIMB-01**: Any team member can draft expense entries against budget lines, but only the assigned Meetup Head can submit the final reimbursement request — consistent with the campaign-approval and report-submission pattern (CAMPAIGN-06, FEEDBACK-01)
- [ ] **REIMB-02**: Reimbursement submission requires a social-post link (photos with attendees, posted to the entity's socials) alongside bill attachments; admin reviews this as supplementary context only — the QR-verified Attendance count (QR-04) remains the sole authoritative number, never overridden by photo review

### QR Check-In

- [ ] **QR-01**: Each registration gets a signed, short-TTL QR payload; the attendee displays it, any team member (not Meetup-Head-exclusive — real events need multiple simultaneous scanners) scans it (never the reverse — a single displayed event QR is a fraud vector against the points ledger)
- [ ] **QR-02**: A QR scan is idempotent — re-scanning doesn't double-count attendance, enforced via the existing unique `Attendance.registration_id` constraint (catch the IntegrityError, don't check-then-insert)
- [ ] **QR-03**: The existing tap-based roster check-in remains available as a manual fallback — QR is additive, never a replacement
- [ ] **QR-04**: The QR-verified `Attendance` count is the sole authoritative number for points, fee-utilisation, and budget-reasonableness checks — admin-reviewed reimbursement photos (REIMB-02) are supplementary evidence only, never a substitute count (prevents attendance-count gaming via non-student photos)

### Progression Gating

- [ ] **PROG-01**: An org's eligibility to propose `regional_fest` scale in a given city unlocks once that org has completed, in that same city, at least one `local_meetup` and at least one `regional_meetup` (computed server-side as `approved AND starts_at < now()`, not `status == completed`, which never flips without a report)
- [ ] **PROG-02**: A `regional_fest` proposal additionally requires at least 6 collaborating Organisations (PROPOSAL-01) named on the proposal
- [ ] **PROG-03**: Reaching fest-tier eligibility sets a server-recorded "Sponsorship & outreach tools unlocked" flag for that org/city, surfaced as UI messaging — the sponsorship/CRM tooling itself stays out of scope this milestone (see v2)
- [ ] **PROG-04**: Progression is enforced server-side — a direct API call to propose a locked scale returns 403, not just a hidden UI option

### Event Announcements, Polls & Queries

- [ ] **CHAT-01**: Organiser/team can post announcements and create polls scoped to an event's registration window
- [ ] **CHAT-02**: Registrants (auto-added to the event's channel on registration, gated by `can_participate_in_activity`) have exactly two self-service actions: submit a query (visible to the team, who respond) and cancel their registration — never peer-to-peer reply/chat, never an open feed (Swiggy-support-ticket model, not WhatsApp)
- [ ] **CHAT-03**: Moderation controls (rate-limit on query submission, audit-log entry) ship in the same phase as the feature itself
- [ ] **CHAT-04**: Announcements/polls/queries use cursor-based polling (10–15s + jitter) via TanStack Query, not WebSockets/Flask-SocketIO

## v2 Requirements

Deferred to a future release. Tracked but not in this milestone's roadmap.

### Campaign Creator

- **CAMPAIGN-07**: Poster *generation* via LLM (as opposed to upload) — deferred until the team enables Google Cloud billing, positioned as a future revenue-model feature rather than a free v1 capability; requires blob storage, which also doesn't exist yet

### Sponsorship & Outreach

- **SPONSOR-01**: Actual sponsorship/outreach CRM tooling (contact tracking, outreach workflows) for fest-tier orgs — PROG-03 only unlocks a flag this milestone; the tooling itself is a future milestone

### Student Dashboard (explicitly out of THIS organiser-focused milestone)

- **PROFILE-01**: Student can edit a persistent home-city field on their profile (for mid-degree relocation); Discover feed defaults to it while still allowing free browsing of other cities — this milestone is organiser-dashboard scoped, so this waits for a student-dashboard milestone

### Admin Analytics & Recognition (known v1 PRD gaps, not part of this milestone)

- **RECOG-01**: Point values (attend/organise/volunteer) become admin-configurable via UI/API instead of the hardcoded `constants.POINTS` dict (PRD FR-G6, SH-priority, never actually shipped)
- **ANLY-01**: Admin analytics dashboard adds a city participation heatmap/ranking (PRD FR-H6, SH-priority, never actually shipped)
- **ANLY-02**: Admin analytics dashboard adds an organiser-activity view — who is actively organising (PRD FR-H7, SH-priority, never actually shipped)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real sponsorship/outreach CRM build-out | Fest-tier only unlocks a flag (PROG-03) this milestone — see SPONSOR-01 in v2 |
| Multi-department fest orchestration beyond named collaborators | PRD Vision Horizon; PROPOSAL-01's many-to-many collaboration covers naming entities, not full cross-department workflow orchestration |
| Logistics resource-availability calendar | PRD Vision Horizon (Phase 2/3) |
| Badge tiers, seasons, leadership scores | PRD Vision Horizon; basic points/leaderboard already shipped |
| Innovation OS (Ekatva Solutions, StudyBuddy) | PRD Vision Horizon |
| Alumni OS (mentorship, alumni network, giving) | PRD Vision Horizon |
| Predictive/leadership-pipeline analytics | PRD Vision Horizon; descriptive analytics already shipped |
| Open/general group chat (WhatsApp/Instagram replacement) | PRD explicit exclusion; chat here is strictly event-registration-window-scoped |
| Real payment or fund disbursement | PRD hard constraint (FR-E6) |
| Native mobile app; full external institutional-records integration | PRD Vision Horizon; academic-status field is self-declared + admin-override, built to be swapped for a future IITM BS feed |
| SEC-level secretary POR roles (Finance/Sports/Cultural/Student Relations/Election & Ethics/Web Ops secretaries) | Constitution confirms these exist, but SEC has "least operational visibility today" per PRD (Vision Horizon consumer) |
| Paradox / national-fest POR roles (Paradox Secretary, Paradox Core/Deputy Core) | National fest is explicitly out of v1 scope per PRD activity-scale table |
| AI poster *generation* (vs. upload) | No free tier (~$0.039/image), needs GCP billing on a graded course project — see CAMPAIGN-07 in v2 |
| Full dynamic registration form-builder | CAMPAIGN-05 uses fixed core fields + a bounded custom-field set instead — smaller schema, ships this milestone |
| Student home-city profile editing | Organiser-dashboard milestone scope boundary — see PROFILE-01 in v2 |
| Offline QR scanning | Silently drops attendance if unaddressed; scoped out explicitly rather than half-built |

## Traceability

Populated during roadmap creation — see ROADMAP.md.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCHEMA-01, SCHEMA-02, SCHEMA-03 | Phase 1 | Complete |
| RBAC-01, RBAC-02, RBAC-03 | Phase 1 | Complete |
| AUTH-01, AUTH-02, AUTH-03, AUTH-04 | Phase 2 | Pending |
| DASH-01 | Phase 2 | Pending |
| PROPOSAL-00, PROPOSAL-01, PROPOSAL-02, PROPOSAL-03, PROPOSAL-04, PROPOSAL-05, PROPOSAL-06 | Phase 3 | Pending |
| BUDGET-01 | Phase 3 | Pending |
| ORG-01, ORG-02, ORG-03, ORG-04 | Phase 4 | Pending |
| DESIGN-01 | Phase 5 | Pending |
| CAMPAIGN-01, CAMPAIGN-02, CAMPAIGN-03, CAMPAIGN-04, CAMPAIGN-05, CAMPAIGN-06 | Phase 5 | Pending |
| TEAM-01, TEAM-02, TEAM-03, TEAM-04 | Phase 5 | Pending |
| QR-01, QR-02, QR-03, QR-04 | Phase 6 | Pending |
| TIMELINE-01, TIMELINE-02, FEEDBACK-01, FEEDBACK-02 | Phase 6 | Pending |
| REIMB-01, REIMB-02 | Phase 6 | Pending |
| PROG-01, PROG-02, PROG-03, PROG-04 | Phase 7 | Pending |
| CHAT-01, CHAT-02, CHAT-03, CHAT-04 | Phase 8 | Pending |

**Coverage:**

- v1 requirements: 52 total (corrected — `PROPOSAL-00` was added after the original 51-count was written; see ROADMAP.md's note)
- Mapped to phases: 52
- Unmapped: 0 ✓

---
*Requirements defined: 2026-08-02*
*Last updated: 2026-08-03 after roadmap creation — all 52 requirements mapped to 8 phases*
