# SPEC — Phase 5: Post-Acceptance Pipeline (Design → Campaign → Live → Workspace)

**Generated:** 2026-08-13
**Ambiguity score:** 0.172 (gate: ≤ 0.20) ✅
**Requirements locked:** 11

---

## Goal

An accepted proposal becomes a designed, brand-driven, Meetup-Head-approved live event
whose team workspace is running. The pipeline is strictly sequential:

```
Schedule Design → Campaign Builder → Meetup Head Push-Live → Kanban Workspace active
```

Nothing reaches students until the Meetup Head explicitly pushes the campaign live.

---

## Ambiguity Report

| Dimension         | Score | Min  | Status |
|-------------------|-------|------|--------|
| Goal Clarity      | 0.87  | 0.75 | ✓      |
| Boundary Clarity  | 0.83  | 0.70 | ✓      |
| Constraint Clarity| 0.78  | 0.65 | ✓      |
| Acceptance Criteria| 0.80 | 0.70 | ✓      |

**Ambiguity:** 0.172 — gate passed after 4 rounds.

---

## Scope

### In Scope

- `DESIGN-01` — Event schedule editor: ordered items, presets, edit/reorder/delete before push-live
- `CAMPAIGN-01` — AI mail template generation using brand kit voice/tone (LLM body only)
- `CAMPAIGN-02` — Brand kit context passed to AI; multi-entity collaborator logos in template
- `CAMPAIGN-03` — Poster upload saved to `backend/instance/uploads/`
- `CAMPAIGN-04` — Server-generated registration slug; shareable link
- `CAMPAIGN-05` — Custom registration fields (text/dropdown); no cap in Phase 5
- `CAMPAIGN-06` — Meetup Head push-live gate; 403 for non-Meetup-Head; server + UI enforced
- `TEAM-01` — Kanban workspace activates only after push-live
- `TEAM-02` — Task CRUD (title, description, assignee, deadline, status); persisted server-side
- `TEAM-03` — Team role on an Activity grants zero org-wide permissions
- `TEAM-04` — `award_volunteer_points` requires actual crew membership check

### Out of Scope (Phase 5)

- Email sending — mail template is a text blob the organiser copies; no SMTP/SendGrid
- QR check-in — Phase 6
- Real-time Kanban task updates — fetched on page load only (no polling/WebSockets)
- Volunteer point award triggering from Kanban done lane — TEAM-04 is a membership guard only
- AI poster generation — stays behind `AI_IMAGE_ENABLED` (off by default)
- Phase 4 features (org profile, brand kit CRUD) — Phase 5 reads brand_kits; does not write it
- Schedule editing after push-live — immutable once campaign is live

---

## Hard Dependency

Phase 5 **requires Phase 4 to be code-complete and merged**. The `BrandKit` model and
`brand_kits` migration must be applied. There is no graceful fallback if BrandKit does not
exist — Phase 5 endpoints gate on it.

---

## Requirements

### R1 — DESIGN-01: Ordered Event Schedule

**Current state:** `EventScheduleItem` table exists in schema. Zero service/controller/frontend code.

**Target state:** A POST-accepted activity exposes a schedule editor. At least one item required before campaign builder unlocks.

**Acceptance criteria:**
- [ ] AC-01: POST /api/v1/activities/{id}/schedule adds an item; returns 201.
- [ ] AC-02: PATCH /api/v1/activities/{id}/schedule/{item_id} updates; returns 200.
- [ ] AC-03: DELETE /api/v1/activities/{id}/schedule/{item_id} removes; returns 204.
- [ ] AC-04: Campaign-builder unlock check returns 400 with reason="schedule_empty" when activity has zero schedule items.
- [ ] AC-05: Schedule items returned ordered by (position ASC, created_at ASC, id ASC) — stable.
- [ ] AC-06: Schedule items NOT modifiable after campaign.status="live" — returns 409 reason="campaign_live".
- [ ] AC-07: GET /api/v1/schedule-presets?scale={scale} returns at least 1 preset per scale (local_meetup, regional_meetup).

### R2 — CAMPAIGN-01 + CAMPAIGN-02: AI Mail Template Generation

**Current state:** `CampaignPackage.mail_body` column exists. No controller, service, or LLM integration.

**Target state:** Organiser triggers generation. Backend calls Gemini text passing brand kit voice/tone/sample phrases + factual interpolated details. LLM writes body tone/narrative only.

**Acceptance criteria:**
- [ ] AC-08: POST /api/v1/activities/{id}/campaign/generate-mail returns { mail_subject, mail_body } with factual fields interpolated.
- [ ] AC-09: LLM prompt includes primary org BrandKit.voice_descriptor, tone_descriptor, sample_phrases when BrandKit row exists.
- [ ] AC-10: Second generate-mail call overwrites existing mail_body (last-write wins, idempotent).
- [ ] AC-11: For is_mega_meetup=True, all accepted collaborating orgs brand kits and logo filenames included in prompt context.

### R3 — CAMPAIGN-03: Poster Upload

**Current state:** `CampaignPackage.poster_name` column exists. No upload endpoint.

**Target state:** File saved to backend/instance/uploads/. Filename stored in poster_name.

**Acceptance criteria:**
- [ ] AC-12: POST /api/v1/activities/{id}/campaign/poster (multipart) saves file and updates poster_name; returns 200 { poster_name }.
- [ ] AC-13: Uploading a second poster overwrites poster_name (last-write wins).
- [ ] AC-14: GET /api/v1/uploads/<filename> serves the stored file.

### R4 — CAMPAIGN-04: Registration Slug

**Current state:** `CampaignPackage.registration_slug` column exists (unique). No generation endpoint.

**Target state:** Server auto-generates URL-safe slug. Organiser copies shareable link. Not user-customisable.

**Acceptance criteria:**
- [ ] AC-15: POST /api/v1/activities/{id}/campaign/generate-slug stores unique slug; returns { registration_slug, registration_url }.
- [ ] AC-16: Slug is globally unique — collision retry loop (max 3 attempts).
- [ ] AC-17: Second generate-slug call overwrites existing slug (idempotent).

### R5 — CAMPAIGN-05: Custom Registration Fields

**Current state:** `RegistrationFormField` + `RegistrationFieldResponse` tables exist. No endpoint.

**Target state:** Organiser adds/edits/removes text or dropdown custom fields. No cap in Phase 5.

**Acceptance criteria:**
- [ ] AC-18: POST /api/v1/activities/{id}/form-fields creates a field; returns 201.
- [ ] AC-19: PATCH /api/v1/activities/{id}/form-fields/{field_id} updates; returns 200.
- [ ] AC-20: DELETE /api/v1/activities/{id}/form-fields/{field_id} removes; returns 204.
- [ ] AC-21: Two fields with same label for same activity → 409 reason="duplicate_label".
- [ ] AC-22: Form fields returned ordered by (position ASC, created_at ASC, id ASC).
- [ ] AC-23: GET /api/v1/activities/{id}/register returns core fields (name, contact) + custom fields.

### R6 — CAMPAIGN-06: Meetup Head Push-Live Gate

**Current state:** CampaignPackage status/approved_by/approved_at/pushed_live_at exist. is_meetup_head predicate exists. No push-live endpoint.

**Target state:** Status transitions draft → approved → live. Non-Meetup-Head push-live returns 403 server-side. Kanban activates only after live.

**Acceptance criteria:**
- [ ] AC-24: POST /api/v1/activities/{id}/campaign/push-live transitions to live, sets approved_by/approved_at/pushed_live_at; returns 200.
- [ ] AC-25: Non-Meetup-Head push-live → 403, enforced by is_meetup_head predicate (not UI-only).
- [ ] AC-26: Push-live on already-live campaign → 200 no-op (idempotent).
- [ ] AC-27: GET /api/v1/activities/{id}/tasks → 403 reason="campaign_not_live" if campaign.status != "live".

### R7 — TEAM-01 + TEAM-02: Kanban Task Board

**Current state:** `ActivityTask` table exists. No controller/service. Frontend uses client-side mock array.

**Target state:** Once campaign is live, team workspace activates. Any team member can CRUD tasks. Persisted server-side.

**Acceptance criteria:**
- [ ] AC-28: POST /api/v1/activities/{id}/tasks creates task; requires can_manage_activity; returns 201.
- [ ] AC-29: PATCH /api/v1/activities/{id}/tasks/{task_id} updates any field; returns 200.
- [ ] AC-30: DELETE /api/v1/activities/{id}/tasks/{task_id} removes; returns 204.
- [ ] AC-31: Tasks returned ordered by (position ASC, created_at ASC, id ASC).
- [ ] AC-32: Two tasks with equal position ordered by created_at ASC then id ASC — deterministic.
- [ ] AC-33: GET /api/v1/activities/{id}/tasks → 403 reason="campaign_not_live" when not live.
- [ ] AC-34: Task status must be one of todo|in_progress|done — other values → 422.
- [ ] AC-35: Kanban board fetched on page load only — no polling/WebSocket.

### R8 — TEAM-03: Team Role ≠ Org Permission

**Target state:** Being on activity team roster grants zero org-wide permissions.

**Acceptance criteria:**
- [ ] AC-36: User on activity team but with no org POR → 403 on any org-scoped endpoint; verified by dedicated test.

### R9 — TEAM-04: Volunteer Points Membership Guard

**Current state:** `award_volunteer_points` has no real crew membership check.

**Target state:** Points award requires verified crew membership.

**Acceptance criteria:**
- [ ] AC-37: award_volunteer_points for non-crew user → service error → 403 from endpoint.
- [ ] AC-38: award_volunteer_points for confirmed crew member → 200.

---

## Edge Coverage

| Req | Category | Status | Verification | Resolution |
|-----|----------|--------|--------------|------------|
| DESIGN-01 | adjacency | dismissed | — | Items are independent rows with position integer; no merge semantics |
| DESIGN-01 | empty | resolved | explicit | AC-04: empty schedule blocks campaign builder |
| DESIGN-01 | ordering | resolved | explicit | AC-05: ordered (position, created_at, id) |
| DESIGN-01 | idempotency | dismissed | — | Standard CRUD with idempotent PUT/DELETE by ID |
| DESIGN-01 | concurrency | resolved | backstop | Last-write wins on concurrent schedule edits; held-out test |
| CAMPAIGN-01 | idempotency | resolved | explicit | AC-10: second generate-mail overwrites mail_body |
| CAMPAIGN-01 | concurrency | dismissed | — | Last-write-wins; concurrent generate calls produce same outcome |
| CAMPAIGN-03 | concurrency | resolved | backstop | Two simultaneous poster uploads: last-write wins on poster_name; held-out test |
| CAMPAIGN-05 | adjacency | resolved | explicit | AC-21: duplicate label → 409 |
| CAMPAIGN-05 | empty | dismissed | — | Zero custom fields valid; core fields always present |
| CAMPAIGN-05 | ordering | resolved | explicit | AC-22: ordered (position, created_at, id) |
| CAMPAIGN-06 | idempotency | resolved | explicit | AC-26: push-live on live → 200 no-op |
| CAMPAIGN-06 | concurrency | dismissed | — | uq_team_meetup_head prevents two concurrent approvers |
| TEAM-02 | adjacency | resolved | explicit | AC-32: equal-position tasks ordered by created_at then id |
| TEAM-02 | empty | dismissed | — | Zero tasks is valid; empty board is initial state |
| TEAM-02 | ordering | resolved | explicit | AC-31: ordered (position, created_at, id) |
| TEAM-02 | idempotency | dismissed | — | PATCH by stable ID is idempotent |
| TEAM-02 | concurrency | resolved | backstop | Two members updating same task: last-write wins; held-out test |

**Coverage:** applicable=18, resolved=15 (10 explicit, 2 backstop, 3 dismissed-with-reason), unresolved=0 ✅

---

## Prohibitions

| ID | Prohibition | Status | Tier |
|----|-------------|--------|------|
| PROB-P1 | AI-generated mail body must NOT contain AI-fabricated factual claims (dates, venue, fees, capacity) — all factual fields are server-interpolated before LLM prompt construction | resolved | test |
| PROB-P2 | Mail generation must NOT silently return empty mail_body on AI call failure — must surface explicit error or degraded static template | resolved | test |
| PROB-P3 | Schedule items and team roster must NOT be editable after campaign.status="live" | resolved | test (AC-06) |
| PROB-P4 | User removed from activity_team_members must NOT retain Kanban access | resolved | test |

**Canon items dropped (breadcrumbs):**
- Path-traversal on poster upload → owned by /gsd:secure-phase + werkzeug.utils.secure_filename
- Registration slug enumeration → canonical OWASP predictable-resource-location; /gsd:secure-phase
- Client-provided upload filename injection → canon path-injection; /gsd:secure-phase

---

## Constraints

| Constraint | Value | Source |
|------------|-------|--------|
| File storage | backend/instance/uploads/ local filesystem | STATE.md resolved 2026-08-06 |
| LLM provider | Gemini text (free tier) | STATE.md |
| Custom field cap | None in Phase 5 | Interview round 2 |
| Push-live auth | is_meetup_head predicate — server + UI | Interview round 4 |
| Kanban activation | After campaign.status="live" only | Interview round 3 |
| Phase 4 dependency | Hard — brand_kits migration must be applied | Interview round 2 |
| Schedule mutability | Editable before push-live; immutable after | PROB-P3 |
| Task update model | Fetch on page load only; no real-time polling | Interview round 3 |
