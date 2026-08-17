---
phase: 04-organisation-profile-brand-kit
verified: 2026-08-14T09:23:52Z
status: human_needed
score: 6/8 must-haves verified
behavior_unverified: 2
overrides_applied: 0
behavior_unverified_items:
  - truth: "A Secretary can define and save a brand kit from the profile page UI, and the save actually persists what was typed (ORG-03, ROADMAP criterion 3's UI half)."
    test: "As a Secretary/Deputy Secretary, open /orgs/:orgId, edit voice/tone + palette + phrases, press Save brand kit, reload, confirm the values read back."
    expected: "The kit persists exactly what was typed/edited (colours lowercased) and a subsequent GET/reload shows it; `brand_kit_for()` (already unit-tested server-side) is what Phase 5 will read."
    why_human: "Code inspection confirms `submit()` is the only caller of `save.mutate` and is wired to the Save button's onClick, and the backend PUT/GET round trip is fully covered by pytest — but no rendered-component or browser test exercises the actual click-save-reload user journey, and the phase's own blocking checkpoint for this was not run."
  - truth: "An AI-drafted brand kit populates the live form, and nothing is ever applied to the server until the user explicitly presses Save — confirmed by actually drafting, editing, navigating away without saving, and returning to find the kit unchanged (ORG-04, ROADMAP criterion 4, the phase's headline observable)."
    test: "With GEMINI_API_KEY set (or mocked), press Draft with AI, edit a field, navigate to another page in-app without saving, return to the org profile, confirm the saved kit (or absence of one) is unchanged and no trace of the draft remains."
    expected: "The draft never reaches the database on its own; only an explicit Save request changes server state."
    why_human: "Backend guarantee is airtight (POST /brand-kit/draft is proven, by a row-count test on both outcomes, to write zero rows) and static code reading confirms `fillFrom()` only calls React `setState` while `draft.mutate` is never followed by `save.mutate` — but this is precisely the state-transition/persistence-absence class of claim that a passing behavioral test or a human session is needed to certify, and 04-09's own blocking checkpoint (Task 3, behaviour 6) was explicitly left unperformed by the user's own words: 'approved for now .. I will check later.'"
human_verification:
  - test: "All four org types editable, same layout, no per-type branch beyond the badge (checkpoint behaviour 1)."
    expected: "House, society, region and council each save a bio through the same page shape."
    why_human: "Backend proves this per-type (integration tests for all four); frontend live smoke in 04-07 covered Region + House only, not Society/Council explicitly."
  - test: "Cross-org denial is invisible in the UI, and a curl PATCH against another org returns a readable 403 (checkpoint behaviour 2)."
    expected: "No Edit control, no greyed control, no padlock, no permission line, no Brand kit card for a non-manager; curl gets 403 forbidden."
    why_human: "Backend 403 is proven by automated tests; the UI-affordance-absence claim was live-tested in 04-07 for a POR-less student, not specifically for a cross-org Secretary, and the checkpoint that would have confirmed both together was deferred."
  - test: "A bad link is rejected inline with the server's reason, only that field marked, every other field intact; a tab-in-hostname link reads back normalised (checkpoint behaviour 3)."
    expected: "javascript:alert(1) and https://evil.com are rejected per-row without clearing the form; a normalised value round-trips correctly."
    why_human: "Strongly evidenced already (04-08's own live browser smoke performed this exact check and passed), but the phase's own blocking checkpoint re-confirmation was not re-run at phase close."
  - test: "Logo round-trip: PNG survives a hard reload, SVG rejected with its copy, an oversized file gives the size message, and /admin/orgs still reads as one grid (checkpoint behaviour 4)."
    expected: "Upload/reject/size-limit UX behaves as specified; the Houses grid shows no visual seam between uploaded and seeded logos."
    why_human: "Backend and structural frontend evidence is strong; the live grid-reads-as-one-grid visual check and the SVG-rejection-copy check were not re-confirmed at phase close."
  - test: "With GEMINI_API_KEY unset, Draft with AI is render-locked with a visible explanation, not hidden and not a bare disabled control (checkpoint behaviour 5)."
    expected: "The A0 state renders exactly as specified: padlock, sentence, hoverable/focusable, never pointer-events-none."
    why_human: "Grep-verified structurally (aria-disabled, no pointer-events-none, the sentence literal all present) but never rendered and eyeballed in a browser."
  - test: "Four UI-SPEC visual backstop states at 320px/768px/1440px: long org-name wrap, long-hostname chip wrap, maximal brand-kit form height, and the 12-card Houses grid."
    expected: "No horizontal scroll/clipping at any width; the grid reads as one grid."
    why_human: "Explicitly marked `verification: backstop` in the plans — non-inferable from code, requires a human or visual-regression tool; none of the four was eyeballed per 04-09-SUMMARY.md."
---

# Phase 4: Organisation Profile & Brand Kit Verification Report

**Phase Goal:** Every organisation type — house, society, region, council — has an editable public identity and a brand kit that later drives campaign generation.
**Verified:** 2026-08-14T09:23:52Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth (ROADMAP Success Criterion) | Status | Evidence |
|---|---|---|---|
| 1 | A Secretary/Deputy Secretary can edit bio/logo/social links for all four org types; a Secretary of org A gets 403 on org B | ✓ VERIFIED | Backend: `test_all_four_org_types_are_reachable_through_one_path`, `test_society_deputy_edits_own_society`, `test_rc_edits_region_profile`, `test_coordinator_edits_council_profile`, `test_cross_org_403_not_404_and_not_500` — full suite green (see below). Frontend: no per-type branch in `OrgProfile.tsx`/`OrgLogo.tsx` beyond the type badge (grep-asserted in 04-07); live smoke confirmed Region + House end to end, POR-less-student affordance-absence confirmed live. Code review found and the follow-up commit fixed the one genuine authorization defect in this area (CR-01, see below). |
| 2 | A social link with a non-http(s) scheme or non-allowlisted host is rejected at save time and never rendered anywhere | ✓ VERIFIED | Backend: 52-case `test_url_safety.py` (scheme-first-and-unconditional, userinfo, suffix attack, homograph, SSRF ranges, all pass) + `test_hostile_row_never_rendered` (ORM-inserted hostile row absent from `GET /profile`, its URL appears nowhere in `json.dumps`). Frontend: `safeExternalHref` (layer 3) with 30 passing vitest cases; 04-08's own live-browser smoke inserted a hostile row directly into the DB and confirmed zero page-source trace and the `withheld_platforms` disclosure to the manager only. Minor residual gap (WR-05, `GET /orgs` doesn't re-run the read filter on `website`) is defense-in-depth only — `safeExternalHref` still gates that render site client-side — and is tracked as a non-blocking warning per the review. |
| 3a | A brand kit (voice/tone, palette, phrases) is definable and readable by the campaign creator seam | ✓ VERIFIED | `brand_kit_for()` is total, pinned to an 8-key contract, and unit-tested (`test_brand_kit_for_contract`, `test_brand_kit_for_carries_logo`); `PUT`/`GET /brand-kit` round-trip, upsert-not-duplicate, and the six-digit-hex XSS gate are all integration-tested and pass. |
| 3b | A Secretary can actually define and save a brand kit *through the page UI* | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | `BrandKitEditor.tsx`'s `submit()` is the sole caller of `save.mutate`, wired to the Save button's `onClick` (code-read confirmed); structural/unit tests (`brand-kit-rejection.test.ts`) cover rejection placement only. No rendered-component or live-browser test exercises the actual save round trip, and 04-09's blocking human checkpoint covering this was explicitly deferred. See `behavior_unverified_items`. |
| 4a | The AI draft endpoint persists nothing on any path (server-side guarantee) | ✓ VERIFIED | `test_draft_persists_nothing` asserts `BrandKit`/`AuditLog` row counts unchanged across both the 200 and 503 outcomes; `test_draft_happy_path_mocked` additionally proves a 200 draft still leaves zero rows until a subsequent `PUT`. |
| 4b | An org with no brand kit can request an AI draft, edit every field, and nothing applies until they explicitly save it — the end-to-end user journey | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Code-read confirms `fillFrom()` (the draft handler) only calls React `setState` and never `save.mutate`; `useDraftBrandKit` invalidates nothing; zero `localStorage`/`sessionStorage` writes (grep-verified). This is the phase's headline criterion and is exactly the state-transition/persistence-absence class of claim only a passing behavioral test or a human session can certify — and the plan's own blocking checkpoint (Task 3, behaviour 6) was explicitly left unperformed ("approved for now .. I will check later" — 04-09-SUMMARY.md). See `behavior_unverified_items`. |

**Score:** 6/8 truths verified (2 present + wired, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `backend/app/controllers/org_profile_controller.py` | 7 org-scoped routes | ✓ VERIFIED | All present, all `can_manage_org_required` except the intentionally-open `GET /profile`; 100% test coverage per coverage report. |
| `backend/app/controllers/upload_controller.py` | public serve route + sniffing | ✓ VERIFIED | `sniff_image_ext`, `upload_dir`, `served_path`, public `nosniff` serve route; 100% coverage. |
| `backend/app/url_safety.py` | write+read URL safety predicate | ✓ VERIFIED | 90% coverage, 52-case vector table green. |
| `backend/app/services/org_profile_service.py` | all business logic | ✓ VERIFIED | 95% coverage; CR-01's ownership guard now present (`update_profile`, lines ~190-201). |
| `frontend/src/components/OrgLogo.tsx` | single logo renderer | ✓ VERIFIED | 9-case ladder test; consumed by both `/admin/orgs` tiles and the profile page. |
| `frontend/src/pages/OrgProfile.tsx` | the profile page | ✓ VERIFIED | Builds, gates on `manageableOrgIds`, no POR literals (grep-enforced allowlist unchanged). |
| `frontend/src/components/SocialLinksEditor.tsx` / `SocialLinksRow.tsx` | Links section | ✓ VERIFIED | 9 + 6 passing unit/render tests; live-browser-confirmed absence rule. |
| `frontend/src/components/BrandKitEditor.tsx` | Brand kit + AI draft section | ✓ VERIFIED (exists, substantive, wired) / ⚠️ interaction unverified | Builds, structurally sound (see Truths 3b/4b), only 5 pure-function unit cases — no rendered-component test. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `org_profile_bp` / `upload_bp` | `ALL_BLUEPRINTS` | import + registry entry | ✓ WIRED | `test_blueprint_registration.py` (structural walk + negative control demonstrated in 04-01). |
| `normalise_social_url` | write path AND read path | one predicate, two call sites | ✓ WIRED | `replace_social_links` (write) and `public_profile` (read filter) both call it; `test_hostile_row_never_rendered` proves the read side. |
| `brand_kit_for()` | Phase 5's campaign creator (future consumer) | in-process Python function | ✓ WIRED (seam published) | Total, 8-key-pinned, unit-tested; Phase 5 not yet built so end-to-end consumption is N/A this phase. |
| `useDraftBrandKit` | `useSaveBrandKit` | must NOT be linked | ✓ CONFIRMED ABSENT | `draft.mutate`'s `onSettled` calls only `fillFrom()` (local `setState`); `submit()` is the only caller of `save.mutate`. Code-verified; not behaviorally exercised (see 4b). |
| `PATCH /profile { logo_url }` | another organisation's stored file | ownership check | ✓ FIXED & VERIFIED | CR-01 (critical, found by code review) — cross-org `logo_url` hijack/delete. Fixed in commit `0c7d496` with a regression test (`test_logo_url_cannot_be_hijacked_from_another_organisation`); full backend suite re-run green after the fix (see below). |

### Behavioral Spot-Checks / Full-Suite Runs (performed by this verifier)

| Check | Command | Result | Status |
|---|---|---|---|
| Full backend suite (post CR-01 fix) | `cd backend && pytest -q` (with coverage gate) | exit 0, coverage 92% total, `org_profile_service.py` 95%, `org_profile_controller.py`/`upload_controller.py` 100% | ✓ PASS |
| Phase test module alone | `pytest tests/test_org_profile_brand_kit.py -q --no-cov` | exit 0 | ✓ PASS |
| Frontend typecheck + build | `cd frontend && npm run build` (`tsc -b && vite build`) | exit 0, built in 15.4s | ✓ PASS |
| Frontend unit/component suite | `cd frontend && npx vitest run` | 12 files, 92 passed, 0 failed | ✓ PASS |
| CR-01 fix diff review | `git show 0c7d496` | Ownership guard added to `update_profile`; regression test uploads to org B, hostile PATCH against org A rejected 400 `invalid_image`, org B's file survives | ✓ PASS |
| Debt-marker scan | grep `TBD\|FIXME\|XXX` over phase's core files | 0 matches | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|---|---|---|---|---|
| ORG-01 | 04-01, 04-03, 04-06, 04-07, 04-08 | Secretary/Deputy Secretary edits profile (bio, logo) + social links across all 4 org types | ✓ SATISFIED | Backend + frontend both proven; CR-01 fixed. |
| ORG-02 | 04-02, 04-06, 04-08 | Social links validated server-side against http/https + host allowlist | ✓ SATISFIED | 52-vector backend battery + 30-vector frontend `safeExternalHref` battery + live hostile-row smoke. |
| ORG-03 | 04-04, 04-09 | Secretary defines a brand kit feeding CAMPAIGN-02 | ✓ SATISFIED (backend) / ⚠️ UI interaction unverified | `brand_kit_for()` fully proven; UI save round-trip not behaviorally confirmed. |
| ORG-04 | 04-05, 04-09 | Optional AI-assist drafts a starting kit, editable, never auto-applied | ✓ SATISFIED (backend, zero-write guarantee) / ⚠️ end-to-end UI journey unverified | `draft_brand_kit` proven to write nothing on both outcomes; frontend code path structurally confirmed but not behaviorally exercised or human-verified. |

No orphaned requirements: REQUIREMENTS.md's traceability table maps only ORG-01 through ORG-04 to Phase 4, and every plan (04-01 through 04-09) declares one or more of them in its frontmatter `requirements:` field. REQUIREMENTS.md itself already flags: *"ORG-01, ORG-02, ORG-03, ORG-04 | Phase 4 | Complete (manual UAT deferred — see 04-09-SUMMARY.md)"* — independent corroboration of this verifier's finding, written by the executor before this verification ran.

### Anti-Patterns Found

No blocker-class anti-patterns (no unresolved `TBD`/`FIXME`/`XXX`, no stub returns, no placeholder copy) in the phase's core files. Per the task brief, the 04-REVIEW.md code review's 1 critical + 14 warning + 5 info findings are the authoritative anti-pattern record for this phase:

- **1 Critical (CR-01):** cross-org `logo_url` hijack — **fixed** in commit `0c7d496`, verified above.
- **14 Warnings + 5 Info:** left open by the user's explicit choice (advisory-only, not phase-blocking, per this task's brief). Noted here for traceability only, not counted as gaps: WR-05 (`GET /orgs` missing the website read-filter — mitigated client-side by `safeExternalHref`) and WR-06 (`.env.example`'s `GEMINI_MODEL=` empty string silently overriding the documented default) are the two most worth a near-term follow-up glance, since they touch the exact surfaces SC2 and SC4 care about, even though neither breaks the literal criterion today.

### Human Verification Required

See `human_verification` in the frontmatter. In priority order (matching the plan's own stated priority):

### 1. Cross-org denial is invisible, not broken (behaviour 2)

**Test:** As a Secretary of org A, open org B's profile page; separately, `curl -X PATCH` org B's `/profile` with org A's Secretary's token.
**Expected:** No Edit control, no greyed control, no padlock, no permission line, no Brand kit card in the UI; the curl gets a readable 403.
**Why human:** This is a security-boundary UI-affordance claim (absence of a control) combined with an HTTP check; backend 403 is automated-tested, but the paired UI-absence-for-a-cross-org-manager-specifically scenario (as opposed to a POR-less student, which was live-tested) was not re-confirmed at phase close.

### 2. A bad link is rejected with the form intact (behaviour 3)

**Test:** Fill several social-link rows, put `javascript:alert(1)` in Instagram, save; repeat with `https://evil.com`; then save a link with a tab inside the hostname.
**Expected:** Inline rejection under the server's sentence, only the offending field marked, every other field's typed value survives; the tab-containing link reads back normalised.
**Why human:** Already performed once by the executor via live browser automation in 04-08 and passed — re-confirmation at phase close was skipped along with the rest of the checkpoint.

### 3. Logo round-trip and the Houses grid (behaviour 4)

**Test:** Upload a PNG, hard-reload; upload an SVG; upload a >2MB file; check `/admin/orgs`.
**Expected:** PNG persists and renders after reload; SVG rejected with its specific copy; oversize file gives the size message not a stack trace; the 12-card grid reads as one grid with no visual seam between uploaded and seeded logos.
**Why human:** Visual/UX confirmation; largely covered by 04-07's live smoke (which did test a PNG round trip and the grid) but SVG-rejection-copy and the fresh 2MB boundary were not re-run at phase close.

### 4. AI button when unconfigured (behaviour 5)

**Test:** With `GEMINI_API_KEY` unset, look at the Draft with AI control.
**Expected:** Render-locked (padlock, visible sentence, hoverable/focusable, never `pointer-events-none`), never hidden, never a bare disabled control, never a red error on page load.
**Why human:** Structurally grep-verified (all the right attributes are present in the code) but never rendered and eyeballed.

### 5. AI draft is never auto-applied — the phase's headline observable (behaviour 6)

**Test:** With a key configured, press Draft, edit a field, navigate away in-app without saving, return.
**Expected:** The kit is unchanged (or still absent) with no strip and no trace.
**Why human:** This is ROADMAP criterion 4's literal observable. Backend and code-level evidence are both strong (see `behavior_unverified_items`), but no behavioral test or human session has actually exercised this exact sequence, and it is the one behaviour the deferred checkpoint most explicitly called out as still outstanding.

### 6. Four visual backstop states (320px / 768px / 1440px)

**Test:** Eyeball a ~150-char org name, a long website hostname chip, a maximal brand kit form, and the Houses grid at all three widths.
**Expected:** No clipping, no forced horizontal scroll, the grid reads as one grid.
**Why human:** Explicitly marked `verification: backstop` in the plan frontmatter — non-inferable from static code, by design.

### Gaps Summary

No FAILED truths and no blocker-class artifacts. The one genuine security defect found during code review (CR-01, cross-org logo hijack/delete) has already been fixed with a passing regression test, confirmed by re-running the full backend suite (exit 0) as part of this verification. Both the backend and frontend automated test suites are fully green, and the code review's remaining 14 warnings + 5 info findings are explicitly non-blocking by the user's own instruction.

The reason this phase is `human_needed` rather than `passed` is narrower and specific: **the phase's own blocking human-verification checkpoint (04-09 Task 3 — six manual UAT behaviours plus four visual backstops) was presented to the user and explicitly deferred** ("approved for now .. I will check later"), and the 04-09-SUMMARY.md itself is unusually candid that every human-judgment truth in that plan remains unverified. Two of those six behaviours map directly onto this phase's own ROADMAP success criteria 3 and 4 (a Secretary actually saving a brand kit through the UI, and the AI draft never auto-applying end-to-end) — both are backed by strong backend guarantees and consistent, deterministic frontend code paths on inspection, but neither has been behaviorally exercised by a test or a human. REQUIREMENTS.md's own traceability table independently corroborates this exact gap ("Complete (manual UAT deferred — see 04-09-SUMMARY.md)").

**Recommendation:** run the six-behaviour, ~20-minute manual pass 04-09-SUMMARY.md itself recommends (prioritizing behaviours 2, 3 and 6, per its own note) before treating Phase 4 as fully closed. Nothing found in this verification suggests the pass will fail — the code-level evidence for both open items is strong — but per this verifier's mandate, presence and wiring are not behavior, and this is exactly the class of claim that requires it.

---

*Verified: 2026-08-14T09:23:52Z*
*Verifier: Claude (gsd-verifier)*
