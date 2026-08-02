# Project Research Summary

**Project:** Ekatva OS — Organiser Dashboard Deepening (Milestone 2)
**Domain:** Organiser-dashboard feature expansion on an existing Flask 3 + React 18 civic/event-management platform (IIT Madras BS community OS, course project)
**Researched:** 2026-08-02
**Confidence:** HIGH

## Executive Summary

This milestone is not a new product and not a new architecture — it is ten features layered onto a working three-tier Flask/React system, and the research converges hard on one conclusion: **the schema and authorization gaps, not the new capabilities, are the real risk.** Only 3 new runtime dependencies are actually required (`google-genai`, one QR-scan library, one QR-render library — plus a strongly-recommended `Flask-Migrate`), because refresh tokens, chat/polls, and QR check-in all resolve to configuration and service logic on top of libraries already installed. The features split cleanly into a keystone (activity-scoped team/task, which forces the single biggest missing abstraction — resource-scoped authorization predicates like `can_manage_activity`) and five additive, mutually-independent domain slices once that keystone and the schema exist.

The dominant constraint across all four research files is **"No Alembic yet."** This milestone adds ~8 tables and ~12 columns to a codebase whose only schema-change process is editing models and rerunning a destructive `seed.py` (`db.drop_all()`). Every phase built before this is resolved risks a coordinated data wipe across five developers, and mid-project Alembic adoption has its own trap (retrofitting a metadata naming convention after tables already exist breaks SQLite batch migrations irrecoverably). The second major risk cluster is security-shaped, not feature-shaped: refresh-token rotation races (a real, CVE-documented bug class) can mass-logout users; QR check-in built in the wrong scan direction turns attendance into a fraud vector against the points ledger; unmoderated chat on a university-branded platform is a live institutional liability; and AI-generated campaign content will hallucinate event facts (times, venues, fees) unless facts are template-interpolated rather than generated.

The recommended approach: resolve migrations and the three core authorization predicates first (one dedicated phase, no user-visible output but everything downstream depends on it), ship the auth-refresh + dashboard-switcher shell together (they touch the same four files), then parallelize team/tasks against org-profile/social-links (genuinely independent), group QR check-in with timeline/feedback (QR's audit events are exactly what the timeline needs), and push chat/polls and AI campaign creator to the end — both carry infrastructure or vendor risk (realtime transport choice, LLM cost/hallucination) that the rest of the milestone should not be blocked on. Progression-gating is architecturally free (no new model) but must be sequenced carefully: it can be built early using a workaround (count approved-and-past-start activities rather than "completed," which depends on report submission), but the underlying mechanic itself is the one LOW-MEDIUM-confidence item in the whole research set — no comparable product has this pattern, so validate it with actual Regional Coordinators before or during the build, not after.

## Key Findings

### Recommended Stack

The stack finding that reframes the whole milestone: refresh tokens (item 2) and chat+polls (item 7) need **zero new packages** — the installed Flask-JWT-Extended already exposes refresh-token primitives, and TanStack Query's `refetchInterval` already covers polling. Flask-SocketIO was explicitly researched and rejected: official docs confirm Gunicorn cannot run multi-worker with it without sticky sessions, and adopting it would violate the project's "no new frameworks" constraint. Only three genuinely new dependencies are needed: `google-genai` (Gemini SDK — chosen because Gemini's text models have a real no-credit-card free tier, unlike its image models, which are paid-only per the official pricing page), one QR-scan library for the frontend, and one QR-render library. `Flask-Migrate` is not requested but strongly recommended as a cross-cutting addition given ~8 new tables landing on a no-migrations codebase.

**Core technologies:**
- `google-genai` 2.16.0 (pin `<3.0.0`) — mail-template + poster-brief generation — free tier covers text (`gemini-3.1-flash-lite`), image generation has no free tier at all (official pricing page: "Not available")
- QR generation/scanning libraries (frontend-only; **STACK.md and ARCHITECTURE.md disagree on which** — see Gaps) — because rendering/scanning client-side keeps the backend at zero new packages; `itsdangerous`, already bundled with Flask, signs the check-in payload
- `Flask-Migrate` 4.1.0 (recommended, not requested) — this milestone's schema change volume makes the current "edit models, rerun destructive seed.py" process the single largest coordination risk across 5 developers
- `Flask-Limiter` 4.1.1 (conditional) — mandatory once the AI endpoint or refresh endpoint ships, to prevent free-tier quota burn or brute force

### Expected Features

The reference-product research (Luma, Eventbrite, CampusGroups, Slido, Skool/Circle) confirms most of this milestone is table stakes the category already expects, with two genuine differentiators and one high-risk anti-feature the PRD already correctly avoids (general chat).

**Must have (table stakes):**
- QR check-in with per-registration code, dedicated authenticated scanner, **and retained manual roster fallback** (no comparable product removes the manual path)
- Dual-role access without lockout (today's hard-lock reads as a defect, not a missing feature, against every comparable product)
- Org profile with bio/logo/social links, generalized across all four org types (Eventbrite's documented model)
- Attendee post-event feedback, gated on attendance (targets the 20-30% response-rate band achievable with 1-3 questions, in-app, timed right after check-in)

**Should have (competitive differentiators):**
- Persisted activity-scoped team/task with owner + deadline + status — no comparable product (Luma, Eventbrite, CampusGroups) was confirmed to ship task-with-deadline; converting the currently-mocked array into a real feature is the single highest-leverage item in the milestone
- Organiser reflection/debrief captured in-product, feeding the report — near-universally run outside event platforms today; this is the feature that makes Ekatva institutional memory rather than a booking tool

**Defer (v2+):**
- Moderated event thread (chat) — ship polls first; chat requires a full moderation control set (report/flag, soft-delete, mute, rate limiting, audit log) before it can ship safely at all
- Poster **generation** (vs. upload) — highest cost, highest hallucination risk (generated images with text render wrong dates), no blob storage exists yet either
- Progression-gating — the one LOW-MEDIUM confidence feature with no direct market analogue; validate the mechanic with users before/while building

### Architecture Approach

The nine (ten, counting budget/report surfacing) capabilities decompose into three tiers: two shell changes that share the same four frontend files and must ship together first (auth refresh, dashboard switcher); one keystone data model (activity-scoped team/task) that forces the single biggest missing abstraction — resource-scoped authorization (`can_manage_activity`, `can_participate_in_activity`, `can_manage_org`) that today's coarse `organiser_required` cannot express; and five additive domain slices that are mutually independent once the schema and predicates exist. The AI campaign creator additionally introduces the system's first outbound third-party call and therefore its first `integrations/` boundary.

**Major components:**
1. **`rbac.py` predicate layer (new)** — `can_manage_activity`, `can_participate_in_activity`, `can_manage_org` — the load-bearing addition; without it, team/task/chat endpoints guarded by the existing `organiser_required` would exclude the plain-student crew members the features exist for
2. **`services/timeline_service.py` (new, read-only projection)** — the event timeline is computed by merging `AuditLog` + `Registration`/`Attendance` aggregates + `Report`/`Feedback`, never a new `TimelineEvent` table, to avoid a second source of truth
3. **`backend/app/integrations/llm_client.py` (new)** — single seam (`generate(system, prompt) -> str | None`) between `ai_service` and the Gemini SDK; returns `None` on any failure so the service can fall back to a deterministic template — this is the only network-dependent, vendor-dependent component in the milestone

### Critical Pitfalls

1. **Retrofitting Alembic without a metadata naming convention** — Ekatva has 25 unnamed foreign keys; adding the convention after tables exist breaks SQLite batch migrations irrecoverably. Fix: add `MetaData(naming_convention=...)` as the literal first commit of the migration phase, before `flask db init`.
2. **`seed.py` stays the deploy path even after Alembic lands** — muscle memory plus `db.create_all()`'s silent no-op on existing tables means a schema change looks applied when it isn't. Fix: guard `seed.py` to refuse non-dev `DATABASE_URL`, split into destructive-reset vs. idempotent-reference-data functions.
3. **Refresh-token rotation race condition mass-logs-out users** — this is a documented, currently-exploited CVE class (Keycloak CVE-2026-1035, Better Auth CVE-2026-53517), not a theoretical risk, and Ekatva's frontend (parallel TanStack Query requests, 30s staleTime) makes concurrent-refresh near-certain. Fix: client-side single-flight refresh promise (mandatory, cheap) + server-side atomic conditional UPDATE for rotation + a 30-60s reuse grace window.
4. **QR check-in built in the fraud-maximizing direction** — a single displayed event QR (vs. one QR per registration, scanned by the organiser) gets screenshotted into WhatsApp within minutes and corrupts the points ledger and fee-utilization analytics it feeds. Fix: attendee-displays / organiser-scans, signed short-TTL payload (never a raw registration ID or a JWT), server-side idempotent re-scan handling.
5. **AI-generated campaign content hallucinates event facts** — an LLM writing a full announcement will invent times, venues, or fees under an official-looking banner. Fix: template-with-slots (model writes prose only, backend interpolates all facts post-generation), mandatory human edit-and-confirm gate, never auto-send.

## Implications for Roadmap

Based on combined research, suggested phase structure (reconciling ARCHITECTURE.md's P1-P7 build order with PITFALLS.md's P0-P9 pitfall-to-phase mapping into one sequence):

### Phase 1: Migration Foundation & Schema Batch
**Rationale:** Every other phase adds tables/columns; under the current "edit models + destructive seed.py" workflow, per-feature schema changes cost 8 coordinated data wipes across 5 developers. This is the dominant constraint identified independently by both ARCHITECTURE.md and PITFALLS.md.
**Delivers:** Explicit team decision on Flask-Migrate adoption; if adopted, a metadata naming convention landed *before* `flask db init`; all ~8 new tables and ~12 new columns for the entire milestone declared in one batch; a guarded, non-destructive `seed.py`; one reseed.
**Addresses:** Cross-cutting prerequisite for team/task, org profile, timeline/feedback, chat/polls, progression, AI campaign (Document columns), QR check-in.
**Avoids:** Pitfall 1 (Alembic without naming convention — irrecoverable if sequenced late), Pitfall 2 (seed.py remains the deploy path), the "8 destructive reseeds" cost of naive per-feature ordering.

### Phase 2: Auth Refresh + Dashboard Switcher (Identity & Shell)
**Rationale:** Both touch the same four files (`auth.tsx`, `api.ts`, `session.tsx`, `Layout.tsx`); landing refresh first means later frontend slices build against a stable token contract instead of retrofitting error handling four times over. Also resolves a live bug (frontend/backend organiser-POR list drift) that the switcher would otherwise build on top of.
**Delivers:** `/auth/refresh` endpoint + single-flight client-side refresh interceptor; server-computed `capabilities`/`is_organiser` payload on `/auth/me` (replacing the hardcoded, already-drifted frontend POR list); dashboard switcher as a pure view-preference, never sent to the API.
**Uses:** Flask-JWT-Extended (already installed, config-only change), TanStack Query for the retry path.
**Implements:** The `refresh_required` decorator and the "activeRole is never an authorization input" boundary rule.
**Avoids:** Pitfall 3 (refresh rotation race → mass logout), Pitfall 4 (switcher becoming an auth mechanism), Pitfall 5 (POR-list drift, a live bug already present).

### Phase 3: Activity Teams & Tasks (Keystone)
**Rationale:** Highest-leverage single item (converts a mocked array into the product) and the phase that introduces `can_manage_activity` — the predicate every later crew/participant-scoped feature (chat, polls, QR check-in, AI campaign) reuses.
**Delivers:** `ActivityTeamMember` + `ActivityTask` models (two tables, not one — membership must exist independent of tasks); real team/task CRUD replacing `mock.ts`'s `TASKS`; volunteer-points award rewired to require crew membership.
**Addresses:** FEATURES.md's top differentiator (persisted team/task assignment).
**Avoids:** Pitfall 13 (task assignment quietly becoming a second RBAC system — write down explicitly that collaborator status grants zero permissions).

### Phase 4: Org Profile & Social Links (parallel with Phase 3)
**Rationale:** Genuinely independent of team/task — different tables, different predicate (`can_manage_org`), different pages. Two developers can run this alongside Phase 3.
**Delivers:** `Organisation` profile columns + child `SocialLink` table (following the existing `BudgetLine` child-table precedent, not a JSON blob); generalizes `HOUSE_META` across all four org types.
**Addresses:** FEATURES.md table-stakes org-profile requirement.
**Avoids:** Server-side URL scheme/host allowlisting to prevent stored-XSS and open-redirect via social links.

### Phase 5: QR Check-In + Timeline & Feedback
**Rationale:** Grouped because QR check-in is one of the audit events the timeline needs, and both phases require backfilling audit-log coverage into `registration_service`/`attendance_service`/`expense_service`, which currently write no audit rows despite the model's stated contract.
**Delivers:** Signed, short-TTL per-registration QR code (attendee-displays/organiser-scans direction) with idempotent re-scan handling and a mandatory manual-fallback path; `Feedback` table gated on attendance; `Report.challenges`/`Report.learnings` columns; `timeline_service` as a read-only projection over `AuditLog` (no new `TimelineEvent` table).
**Addresses:** FEATURES.md table-stakes QR check-in and dual-sided feedback.
**Avoids:** Pitfall 6 (QR fraud direction), Pitfall 7 (offline scanning silently dropping attendance — scope offline out explicitly), Pitfall 12's sibling concern about audit backfill.

### Phase 6: AI Campaign Creator
**Rationale:** The only phase with network, cost, API-key, and vendor-uptime risk. Sequencing it last protects the rest of the milestone from AI provider issues and keeps the demo's mandatory "works with no API key" path from blocking earlier work.
**Delivers:** `integrations/llm_client.py` seam with deterministic-template fallback; mail-template generation with template-interpolated facts (never model-generated dates/venues/fees); `Document` model extended (not a new table) to hold generated artefacts; poster path defaults to upload-only (no blob storage exists yet) with generation behind an `AI_IMAGE_ENABLED` flag.
**Uses:** `google-genai` 2.16.0, `Flask-Limiter` for per-user quota.
**Avoids:** Pitfall 10 (hallucinated facts reaching students), Pitfall 11 (unbounded cost / key exposure).

### Phase 7: Progression Gating
**Rationale:** Architecturally free (no new model) but has one real sequencing trap: gating on `Activity.status == 'completed'` never fires without a scheduler, since status only flips inside `submit_report()`. Recommend counting `proposal.status == approved AND starts_at < now()` instead, which removes the hard dependency on Phase 5/6 data existing — but the underlying mechanic is the milestone's lowest-confidence feature (no market analogue), so validate with Regional Coordinators in parallel with the build.
**Delivers:** `progression_service` with `unlocked_scales()`/`assert_scale_allowed()` as one server-side source of truth (never UI-only); `GET /orgs/:id/progression` for the "2 of 3 completed" UI messaging.
**Addresses:** FEATURES.md's novel-in-category differentiator, flagged LOW-MEDIUM confidence.
**Avoids:** Pitfall 12 (UI-only enforcement — a direct POST of a locked scale must 403).

### Phase 8: Chat & Polls
**Rationale:** Highest new surface area, lowest coupling to everything else, easiest to cut if the term runs short, and carries the most infrastructure uncertainty (deployment target for polling load is unconfirmed). Depends only on `can_participate_in_activity` from Phase 2/3.
**Delivers:** Polls first (near-zero moderation burden, same engagement value); event-scoped announcement/reply feed (not open chat) with a mandatory moderation control set (report, soft-delete, mute, rate-limit, audit log) shipped in the same phase — never chat without moderation.
**Uses:** TanStack Query `refetchInterval` (cursor-based, 10-15s + jitter, not 3s), explicitly not Flask-SocketIO/WebSockets.
**Avoids:** Pitfall 8 (naive 3s polling melting the backend during the one hour it matters), Pitfall 9 (unmoderated chat as a live institutional-safety incident).

### Phase Ordering Rationale

- **Schema-batching dominates the first phase** because 8 of 9 features touch the database, and the codebase's only current schema-change mechanism (destructive `seed.py`) makes per-feature ordering the single most expensive mistake available.
- **Shell-file collisions (auth + switcher) force Phase 2's internal ordering** — refresh before switcher, because refresh changes the token contract every later fetch rides on.
- **The keystone RBAC predicates (Phase 3) unlock parallelism**, not a rigid sequence — Phase 3 and Phase 4 are explicitly parallel-safe per ARCHITECTURE.md, and Phase 5 through 8 depend only on predicates existing, not on each other, except where noted (QR feeds timeline).
- **AI and chat are pushed last** because they are the only two phases with genuine external risk (vendor cost/uptime for AI; realtime infrastructure/deployment-target uncertainty for chat) — this protects the demo-critical core of the milestone from either.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 5 (QR check-in):** STACK.md and ARCHITECTURE.md disagree on which QR-scan/render libraries to use (`@yudiel/react-qr-scanner`+`qrcode.react` vs. `react-zxing`+`react-qr-code`), and ARCHITECTURE.md separately flags the QR-scanning library ecosystem as being "in flux" (both prior incumbents unmaintained) — run `/gsd:research-phase` to make a single, current decision before implementation.
- **Phase 6 (AI campaign creator):** provider/cost decision (who pays for Gemini billing, if poster generation is wanted at all), and the confirmed absence of any blob-storage backend in the current architecture (poster upload has nowhere to land without adding one) both need resolution before implementation starts.
- **Phase 8 (chat & polls):** the Flask backend's actual deployment target is unconfirmed (a `.vercel/project.json` exists with no matching gunicorn/Procfile config) — this materially changes rate-limiter storage, refresh-token blocklist storage, and whether polling vs. SSE is even viable. Resolve before designing this phase, not during it.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (migration foundation):** Flask-Migrate/Alembic patterns for this exact failure mode (naming convention, SQLite batch mode) are officially documented and directly verified against source.
- **Phase 2 (auth refresh + switcher):** Flask-JWT-Extended's refresh-token flow is fully documented by the vendor; the single-flight interceptor pattern is a well-established frontend pattern.
- **Phase 3 & 4 (team/task, org profile):** both follow the codebase's own established `BudgetLine` child-table convention; no new external pattern is needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All package versions queried live against PyPI JSON API / npm registry on 2026-08-02; refresh-token and Flask-SocketIO claims verified against official vendor docs directly |
| Features | MEDIUM-HIGH | HIGH on QR check-in and org-profile mechanics (official Luma/Eventbrite help-centre docs); LOW-MEDIUM specifically on progression-gating, which has no direct analogue in any researched event platform |
| Architecture | HIGH for integration structure (grounded in a full direct read of the codebase); MEDIUM for external library picks (QR scanning, LLM provider) |
| Pitfalls | HIGH for codebase-grounded and auth/migration pitfalls (read directly from source, cross-checked against 2026 CVEs); MEDIUM for realtime/AI pitfalls, since the deployment target is unconfirmed |

**Overall confidence:** HIGH on what to build and in what order; MEDIUM on two specific external-library decisions (QR scanning, LLM provider) and one unvalidated product mechanic (progression-gating).

### Gaps to Address

- **QR library conflict between STACK.md and ARCHITECTURE.md** (`@yudiel/react-qr-scanner`+`qrcode.react` vs. `react-zxing`+`react-qr-code`): both are reasonable single-source picks made independently; reconcile with one `/gsd:research-phase` pass before Phase 5 rather than picking arbitrarily during implementation.
- **Deployment target unconfirmed:** a `.vercel/project.json` exists but no matching WSGI/Procfile config was found; this affects rate-limiter storage (in-memory vs. Redis/Postgres), refresh-token blocklist storage, and the viability of any polling/SSE design in Phase 8. Resolve early — PITFALLS.md marks this the single highest-impact open question.
- **Whether the team accepts Flask-Migrate as a new dependency:** PROJECT.md's "no new frameworks" constraint makes this a judgment call, not a fact; both research files present the schema-batching alternative as viable if the team declines. Surface this as an explicit decision point at the start of Phase 1.
- **Progression-gating mechanic is unvalidated with real users** — the one LOW-MEDIUM confidence feature in FEATURES.md, drawn by analogy from community level-gating rather than any event-platform precedent. Recommend a quick validation pass with actual Regional Coordinators before or during Phase 7, not purely from research.
- **LLM provider and billing decision:** Gemini's text tier is free, but poster/image generation is paid-only with no free tier at all (verified against the official pricing page, contradicting several SEO sources claiming otherwise). The team must decide before Phase 6 whether `AI_IMAGE_ENABLED` is ever turned on.
- **Postgres provisioning for production is unclear** (`psycopg2-binary` is commented out in `requirements.txt`); if production stays SQLite-on-filesystem, several concurrency assumptions behind QR check-in bursts and chat writes (Phase 5, Phase 8) do not hold and should be re-verified.
- **Minor data inconsistency noticed during research** (not a research gap, but worth flagging to the roadmapper): PROJECT.md states a ₹100 activity fee while `constants.ACTIVITY_FEE_INR = 200` in the codebase — Phase 5/7 analytics work will surface this; reconcile before it becomes a demo-day surprise.

## Sources

### Primary (HIGH confidence)
- Flask-JWT-Extended official docs (refreshing tokens, configuration options, blocklist/revocation) — https://flask-jwt-extended.readthedocs.io/
- Flask-SocketIO official deployment docs (Gunicorn multi-worker limitation) — https://flask-socketio.readthedocs.io/en/stable/deployment.html
- Gemini API official pricing and models pages — https://ai.google.dev/gemini-api/docs/pricing, /models
- google-genai PyPI README — https://pypi.org/project/google-genai/
- Luma Help Center (check-in, external check-in integration) — https://help.luma.com/
- Eventbrite Help Center (organizer profile, QR code usage) — https://www.eventbrite.com/help/
- Alembic official docs on naming conventions and SQLite batch migrations — https://alembic.sqlalchemy.org/
- CVE-2026-1035 (Keycloak) and CVE-2026-53517 (Better Auth) refresh-token rotation race disclosures
- Direct repository source read: `backend/app/{models,rbac,constants,config,__init__,seed.py}`, all controllers/services, `frontend/src/{App.tsx,lib/*,components/Layout.tsx,pages/ManageEvent.tsx}`

### Secondary (MEDIUM confidence)
- Slido, Whova, CampusGroups/Ready Education product pages — polls, event-team roles, task-assignment absence
- Skool/Circle help-center — community level-gating patterns (nearest analogue to progression-gating)
- Server-Sent Events and WebSocket-vs-polling comparison articles — realtime transport tradeoffs at course scale
- Vercel KB on serverless WebSocket support — deployment-target risk for chat/polls

### Tertiary (LOW confidence)
- SEO/blog claims of Gemini image-generation free tiers — directly contradicted by the official pricing page; explicitly disregarded
- General UX-pattern literature for account/dashboard switchers — pattern is well established but the specific host/attendee framing is inferred, not sourced from a comparable product

---
*Research completed: 2026-08-02*
*Ready for roadmap: yes*
