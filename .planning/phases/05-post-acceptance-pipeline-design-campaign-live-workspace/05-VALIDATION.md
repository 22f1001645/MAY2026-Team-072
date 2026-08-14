---
phase: 5
slug: post-acceptance-pipeline-design-campaign-live-workspace
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-15
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `05-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (backend)** | pytest 8.3.2 + pytest-cov 5.0.0 |
| **Config file (backend)** | `backend/pytest.ini` — `testpaths = tests`, `addopts = -q --cov=app --cov-report=term-missing` |
| **Quick run command (backend)** | `cd backend && pytest tests/<file> -k "<selector>" -x -q` |
| **Full suite command (backend)** | `cd backend && pytest` |
| **Framework (frontend)** | vitest 3.2.7 + @testing-library/react 16.3.2, jsdom 26.1.0 |
| **Config file (frontend)** | `frontend/vitest.config.ts` — `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/test/setup.ts']` |
| **Quick run command (frontend)** | `cd frontend && npx vitest run <path>` |
| **Full suite command (frontend)** | `cd frontend && npm test` (→ `vitest run`) |
| **Type gate** | `cd frontend && npm run build` (→ `tsc -b && vite build`) |
| **Estimated runtime** | ~5s per `-k` selector; full backend suite ~30s; frontend build + test ~60s |

*Framework install: none needed — pytest and vitest are both pinned and running today.*

---

## Sampling Rate

- **After every task commit:** Run the single `-k` selector for the criterion just implemented (each is < 5s)
- **After every plan wave:** Run `cd backend && pytest` **and** `cd frontend && npm run build && npm test`
- **Before `/gsd-verify-work`:** Both full suites green, plus `cd backend && pytest tests/test_rbac_enforcement.py tests/test_blueprint_registration.py -x -q` explicitly
- **Max feedback latency:** 5 seconds (per-task), 90 seconds (per-wave)

---

## Per-Task Verification Map

> Task IDs are assigned by the planner. Populate this table from each PLAN.md's
> `<verify>` blocks once plans exist; the requirement → command mapping below is
> already fixed by `05-RESEARCH.md` § Phase Requirements → Test Map.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 5-01-01 | 01 | 1 | DESIGN-01 (AC-01..03) | — | N/A | integration | `pytest tests/test_event_schedule.py -k "crud" -x -q` | ❌ W0 | ⬜ pending |
| 5-01-02 | 01 | 1 | DESIGN-01 (AC-04) | — | Campaign builder refuses to unlock on an empty schedule | integration | `pytest tests/test_event_schedule.py -k "schedule_empty" -x -q` | ❌ W0 | ⬜ pending |
| 5-01-03 | 01 | 1 | DESIGN-01 (AC-05) | — | N/A | integration | `pytest tests/test_event_schedule.py -k "ordering" -x -q` | ❌ W0 | ⬜ pending |
| 5-01-04 | 01 | 1 | DESIGN-01 (AC-06) / PROB-P3 | — | Schedule immutable after `status="live"` → 409 | integration | `pytest tests/test_event_schedule.py -k "immutable_after_live" -x -q` | ❌ W0 | ⬜ pending |
| 5-01-05 | 01 | 1 | DESIGN-01 (AC-07) | — | N/A | integration | `pytest tests/test_event_schedule.py -k "presets" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-01 (AC-08) / PROB-P1 | — | Facts server-interpolated, never model-written | integration (mocked) | `pytest tests/test_campaign_package.py -k "facts_are_server_interpolated" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-01 / PROB-P2 | — | Degrades to a non-empty draft with no AI key; never a 500 | integration (mocked) | `pytest tests/test_campaign_package.py -k "degrades_not_empty" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-01 (AC-10) | — | N/A | integration | `pytest tests/test_campaign_package.py -k "regenerate_overwrites" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-02 (AC-09) | — | N/A | unit (mocked) | `pytest tests/test_campaign_package.py -k "prompt_carries_brand_voice" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-02 (AC-11) | — | Only **accepted** collaborators' logos appear | integration (mocked) | `pytest tests/test_campaign_package.py -k "mega_meetup_logos" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-03 (AC-12,13) | — | Upload constrained by type + size cap | integration | `pytest tests/test_campaign_package.py -k "poster" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-03 (AC-14) | — | N/A | integration | `pytest tests/test_campaign_package.py -k "uploads_serve" -x -q` | ⚠️ Phase 4 04-03 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-04 (AC-15..17) | — | Slug unique; collision retry ≤3 | integration | `pytest tests/test_campaign_package.py -k "slug" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-05 (AC-18..20) | — | N/A | integration | `pytest tests/test_campaign_package.py -k "form_field_crud" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-05 (AC-21) | — | Duplicate label → 409 `duplicate_label` | integration | `pytest tests/test_campaign_package.py -k "duplicate_label" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-05 (AC-22) | — | N/A | integration | `pytest tests/test_campaign_package.py -k "field_ordering" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-05 (AC-23) | — | Core fields are fixed, not client-supplied | integration | `pytest tests/test_campaign_package.py -k "register_form_shape" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-06 (AC-24) | — | Approval audit trail written | integration | `pytest tests/test_campaign_package.py -k "push_live_sets_audit_fields" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-06 (AC-25) | — | **Negative control:** non-Meetup-Head push-live → 403 server-side | integration | `pytest tests/test_campaign_package.py -k "non_meetup_head_403" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | CAMPAIGN-06 (AC-26) | — | Push-live idempotent; timestamps unchanged | integration | `pytest tests/test_campaign_package.py -k "push_live_idempotent" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEAM-01 (AC-27, AC-33) | — | Tasks unreachable before push-live → 403 `campaign_not_live` | integration | `pytest tests/test_activity_tasks.py -k "not_live" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEAM-02 (AC-28..30) | — | CRUD gated by `can_manage_activity` | integration | `pytest tests/test_activity_tasks.py -k "crud" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEAM-02 (AC-31, AC-32) | — | N/A | integration | `pytest tests/test_activity_tasks.py -k "ordering" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEAM-02 (AC-34) | — | Unknown status rejected 422, not persisted | integration | `pytest tests/test_activity_tasks.py -k "invalid_status_422" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEAM-02 (AC-35) | — | N/A | unit (source scan) | `npx vitest run src/__tests__/no-kanban-polling.test.ts` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEAM-03 (AC-36) | — | Crew membership grants **no** org-wide permission | integration | `pytest tests/test_activity_tasks.py -k "team_role_grants_no_org_permission" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEAM-03 / PROB-P4 | — | Removed member loses access on the next request | integration | `pytest tests/test_activity_tasks.py -k "removed_member_loses_access" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEAM-04 (AC-37) | — | Non-crew award → 403 `not_crew_member` **and no ledger row** | integration | `pytest tests/test_activity_tasks.py -k "volunteer_points_non_crew" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | TEAM-04 (AC-38) | — | N/A | integration | `pytest tests/test_activity_tasks.py -k "volunteer_points_crew" -x -q` | ❌ W0 | ⬜ pending |
| TBD | TBD | TBD | (all) RBAC-02 | — | Every new `<activity_id>` route carries a scoped guard | integration (structural) | `pytest tests/test_rbac_enforcement.py -x -q` | ✅ exists | ⬜ pending |
| TBD | TBD | TBD | (all) blueprint wiring | — | N/A | integration (structural) | `pytest tests/test_blueprint_registration.py -x -q` | ⚠️ Phase 4 04-01 | ⬜ pending |
| TBD | TBD | TBD | UI-SPEC | — | POR-literal gate stays green | type + unit | `cd frontend && npm run build && npm test` | ✅ exists | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `backend/tests/test_event_schedule.py` — covers DESIGN-01 (AC-01…07)
- [ ] `backend/tests/test_campaign_package.py` — covers CAMPAIGN-01…06 (AC-08…26) + PROB-P1/P2
- [ ] `backend/tests/test_activity_tasks.py` — covers TEAM-01…04 (AC-27…38) + PROB-P3/P4
- [ ] `frontend/src/__tests__/no-kanban-polling.test.ts` — structural gate for AC-35, following the `import.meta.glob('?raw')` source-scan idiom already used by `no-por-literals.test.ts` (the repo has no `@types/node`, so `node:fs` is not available)
- [ ] A module-local `_seed_activity(...)` helper in each new backend test file — `conftest.py` seeds **zero** activities
- [ ] A mocked `google-genai` fixture (monkeypatch the lazily-imported symbol) so no test needs a live key or a network
- [ ] `backend/tests/test_blueprint_registration.py` — **owned by Phase 4 plan 04-01**; Phase 5 must create it if Phase 4 slips

*Framework install: none needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Copy shareable registration link | CAMPAIGN-04 | `navigator.clipboard` is not implemented in jsdom by default; stubbing it tests the stub | Open the campaign builder on a live activity, click **Copy link**, paste into the address bar, confirm it resolves to the event |
| Poster drag-hover styling | CAMPAIGN-03 | Drag-and-drop hover state is a visual affordance with no assertable DOM contract | Drag an image file over the poster dropzone, confirm the hover treatment appears and clears on drag-leave |
| Another team member on another device sees the task | ROADMAP criterion 5 / TEAM-02 | Two-browser, two-session check | Create a task as member A; open the same board as member B in a different browser profile; confirm the task, assignee and deadline appear after reload |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s per task
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
