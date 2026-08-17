---
phase: 4
slug: organisation-profile-brand-kit
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-13
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Seeded by `/gsd-plan-phase 4` from `04-RESEARCH.md` § Validation Architecture.
> Covers ORG-01, ORG-02, ORG-03, ORG-04.

---

## Test Infrastructure

### Backend (exists — inherited from Phase 1/2/3)

| Property | Value |
|----------|-------|
| **Framework** | pytest 8.3.2 + pytest-cov 5.0.0 |
| **Config file** | `backend/pytest.ini` — `testpaths = tests`, `addopts = -q --cov=app --cov-report=term-missing` |
| **Quick run command** | `cd backend && pytest tests/test_url_safety.py tests/test_org_profile_brand_kit.py -x -q` |
| **Full suite command** | `cd backend && pytest` |
| **Estimated runtime** | ~30 seconds quick / full suite green at 34/34 as of Phase 3 |
| **Phase 4 test files** | `backend/tests/test_org_profile_brand_kit.py` (NEW), `backend/tests/test_url_safety.py` (NEW — pure unit, no app fixture, ~1s) |

### Frontend (exists — established in Phase 2)

| Property | Value |
|----------|-------|
| **Framework** | vitest 3.2.7 + jsdom 26.1.0 |
| **Config file** | `frontend/vitest.config.ts` — `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/test/setup.ts']` |
| **Full suite command** | `cd frontend && npx vitest run && npx tsc --noEmit` |
| **Phase 4 test file** | `frontend/src/lib/__tests__/url-safety.test.ts` (NEW) |

### Fixtures reusable as-is

| Fixture | Value for Phase 4 |
|---------|-------------------|
| `app`, `client` | in-memory SQLite, `db.create_all()`, `_seed_minimal()`, torn down per test |
| `admin_headers` | admin short-circuit path through `can_manage_org` |
| `rc_headers` | Regional Coordinator POR on the region org → `can_manage_org` True |
| `student_headers` | no POR → the plain-403 case |
| `region_org()` / `other_org()` | **the cross-org 403 pair is already seeded** — ROADMAP criterion 1's 403 test needs no new fixture |
| `crew_headers`, `meetup_head_headers` | POR-less users — prove team membership grants no org authority |

---

## Sampling Rate

- **After every task commit:** `cd backend && pytest tests/test_url_safety.py tests/test_org_profile_brand_kit.py -x -q`
- **After every plan wave:** `cd backend && pytest` **and** `cd frontend && npx vitest run && npx tsc --noEmit`
- **Before `/gsd-verify-work`:** both suites green, including `test_rbac_enforcement.py` and `test_migrations.py`
- **Max feedback latency:** 30 seconds
- **No watch-mode flags** — `-x -q` only, matching `03-VALIDATION.md`'s sign-off.

---

## Per-Task Verification Map

*Task IDs are assigned by the planner. This table is completed during `/gsd-execute-phase`; the requirement-level map below is the authored contract each task must satisfy.*

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| *(pending planner task IDs)* | | | | | | | | | ⬜ pending |

### Per-Requirement Verification Map (authored contract)

| Req | Behaviour | Type | Automated Command | Exists? |
|-----|-----------|------|-------------------|---------|
| ORG-01 | House Secretary edits own house's bio+logo → 200, persisted | integration | `pytest tests/test_org_profile_brand_kit.py -k "edit_own_house" -x -q` | ❌ W0 |
| ORG-01 | Society Deputy Secretary edits own society → 200 | integration | `... -k "society_deputy_edits" -x -q` | ❌ W0 |
| ORG-01 | RC edits the region org → 200 | integration | `... -k "rc_edits_region" -x -q` | ❌ W0 |
| ORG-01 | A council org's manager edits it → 200 (**4th type**) | integration | `... -k "council" -x -q` | ❌ W0 |
| ORG-01 | **Secretary of A → org B → 403 `forbidden`** (criterion 1) | integration | `... -k "cross_org_403" -x -q` | ❌ W0 |
| ORG-01 | Nonexistent org id → **404 `not_found`**, not 403, not 500 | integration | `... -k "unknown_org_404" -x -q` | ❌ W0 |
| ORG-01 | POR-less student → 403 | integration | `... -k "student_forbidden" -x -q` | ❌ W0 |
| ORG-01 | Admin can edit any org | integration | `... -k "admin_any_org" -x -q` | ❌ W0 |
| ORG-01 | Logo upload: valid PNG → 200, `logo_url` set, file on disk | integration | `... -k "logo_upload_png" -x -q` | ❌ W0 † |
| ORG-01 | Logo: **SVG rejected** 400 `invalid_image` | integration | `... -k "logo_rejects_svg" -x -q` | ❌ W0 † |
| ORG-01 | Logo: **`.png` name with non-image bytes rejected** (magic-byte sniff) | integration | `... -k "logo_sniffs_content" -x -q` | ❌ W0 † |
| ORG-01 | Logo: over-size rejected before buffering (413) | integration | `... -k "logo_too_large" -x -q` | ❌ W0 † |
| ORG-01 | `GET /uploads/<name>` needs **no auth** and refuses traversal | integration | `... -k "uploads_public_no_traversal" -x -q` | ❌ W0 † |
| ORG-01 | Every scoped route is guarded, none coarse | integration | `pytest tests/test_rbac_enforcement.py -x -q` | ✅ exists |
| ORG-01 | No new migration is due | integration | `pytest tests/test_migrations.py -x -q` | ✅ exists |
| ORG-02 | **Vector table**: all 17 D-3 inputs → expected accept/reject | **unit** | `pytest tests/test_url_safety.py -x -q` | ❌ W0 |
| ORG-02 | `javascript:` and `data:` rejected 400 `social_url_scheme` | integration | `... -k "scheme_rejected" -x -q` | ❌ W0 |
| ORG-02 | `https://evil.com` rejected 400 `social_url_host` | integration | `... -k "host_rejected" -x -q` | ❌ W0 |
| ORG-02 | `https://instagram.com.evil.com` rejected (suffix attack) | unit | `pytest tests/test_url_safety.py -k "suffix" -x -q` | ❌ W0 |
| ORG-02 | `https://instagram.com@evil.com` rejected (userinfo) | unit | `pytest tests/test_url_safety.py -k "userinfo" -x -q` | ❌ W0 |
| ORG-02 | **Stored value is normalised, not raw** | integration | `... -k "stores_normalised" -x -q` | ❌ W0 |
| ORG-02 | **Criterion 2 read filter**: hostile row inserted via ORM → absent from `GET /profile` | integration | `... -k "hostile_row_never_rendered" -x -q` | ❌ W0 |
| ORG-02 | Editing an existing platform's URL does **not** 500 on `uq_org_social_platform` | integration | `... -k "replace_existing_platform" -x -q` | ❌ W0 |
| ORG-02 | Duplicate platform in one payload → 400 `duplicate_platform` | integration | `... -k "duplicate_platform" -x -q` | ❌ W0 |
| ORG-02 | `safeExternalHref('javascript:alert(1)')` → `undefined` | unit | `cd frontend && npx vitest run src/lib/__tests__/url-safety.test.ts` | ❌ W0 |
| ORG-03 | Save + read back a full kit → 200, values persisted | integration | `... -k "brand_kit_roundtrip" -x -q` | ❌ W0 |
| ORG-03 | Second `PUT` **updates**, does not create a 2nd row | integration | `... -k "brand_kit_upsert" -x -q` | ❌ W0 |
| ORG-03 | Palette `"red"` / `"#ff"` / `"rgb(1,2,3)"` → 422 | integration | `... -k "palette_hex_only" -x -q` | ❌ W0 |
| ORG-03 | Palette > 6 entries / phrase > 200 chars → 422 | integration | `... -k "brand_kit_bounds" -x -q` | ❌ W0 |
| ORG-03 | `source` outside `BRAND_KIT_SOURCES` → 422 | integration | `... -k "brand_kit_source_enum" -x -q` | ❌ W0 |
| ORG-03 | **`brand_kit_for(org_without_kit)` returns a dict with `has_kit: False`, never `None`** | **unit** | `... -k "brand_kit_for_contract" -x -q` | ❌ W0 |
| ORG-03 | `brand_kit_for` carries `logo_url` (CAMPAIGN-02 needs it) | unit | `... -k "brand_kit_for_carries_logo" -x -q` | ❌ W0 |
| ORG-03 | Cross-org brand-kit read/write → 403 | integration | `... -k "brand_kit_cross_org" -x -q` | ❌ W0 |
| ORG-04 | **Draft persists NOTHING** — `BrandKit.query.count()` and `AuditLog.query.count()` unchanged | integration | `... -k "draft_persists_nothing" -x -q` | ❌ W0 |
| ORG-04 | Key unset → **503 `ai_unavailable`**, never 500 | integration | `... -k "ai_unconfigured_503" -x -q` | ❌ W0 |
| ORG-04 | `GET /brand-kit` reports `ai_available: false` when unset | integration | `... -k "ai_available_flag" -x -q` | ❌ W0 |
| ORG-04 | **Mocked** client returning valid JSON → 200 with a complete draft | unit (mocked) | `... -k "draft_happy_path_mocked" -x -q` | ❌ W0 |
| ORG-04 | **Mocked** client returning a bad palette → 503 `ai_failed`, nothing stored | unit (mocked) | `... -k "draft_invalid_output" -x -q` | ❌ W0 |
| ORG-04 | Cross-org draft → 403 | integration | `... -k "draft_cross_org" -x -q` | ❌ W0 |
| ORG-04 | App boots and the full suite passes with `google-genai` **absent** | integration | `cd backend && pytest` | partly ✅ |
| all | No POR literals leak into new frontend files | unit | `cd frontend && npx vitest run src/__tests__/no-por-literals.test.ts` | ✅ exists |
| all | Type check clean | build | `cd frontend && npx tsc --noEmit` | ✅ exists |

† Logo-upload rows apply only if the upload primitive is in scope (see the logo scope decision recorded in the plan).

---

## Wave 0 Requirements

- [ ] `backend/tests/conftest.py` — add a **council** organisation. ⚠️ **Append after the existing three** — `conftest.py:46-48` notes that ordering is load-bearing (`Organisation.query.first()` must still return the region org).
- [ ] `backend/tests/conftest.py` — add `house_secretary_headers` (POR `House Secretary` on the house org).
- [ ] `backend/tests/conftest.py` — add `society_deputy_headers` (POR `Society Deputy Secretary` on the society org). Construct rows directly like `_seed_minimal` does — **not** through `org_service.assign_por` (its `HOUSE_ONLY_POR_TYPES` guardrail will reject them).
- [ ] `backend/tests/test_org_profile_brand_kit.py` — the phase's integration test file
- [ ] `backend/tests/test_url_safety.py` — pure unit table over the 17 D-3 vectors, no app fixture
- [ ] `frontend/src/lib/__tests__/url-safety.test.ts` — `safeExternalHref()` unit test
- [ ] `backend/.env.example` — does not exist
- [ ] A blueprint-registration test — see RESEARCH Pitfall 1 (`ALL_BLUEPRINTS`)

*No framework installation needed — pytest and vitest both run green today.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| All four org types editable | ORG-01 | Visual/UX across four entity types | As admin, open the profile editor for a house, a society, a region and a council. Confirm each saves. |
| Cross-org denial is invisible, not broken | ORG-01 | UI affordance + API behaviour together | As a House Secretary, confirm no Edit control renders for any other org. Then `curl` the PATCH for another org and confirm 403 with a readable message. |
| Bad link rejected with the server's reason | ORG-02 | Inline error presentation | Enter `javascript:alert(1)`, then `https://evil.com`. Confirm the reason shows inline per `03-UI-SPEC.md:259` and **the form keeps every other field**. |
| Logo round-trip | ORG-01 | Real file picker + browser rendering | Upload a PNG, hard-reload, confirm it renders. Upload an SVG, confirm rejection. |
| AI button when unconfigured | ORG-04 | Render-lock state | With `GEMINI_API_KEY` unset, confirm the button is render-locked with a visible explanation, not a bare disabled control and not a 500. |
| AI draft is never auto-applied | ORG-04 | Multi-step navigation | With a key set, click Draft, edit a field, navigate away **without saving**, return — confirm the kit is still absent. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
