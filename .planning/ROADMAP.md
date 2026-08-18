# Roadmap: Ekatva OS — Organiser Dashboard Deepening (v1.1)

## Overview

Ekatva OS already ships the city-meetup spine: propose → admin approval → auto-publish → discover → register → check in → reimburse → recognise. This milestone deepens the organiser half of that spine into a real operating surface. The journey runs foundation-first: make the database safely changeable and make authorization resource-scoped (nothing else in the milestone is deployable without both), then stabilise the session and nav shell every later screen rides on. From there the milestone follows the actual lifecycle of a meetup — a proposal that names collaborating entities, assembles a team and respects a budget ceiling; an accepted proposal that becomes a designed, brand-driven, Meetup-Head-approved campaign that pushes live and activates a Kanban workspace; a live event that is run at the door with QR check-in, narrated by a timeline, and closed out with reflection, attendee feedback and an evidence-backed reimbursement. The last two phases add the two capabilities with the least coupling and the most external uncertainty: progression gating (which needs real completed-activity data to be meaningful) and the event announcement/poll/query channel (whose polling design depends on an unconfirmed deployment target).

## Phases

**Phase Numbering:**

- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Migration & Authorization Foundation** - Schema becomes changeable without data loss, and authorization becomes activity/org-scoped
- [x] **Phase 2: Identity, Session & Dashboard Shell** - Sessions persist, organiser status comes from the server, and POR holders can switch views (completed 2026-08-12, see 02-VERIFICATION.md)
- [x] **Phase 3: Proposal Collaboration, Team Roster & Budget Guardrails** - A proposal carries collaborating entities, a consented team roster, and a capped budget (completed 2026-08-12)
- [ ] **Phase 4: Organisation Profile & Brand Kit** - Every org type gets an editable identity and a brand kit that drives campaigns
- [ ] **Phase 5: Post-Acceptance Pipeline (Design → Campaign → Live → Workspace)** - Accepted proposals become approved live campaigns with an active team workspace
- [ ] **Phase 6: Event Execution & Close-Out** - QR check-in at the door, a full event timeline, and evidence-backed feedback and reimbursement
- [ ] **Phase 7: Progression Gating** - Fest-scale proposals unlock from an org's own track record, enforced server-side
- [ ] **Phase 8: Event Announcements, Polls & Queries** - One official, moderated event channel — never a chat room

## Phase Details

### Phase 1: Migration & Authorization Foundation

**Goal**: The team can change the database schema without destroying anyone's data, and the backend can answer "can this specific person act on this specific activity or org?"
**Depends on**: Nothing (first phase)
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, RBAC-01, RBAC-02, RBAC-03
**Success Criteria** (what must be TRUE):

  1. A developer can add *and drop* a column and apply it with `flask db upgrade` on SQLite without any teammate losing existing data — the metadata naming convention is in place before the first migration is generated.
  2. Running the destructive reset against a non-development `DATABASE_URL` exits non-zero and refuses; reference data (Houses/Regions/Cities) can be re-seeded idempotently against any environment.
  3. Every table and column this milestone needs exists after a single reseed — no later phase requires a second destructive reset.
  4. A plain student with no organiser POR is granted `can_participate_in_activity` for an event they registered for, and denied `can_manage_activity` for an event they are not crew on; a Secretary of org A is denied `can_manage_org` for org B.
  5. `is_meetup_head` exists as a distinct per-activity check and rejects a team member who manages the activity but is not the assigned Meetup Head; no activity/org-scoped endpoint added from this point uses the coarse `organiser_required`.

**Plans**: 5/5 plans executed

Plans:
**Wave 1**

- [x] 01-01-PLAN.md — Tracer: Flask-Migrate + naming convention + baseline revision, add/drop-column round-trip proven on SQLite (SCHEMA-01)

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 01-02-PLAN.md — Schema batch part 1: 7 proposal→campaign spine tables (collaborators, team, tasks, schedule, form fields, responses, campaign) (SCHEMA-02)

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 01-03-PLAN.md — Schema batch part 2: 9 org-identity/close-out/channel/session tables + 11 columns on populated tables (SCHEMA-02)

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 01-04-PLAN.md — [BLOCKING] one-batch migration applied to the live DB + seed.py split with a non-bypassable dev guard (SCHEMA-02, SCHEMA-03)

**Wave 5** *(blocked on Wave 4 completion)*

- [x] 01-05-PLAN.md — Resource-scoped authorization: 4 predicates, scoped decorators, and a route-guard enforcement test (RBAC-01/02/03)

**Wave structure**: strictly sequential (1 → 2 → 3 → 4 → 5). Plans 02/03 share `models/__init__.py` and `constants.py`; plan 04's autogenerate imports the whole app, so a concurrent edit to models, constants or rbac would corrupt the generated revision. Foundation work here is a chain, not a fan-out.

### Phase 2: Identity, Session & Dashboard Shell

**Goal**: A user stays logged in across sessions, the server (not a duplicated frontend list) decides who is an organiser, and POR holders can move between their student and organiser views.
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, DASH-01
**Success Criteria** (what must be TRUE):

  1. A user who closes the tab and returns two hours later is still logged in — no forced re-login while the refresh token is valid.
  2. Several dashboard queries expiring simultaneously produce exactly one refresh call and zero logouts.
  3. A Deputy House Secretary, Web Admin, Society Deputy Secretary and Coordinator each see the organiser surface, because organiser status arrives from `/auth/me` and no POR list survives in the frontend.
  4. A POR holder can switch between Student and Organiser views from the nav, the choice survives a reload and lands on that view's home route; a single-role student sees no switcher at all, and the choice changes zero authorization outcomes.
  5. A user can declare and later re-confirm their academic level and status (and an admin can override it) with no effect on login or session behaviour.

**Plans**: 7/7 plans executed

> **Gap-closure phase.** Phase 2 code was written and merged (commits `54ea81a`, `f2c127e`) without ever going through plan/execute, so no PLAN, VERIFICATION or UAT existed. A source and runtime audit on 2026-08-12 found `/auth/refresh` and `/auth/logout` returning **HTTP 500 on every call** (`BlocklistRepository.is_jti_blocked` is referenced but never defined), the admin academic-status endpoint unroutable (its blueprint was never registered) and crashing on a nonexistent `AuditLog` column, the view switcher failing every clause of success criterion 4, and zero automated tests for all five requirements. These plans close those gaps. Work already verified correct — the Phase 2 migration, the JWT cookie config, and the AUTH-03 POR constants — is covered by tests, not rebuilt.
>
> **Out of scope but present in the tree:** commit `f2c127e` bundled an unrelated "Phase 9 admin analytics" feature (`pages/OrganiserAnalytics.tsx`, `/admin/organiser-analytics`, organiser endpoints in `analytics_controller.py`). No Phase 2 plan extends, tests or refactors it. It is a candidate for its own backlog phase.

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Tracer: restore the session spine — login → refresh → rotate → /auth/me proven end-to-end, fixing the 500 (AUTH-01)
- [x] 02-02-PLAN.md — Wave 0: frontend test runner (vitest 3.2.7 / jsdom 26.1.0) + D-12 POR-literal build gate (AUTH-02)

**Wave 2** *(blocked on Wave 1)*

- [x] 02-03-PLAN.md — AUTH-01 hardening: reuse detection, the 10s multi-tab grace window, CSRF, loader efficiency, session fixation (AUTH-01)
- [x] 02-06-PLAN.md — Frontend contract: snake_case→camelCase adapted once in api.ts, session expiry via router state, single-flight tests (AUTH-01, AUTH-02)

**Wave 3** *(blocked on Wave 2)*

- [x] 02-04-PLAN.md — Capability contract + POR taxonomy proof + D-14 por-audit routed through the service layer (AUTH-02, AUTH-03)
- [x] 02-07-PLAN.md — [CHECKPOINT] DASH-01 view switcher rebuilt to UI-SPEC S1, view-aware nav, S4 banner placement, D-18 tests (DASH-01)

**Wave 4** *(blocked on Wave 3)*

- [x] 02-05-PLAN.md — AUTH-04: register the orphaned blueprint, fix the audit write, Marshmallow enums, staleness/decoupling tests, migration gate (AUTH-04)

**Wave structure**: two independent chains that meet at the end. The backend session chain (01 → 03 → 04 → 05) is strictly sequential because every plan edits `auth_service.py`, `repos.py` or `auth_controller.py`. The frontend chain (02 → 06 → 07) is sequential for the same reason on `lib/api.ts` and `ViewSwitcher.tsx`. The two chains share no files, so waves 1-3 each run two plans in parallel.

**UI hint**: yes

### Phase 3: Proposal Collaboration, Team Roster & Budget Guardrails

**Goal**: A proposal expresses who is collaborating, who is running the event, and a budget that policy cannot be talked out of — and admins review all three together.
**Depends on**: Phase 2
**Requirements**: PROPOSAL-00, PROPOSAL-01, PROPOSAL-02, PROPOSAL-03, PROPOSAL-04, PROPOSAL-05, PROPOSAL-06, BUDGET-01
**Success Criteria** (what must be TRUE):

  1. Any organiser-POR holder of the primary entity (RC, Secretary, Deputy Secretary, Event Lead, Coordinator) can submit a proposal naming one or more collaborating organisations with exactly one marked primary.
  2. A named collaborator's Secretary/Deputy Secretary/RC is notified and can accept or decline; only accepted collaborators count, and the "Mega Meetup" tag appears automatically once 3 have accepted.
  3. Submission is rejected server-side when the roster has zero or more than one Meetup Head, or when the budget exceeds `min(capacity × ₹200, ₹20,000)` on a local or regional meetup — with the reason shown, not a generic error.
  4. The admin approval queue shows the team roster and collaborating-entity list alongside description, highlights, budget and city, in one review.
  5. The proposer or an admin can reassign the Meetup Head to any team member — POR or not — at any point before the campaign goes live.

**Plans**: 4 plans
**UI hint**: yes

Plans:
**Wave 1** *(tracer)*

- [x] 03-01-PLAN.md — Tracer: submitter org-POR guard (PROPOSAL-00) + budget hard cap (BUDGET-01) + team roster validation, exactly one Meetup Head (PROPOSAL-02)

**Wave 2** *(blocked on Wave 1)*

- [x] 03-02-PLAN.md — Collaborator invite flow: write `ActivityCollaborator` rows at submission, respond endpoint, authority-holder notifications (PROPOSAL-01, PROPOSAL-06)

**Wave 3** *(blocked on Wave 2)*

- [x] 03-03-PLAN.md — Mega Meetup label (`is_mega_meetup` property) + admin queue enrichment (collaborators + team in `to_dict`) + Meetup Head reassignment endpoint (PROPOSAL-03, PROPOSAL-04, PROPOSAL-05)

**Wave 4** *(blocked on Wave 3)*

- [x] 03-04-PLAN.md — Frontend: ProposalNew collaborator picker + team roster builder + live budget cap indicator, ApprovalQueue enriched columns + Mega Meetup badge, EventDetail collaborator respond UI (UI)

### Phase 4: Organisation Profile & Brand Kit

**Goal**: Every organisation type — house, society, region, council — has an editable public identity and a brand kit that later drives campaign generation.
**Depends on**: Phase 1 (parallel-safe with Phase 3)
**Requirements**: ORG-01, ORG-02, ORG-03, ORG-04
**Success Criteria** (what must be TRUE):

  1. A Secretary or Deputy Secretary can edit their organisation's bio, logo and social links for all four org types — and a Secretary of org A gets a 403 attempting to edit org B.
  2. A social link with a non-http(s) scheme or a non-allowlisted host is rejected at save time and never rendered anywhere.
  3. A Secretary can define and save a brand kit (voice/tone descriptors, colour palette, sample phrases) that is readable by the campaign creator.
  4. An organisation with no brand kit can request an AI-drafted starting kit, edit every field, and nothing applies until they explicitly save it.

**Plans**: 9/9 plans executed
**UI hint**: yes

Plans:
**Wave 1** *(tracer)*

- [x] 04-01-PLAN.md — Tracer: `org_profile_bp` + `GET`/`PATCH /orgs/<org_id>/profile`, all four org types, the 403/404 denial matrix, and a blueprint-registration guard test (ORG-01)

**Wave 2** *(blocked on Wave 1)*

- [x] 04-02-PLAN.md — ORG-02 security core: `url_safety.py` + host allowlist + the read-side filter + `PUT /social-links`; [CHECKPOINT] where the `website` value lives (ORG-01, ORG-02)
- [x] 04-06-PLAN.md — Frontend data layer: `safeExternalHref`, types, adapters/endpoints, the non-JSON error-body guard, query hooks (ORG-01/02/03/04)

**Wave 3** *(blocked on Wave 2)*

- [x] 04-03-PLAN.md — Logo upload primitive: `MAX_CONTENT_LENGTH`, magic-byte sniff, UUID names, public `nosniff` serve route (ORG-01)

**Wave 4** *(blocked on Wave 3)*

- [x] 04-04-PLAN.md — ORG-03 brand kit: schema bounds, upsert endpoints, and `brand_kit_for()` — the read contract Phase 5 consumes (ORG-03)
- [x] 04-07-PLAN.md — Frontend page: `OrgProfile` shell + gating, `OrgLogo` fallback ladder, `Textarea`, route/nav, `/admin/orgs` reconciliation (ORG-01)

**Wave 5** *(blocked on Wave 4)*

- [x] 04-05-PLAN.md — ORG-04 AI draft: lazy-imported `google-genai`, 503 degradation, the persists-nothing test (ORG-04)
- [x] 04-08-PLAN.md — Frontend links: `SocialLinksEditor` + `SocialLinksRow`, per-row rejections, the absence rule (ORG-01, ORG-02)

**Wave 6** *(blocked on Wave 5)*

- [x] 04-09-PLAN.md — [CHECKPOINT] Frontend brand kit + AI draft flow (S6/S7) + phase manual UAT (ORG-03, ORG-04)

**Wave structure**: two chains that interleave. The backend chain (01 → 02 → 03 → 04 → 05) is strictly sequential because every plan edits `org_profile_service.py` and `org_profile_controller.py`. The frontend chain (06 → 07 → 08 → 09) is sequential for the same reason on `OrgProfile.tsx`. The chains share no files, so waves 2, 4 and 5 each run two plans in parallel.

### Phase 5: Post-Acceptance Pipeline (Design → Campaign → Live → Workspace)

**Goal**: An accepted proposal becomes a designed, brand-driven, Meetup-Head-approved live event whose team workspace is running.
**Depends on**: Phase 3, Phase 4
**Requirements**: DESIGN-01, CAMPAIGN-01, CAMPAIGN-02, CAMPAIGN-03, CAMPAIGN-04, CAMPAIGN-05, CAMPAIGN-06, TEAM-01, TEAM-02, TEAM-03, TEAM-04
**Success Criteria** (what must be TRUE):

  1. Once a proposal is accepted, the organiser can fill an ordered event schedule (time block + activity + owner), starting from a scale-appropriate best-practice preset.
  2. The organiser gets a usable mail-template draft whose dates, venue and fees are backend-interpolated (never model-written), carrying the primary org's brand voice and every accepted collaborator's logo on a multi-entity campaign — and it still produces a draft with no AI key configured.
  3. The organiser can upload a poster, copy a shareable registration link, and add a bounded set of custom fields on top of the registration form's fixed core fields.
  4. Nothing reaches students until the assigned Meetup Head explicitly approves the full package; a non-Meetup-Head team member's push-live attempt is rejected server-side.
  5. Once live, the roster assembled at proposal time sees a Kanban board whose tasks (assignee, deadline, status) survive a hard reload and are visible to another team member on another device; volunteer points can only be awarded to actual crew members, and crew membership grants no org-wide permission anywhere else.

**Plans**: 9/11 plans executed
**UI hint**: yes

Plans:
**Wave 1** *(tracer)*

- [x] 05-01-PLAN.md — Tracer: schedule vertical slice end-to-end + the single `assert_editable` chokepoint + presets, ordering and position-only reorder (DESIGN-01)

**Wave 2** *(blocked on Wave 1)*

- [x] 05-02-PLAN.md — Campaign singleton + server-minted registration slug + custom form fields + real slug resolution and public event preview (CAMPAIGN-04, CAMPAIGN-05)
- [x] 05-06-PLAN.md — Frontend: `ScheduleRow` blur-save/reorder and `PresetAccordion` — both new shapes, no codebase analog (DESIGN-01)

**Wave 3** *(blocked on Wave 2)*

- [x] 05-03-PLAN.md — [CHECKPOINT] Campaign state machine decision + Meetup Head push-live gate, its audit trail and the AC-25 negative control (CAMPAIGN-06)
- [x] 05-07-PLAN.md — [CHECKPOINT] Frontend: `FormFieldRow`, `RegistrationLinkCard`, and the logged-out visitor path (CAMPAIGN-04, CAMPAIGN-05)

**Wave 4** *(blocked on Wave 3)*

- [x] 05-04-PLAN.md — Kanban task API: CRUD, the `assert_campaign_live` gate, and the deterministic ordering tiebreak (TEAM-01, TEAM-02)
- [x] 05-08-PLAN.md — Frontend: `PipelineStepper` + `PushLiveGate` with the server-supplied Meetup Head flag (CAMPAIGN-06)

**Wave 5** *(blocked on Wave 4)*

- [x] 05-05-PLAN.md — Volunteer-points crew guard + the TEAM-03 url_map proof and the removed-member control (TEAM-03, TEAM-04)
- [x] 05-09-PLAN.md — Frontend: `KanbanBoard` + `KanbanWorkspace`, mock array retired, no-polling structural gate (TEAM-01, TEAM-02)

**Wave 6** *(blocked on Wave 5 — needs Phase 4)*

- [ ] 05-10-PLAN.md — Poster upload: 5 MB app cap per OD-2, magic-byte type sniffing, `PosterUpload` (CAMPAIGN-03)

**Wave 7** *(blocked on Wave 6 — needs Phase 4)*

- [ ] 05-11-PLAN.md — AI mail generation: server-interpolated facts, injection-hardened prompt, degraded fallback, `MailTemplateEditor` (CAMPAIGN-01, CAMPAIGN-02)

**Wave structure**: a backend chain (01 → 02 → 03 → 04 → 05) and a frontend chain (01 → 06 → 07 → 08 → 09) that run in parallel from Wave 2 onward. Both chains are internally sequential because every backend plan edits `campaign_service.py`, `schemas/__init__.py` or `controllers/__init__.py`, and every frontend plan edits `api.ts`, `queries.ts` and `CampaignBuilder.tsx`. The chains share no files, so Waves 2–5 each run two plans in parallel. Per **OD-1**, the two Phase-4-dependent slices — poster (CAMPAIGN-03) and AI mail (CAMPAIGN-01/02) — are sequenced last; the other 8 requirements need no Phase 4 artifact and are executable immediately.

### Phase 6: Event Execution & Close-Out

**Goal**: The team can run the door, see the event's full history, and close it out with evidence that cannot be gamed.
**Depends on**: Phase 5
**Requirements**: QR-01, QR-02, QR-03, QR-04, TIMELINE-01, TIMELINE-02, FEEDBACK-01, FEEDBACK-02, REIMB-01, REIMB-02
**Success Criteria** (what must be TRUE):

  1. An attendee displays a signed short-TTL code and any team member scans it to check them in; a re-scan returns a friendly already-checked-in response with exactly one attendance row, and an expired or wrong-event code is rejected.
  2. The existing tap-based roster check-in still works with the camera denied or unavailable — QR never became the only door.
  3. Anyone with access to an event can view a timeline showing proposal, approval, registration, check-in, expense and report events in order, built entirely from existing records with no second source of truth.
  4. Any team member can draft the post-event reflection and expense entries, but only the assigned Meetup Head can submit either — and reimbursement submission requires a social-post link alongside bills.
  5. Only people with a real Attendance record are prompted for and can submit a rating (once each), and the QR-verified attendance count is what points, fee-utilisation and budget-reasonableness use — photo evidence never overrides it.

**Plans**: TBD
**UI hint**: yes

### Phase 7: Progression Gating

**Goal**: An organisation's ability to propose bigger events unlocks from its own completed track record, enforced by the server and explained in the UI.
**Depends on**: Phase 3, Phase 6
**Requirements**: PROG-01, PROG-02, PROG-03, PROG-04
**Success Criteria** (what must be TRUE):

  1. An org that has completed at least one local meetup and one regional meetup in a city can select `regional_fest` for that city; an org that has not sees the option locked with an explicit "1 of 2 completed" style explanation rather than a bare disabled control.
  2. A direct API call proposing a locked scale returns 403 — the gate is server-side, computed by one function, and checked on both submit and approve.
  3. A `regional_fest` proposal with fewer than 6 accepted collaborating organisations is rejected with a reason naming the shortfall.
  4. An org that reaches fest tier sees a recorded "Sponsorship & outreach tools unlocked" state surfaced in the UI, with no CRM tooling behind it (deliberately out of scope).

**Plans**: TBD
**UI hint**: yes

### Phase 8: Event Announcements, Polls & Queries

**Goal**: A live event has exactly one official channel that carries announcements, polls and attendee questions — and cannot become a chat room.
**Depends on**: Phase 1, Phase 5
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):

  1. The organising team can post announcements and create polls scoped to an event's registration window, and registrants see them and can vote exactly once each.
  2. A registrant can submit a query to the team and cancel their registration — and can do nothing else: no replies to other attendees, no open feed, no peer-to-peer messaging.
  3. Posting to an event whose registration window has closed is rejected server-side with an explicit closed-state message, not merely hidden in the UI.
  4. Query submission is rate-limited and every moderation action lands in the audit log — both shipping with the feature, not after it.
  5. New announcements and team responses appear within roughly 15 seconds without WebSockets, and a backgrounded tab stops polling.

**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8
Phase 4 is parallel-safe with Phase 3 (different tables, different predicate, different pages).

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Migration & Authorization Foundation | 5/5 | In Progress|  |
| 2. Identity, Session & Dashboard Shell | 7/7 | Complete    | 2026-08-12 |
| 3. Proposal Collaboration, Team Roster & Budget Guardrails | 0/4 | Planning | - |
| 4. Organisation Profile & Brand Kit | 9/9 | In Progress|  |
| 5. Post-Acceptance Pipeline | 8/11 | In Progress|  |
| 6. Event Execution & Close-Out | 0/TBD | Not started | - |
| 7. Progression Gating | 0/TBD | Not started | - |
| 8. Event Announcements, Polls & Queries | 0/TBD | Not started | - |

## Coverage

All 52 v1 requirements map to exactly one phase. No orphans, no duplicates.

| Phase | Requirements | Count |
|-------|--------------|-------|
| 1 | SCHEMA-01/02/03, RBAC-01/02/03 | 6 |
| 2 | AUTH-01/02/03/04, DASH-01 | 5 |
| 3 | PROPOSAL-00/01/02/03/04/05/06, BUDGET-01 | 8 |
| 4 | ORG-01/02/03/04 | 4 |
| 5 | DESIGN-01, CAMPAIGN-01/02/03/04/05/06, TEAM-01/02/03/04 | 11 |
| 6 | QR-01/02/03/04, TIMELINE-01/02, FEEDBACK-01/02, REIMB-01/02 | 10 |
| 7 | PROG-01/02/03/04 | 4 |
| 8 | CHAT-01/02/03/04 | 4 |
| **Total** | | **52** |

> Note: REQUIREMENTS.md's summary line stated 51 v1 requirements. The actual enumerated count is 52 — the stated total was written before `PROPOSAL-00` was added. All 52 are mapped.

## Research Flags

Phases where `/gsd:research-phase` is recommended before planning:

- **Phase 5** — LLM provider/billing decision (Gemini text is free-tier, image generation is not). Blob storage resolved 2026-08-06: local filesystem (`backend/instance/uploads`), no cloud provider needed.
- ~~**Phase 6**~~ RESOLVED 2026-08-06: QR libraries settled — `@yudiel/react-qr-scanner` 2.6.0 (scan) + `qrcode.react` 4.2.0 (render), both live-verified maintained. ARCHITECTURE.md updated to match STACK.md.
- ~~**Phase 8**~~ RESOLVED 2026-08-06: no live deployment target — `.vercel/project.json` is unused leftover. Course deliverable graded via code + local run; drop rate-limiter/blocklist-storage/polling-viability design work tied to a hosted deploy.

Phases with well-documented patterns (skip research-phase): 1, 2, 3, 4, 7.

## Open Decisions Carried Into Phase 1

- **Flask-Migrate adoption vs. one-batch schema declaration.** PROJECT.md's "no new frameworks" constraint makes this an explicit team decision, not a quiet commit. Both research files present the batch-only alternative as viable. Decide at the top of Phase 1 — the naming convention must land before any migration is generated either way.
- ~~**Doc drift to reconcile**~~ RESOLVED 2026-08-06: `constants.ACTIVITY_FEE_INR = 200` confirmed correct (git history shows it was never 100); docs/UI updated to match.
- **Progression-gating is the milestone's one unvalidated mechanic** (no market analogue). Validate with real Regional Coordinators in parallel with Phases 1-6, not after Phase 7 ships.
