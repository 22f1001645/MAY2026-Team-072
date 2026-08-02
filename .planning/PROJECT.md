# Ekatva OS

## What This Is

Ekatva OS is the Community Operating System for the IIT Madras BS Programme — 40,000+ students spread across India, meeting their degree almost entirely through a screen. It replaces the fragmented WhatsApp/Google Forms/Sheets/email stack that the student-led civic layer (Houses, Societies, Regional Communities, the Student Executive Council) currently runs on, with one connected platform for the city-meetup lifecycle: propose, approve, publish, discover, register, attend, reimburse, and recognise. v1 (this course's build) ships that lifecycle end-to-end; the platform's north star is the full "eight operating systems" vision (Community, Events, Operations, Knowledge, Intelligence, Recognition, Innovation, Alumni OS).

## Core Value

A Regional Coordinator can propose, get approved, publish, fill, run, and reimburse a city meetup — and a student can discover, register for, and stay updated on it — entirely inside Ekatva OS. (PRD v2.2 §11, the MVP thesis.)

## Requirements

### Validated

<!-- Shipped and confirmed working — the v1 spine, per PRD v2.2 §10-11 and the codebase map. -->

- ✓ Two-role onboarding (Admin, Student) with all other permissions derived from POR (Position of Responsibility), never the login role — v1
- ✓ Admin-seeded organisations (Houses, Societies, Regional Communities, Councils) + city/region reference data — v1
- ✓ RC meetup quota guardrail (one meetup per region per month), enforced server-side — v1
- ✓ Proposal → admin approval workflow (approve / request changes / reject) with an immutable audit trail — v1
- ✓ Auto-publish of approved activities as live events — v1
- ✓ City-based discovery feed + event detail pages — v1
- ✓ Student registration with headcount + capacity tracking — v1
- ✓ Broadcasts + per-user notifications for time-critical updates — v1
- ✓ Line-item budget on a proposal → expense/bill submission → admin verification → reimbursement status tracking (Submitted→Verified→Approved→Paid, no real money movement) — v1
- ✓ Attendance capture (organiser check-in), the basis for points and fee utilisation — v1
- ✓ Recognition: points ledger (attend/organise/volunteer) + per-city leaderboard, computed over attendance data — v1 (point values are hardcoded in `constants.py`, NOT admin-configurable — PRD FR-G6 is SH-priority and not actually shipped, see Context)
- ✓ Admin community analytics + ₹100 activity-fee utilisation tracking, computed over the same data — v1 (city heatmap/ranking and organiser-activity view are NOT implemented — PRD FR-H6/H7 are SH-priority and not actually shipped, see Context)
- ✓ Organiser workspace (registration list) and activity auto-archive — v1, THIN (explicitly flagged in PRD as "deepen in Phase 2")
- ✓ Task assignment on an activity — v1, THIN/mocked only (client-side mock array, never persisted — the gap this milestone closes)

### Active

<!-- Current milestone: Organiser Dashboard deepening. This is PRD v2.2 §18's own "Phase 2: Deepen operations" roadmap item (full workspace/tasks, knowledge search & templates, auto-filled reports), scoped for this pass. Full TRD covers all of these; build order is phased (see ROADMAP.md once created). -->

- [ ] Dashboard switcher: a user holding an organiser POR can toggle between their Student view and Organiser view (today they're hard-locked into one nav)
- [ ] Auth: long-lived refresh token + short-lived access token, so login feels persistent without a forced re-login
- [ ] Academic-status field on User (level: foundation/diploma/degree; status: active/on-break/withdrawn), with a termly self-confirmation nudge and admin override — decoupled from session/auth, designed to be swapped for an official IITM BS feed later
- [ ] Activity-scoped team/task model: any org member can be tagged as a collaborator on an Activity with a task + deadline, persisted server-side (replaces the current mock)
- [ ] Entity profile + social-link editing: Secretary/Deputy Secretary can edit their organisation's social links (link-tree style) and their own profile, across all org types (house/society/region/council)
- [ ] Event timeline with post-event feedback: organiser reflection (challenges, learnings — feeds the existing report flow) plus a lightweight attendee-facing rating/feedback prompt
- [ ] AI campaign creator: mail-template generation, poster upload/generate, registration-link generation, unlocked on proposal approval
- [ ] Progression-gating: fest-scale / sponsorship-tier proposals unlock for an org once it completes its meetup milestones
- [ ] Chat + polls scoped to an event's registration window
- [ ] QR-code check-in, replacing the current tap-based roster check-in
- [ ] Budget/report tracking wired into the redesigned organiser dashboard (existing Expenses/BudgetLine/report flow, surfaced against the new team/task view)

### Out of Scope

<!-- PRD v2.2 §10.2 Vision Horizon exclusions, carried forward as-is, plus this milestone's own boundary calls. -->

- Sponsorship/outreach CRM (fest-scale) — PRD Vision Horizon; this milestone's "progression-gating" only unlocks the ability to propose a fest, it does not build sponsor management
- Multi-department fest orchestration & cross-house co-organising — PRD Vision Horizon
- Logistics resource-availability calendar — PRD Vision Horizon (Phase 2/3)
- Badge tiers, seasons, leadership scores — PRD Vision Horizon; basic points/leaderboard already shipped and stay as-is
- Innovation OS (Ekatva Solutions, StudyBuddy, AI tools beyond the campaign-creator's mail/poster generation) — PRD Vision Horizon
- Alumni OS (mentorship, alumni network, giving) — PRD Vision Horizon
- Predictive / leadership-pipeline analytics — PRD Vision Horizon; descriptive analytics already shipped
- Direct/group messaging as a WhatsApp/Instagram replacement — PRD explicit exclusion; this milestone's chat/polls are scoped strictly to one event's registration window, not general messaging
- Real payment or fund disbursement — PRD hard constraint (FR-E6); reimbursement stays tracking-only forever
- Native mobile app; full external institutional-records integration — PRD Vision Horizon; the academic-status field is self-declared + admin-override for now, built so a future IITM BS registration feed can replace the self-declare step without touching auth

## Context

- **Course project**: BSCS3001 Software Engineering Project, IIT Madras BS Programme, May 2026 term. Team CodeCrafters (Team-072): Atharva Shree, Harsh Raj, Kavya Jain, Mili Parashar, Vishal Bhandari. PRD v2.2 (20 Jul 2026) supersedes the Product Discovery Blueprint v0.1 and SRS v3.0/PRD v1.2 — those earlier docs are historical context, not current spec.
- **Domain structure**: 40,000+ distributed online students. Civic layer: Student Executive Council (SEC) → Departments (Cultural/Technical/Sports) → ~12 Houses → Regional Chapters/Communities (city-level, run by Regional Coordinators) + Societies (interest-based). POR (Position of Responsibility) is the atom of permissions (Principle P3) — Secretary, Deputy Secretary, RC, Event Lead, Society Coordinator, Volunteer.
- **Product principles (PRD §3, non-negotiable)**: P1 community before organisation before activity · P2 belonging is the outcome, friction-removal is the job · P3 permissions follow PORs, not logins · P4 knowledge must survive leadership · P5 operations should be invisible · P6 every contribution is visible · P7 evidence over untested assumption · P8 design for turnover and scale.
- **v1 thesis**: one vertical, the city-meetup lifecycle, joined at a single object (the published event) where the student's and organiser's journeys meet. Co-primary users: student and organiser.
- **Tech stack** (Milestone 2 design, matches `.planning/codebase/STACK.md`/`ARCHITECTURE.md`): React 18 + Vite + TypeScript + Tailwind + TanStack Query frontend; Flask 3 + SQLAlchemy + JWT REST backend (SQLite dev / Postgres prod); three-tier controllers → services → repositories → models; POR-based RBAC enforced server-side, deny-by-default.
- **Codebase reality surfaced this session**: the 2-login-role model is already implemented exactly per PRD; organiser surface is already derived from POR client- and server-side. The dashboard-switcher gap, the mocked (never-persisted) task list, and the Houses-only precedent for org metadata (`HOUSE_META`) are the concrete gaps this milestone closes.
- **This milestone = PRD's own roadmap**: PRD v2.2 §18 names "Phase 2: Deepen operations — full workspace/tasks, logistics calendar, knowledge search & templates, auto-filled reports, announcements" as the next Vision-Horizon phase. This milestone is that phase, scoped down to what's practical for this pass, with a couple of session-emerged additions (dashboard switcher, auth persistence, academic-status field) folded in because they're prerequisites for it.
- **Known v1 gaps NOT part of this milestone**: cross-checking PRD §12's MoSCoW priorities (not just its Vision-Horizon exclusions) against the actual codebase surfaced two SH-priority v1 requirements that were labelled "v1" but never actually shipped — FR-G6 (point values admin-configurable; currently a hardcoded `POINTS` dict in `constants.py`) and FR-H6/H7 (city heatmap/ranking, organiser-activity view; not present anywhere in `analytics_service.py`). Both are Admin-analytics/Recognition-config concerns, not Organiser-dashboard concerns, so they're deliberately left out of this milestone's Active list rather than scope-creeping it — but they're recorded here so they aren't silently lost. Candidate for a small follow-up milestone.

## Constraints

- **Tech stack**: React/Vite/TS/Tailwind frontend + Flask/SQLAlchemy backend, no new frameworks — course constraint (Milestone 2 design doc, team's existing skillset, pytest deliverable requirement)
- **Timeline**: five-person team, course-term milestone structure; gradeable against a rubric
- **No real money**: reimbursement/fee tracking must never move real funds (PRD FR-E6, hard constraint)
- **No Alembic yet**: schema changes mean editing models + rerunning the destructive `seed.py` — flag before running in any phase that touches models
- **Auth**: JWT-based, POR-RBAC enforced server-side and deny-by-default (Milestone 2 design, cross-cutting middleware)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Keep exactly two login roles (Admin, Student); organiser stays fully POR-derived | Already matches PRD Principle P3 and the existing implementation; no reason to add a third login role | ✓ Good |
| Session auth: long-lived refresh token + short-lived access token | Feels persistent (no forced re-login) while a leaked token still expires; kept fully decoupled from academic-status freshness | — Pending |
| Academic-status (level/status) is a decoupled `User` field with a termly self-confirm nudge + admin override, not a session/login concern | IITM BS term structure means level/status genuinely changes (foundation→diploma→degree, term-break, withdrawal); no institutional feed exists yet, field is designed to be swapped for one later | — Pending |
| Add an explicit dashboard switcher for POR holders | Notes explicitly asked for it; today's hard-lock into one nav blocks students who also organise from seeing their student view | — Pending |
| Event-team/task model is new and Activity-scoped, not a reuse of the org-wide POR system | Per-event collaborators+tasks are a distinct concept from org-wide POR roles; POR stays scoped to Organisation as the existing model already defines it | — Pending |
| Entity profile/social-links apply to all org types (house/society/region/council), not Houses-only | A single consistent model beats the special-case the existing `HOUSE_META` hints at | — Pending |
| Post-event feedback is dual-sided: organiser reflection + attendee rating | Notes literally ask for organiser challenges/learnings; a cheap attendee-facing rating closes the P6/P7 (visible contribution, evidence) loop | — Pending |
| Document the complete 9-item TRD now; build a prioritized subset first | User wants full context captured and GSD-tracked even though the build itself is phased | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-08-02 after initialization*
