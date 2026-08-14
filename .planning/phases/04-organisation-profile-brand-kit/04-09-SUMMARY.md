---
phase: 04-organisation-profile-brand-kit
plan: 09
subsystem: ui
tags: [react, typescript, tailwind, tanstack-query, ai, accessibility, vitest]

# Dependency graph
requires:
  - phase: 04-organisation-profile-brand-kit
    plan: 04
    provides: "GET/PUT /orgs/<id>/brand-kit, the has_kit / ai_available / source response fields, and BrandKitSchema's six-digit-hex palette rule"
  - phase: 04-organisation-profile-brand-kit
    plan: 05
    provides: "POST /orgs/<id>/brand-kit/draft and the ai_unavailable / ai_failed error codes behind the availability flag"
  - phase: 04-organisation-profile-brand-kit
    plan: 06
    provides: "the BrandKit type, adaptBrandKit, useBrandKit(orgId, enabled), useSaveBrandKit and useDraftBrandKit (which invalidates nothing on success)"
  - phase: 04-organisation-profile-brand-kit
    plan: 08
    provides: "the SocialLinksEditor row shell, the caption-label string and the marshmallow message walker, all reused verbatim here"
provides:
  - "frontend/src/components/BrandKitEditor.tsx — the whole Brand kit card (S6) and the AI draft flow (S7, states A0–A5, S7-D, S7-N)"
  - "the exported pure resolveKitRejection + SentRows placer for indexed palette/phrase rejections"
  - "the Brand kit card mounted on OrgProfile.tsx under canEdit, with the page's single beforeunload listener extended to cover a pending draft"
  - "api.saveBrandKit / useSaveBrandKit widened with the `source` provenance field"
affects: [05-ai-campaign-creator]

actuals:
  tokens: 6100
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A native `<input type=\"color\">` overlaid at opacity-0 on the swatch makes the swatch itself the picker — one control, the platform's own colour UI, zero new dependencies — with the peer written first in the DOM so the focus ring lands on the visible square"
    - "An AI draft populates the live form fields in place; there is no preview, no diff and no apply control, so the existing save button remains the only writer"
    - "A section reports its own dirtiness upward (`onDirtyChange`) so the page owns exactly one beforeunload listener rather than one per section"

key-files:
  created:
    - frontend/src/components/BrandKitEditor.tsx
    - frontend/src/components/__tests__/brand-kit-rejection.test.ts
  modified:
    - frontend/src/pages/OrgProfile.tsx
    - frontend/src/components/SocialLinksEditor.tsx
    - frontend/src/lib/api.ts
    - frontend/src/lib/queries.ts

key-decisions:
  - "The colour input is written before the swatch in the DOM because Tailwind's `peer-focus-visible` compiles to a general sibling combinator; the positioned input still paints on top, so the picker keeps a visible keyboard focus ring it would otherwise swallow (fix commit 9f4eb84)"
  - "`pickerValue()` falls back to #ffffff for a half-typed hex rather than handing it to the native input, which silently rewrites an invalid value to #000000 — the text field keeps exactly what was typed, because the text is the value"
  - "A single `<fieldset disabled={drafting} className=\"contents\">` disables the whole card during a draft instead of a `disabled` prop per field, so the Profile and Links sections stay usable and the hex field is never individually disabled"
  - "Discard is confirmed on the user's own typing (`touched`), not on the draft's existence — the model's words are not the user's work"
  - "`source` is sent on save as provenance only; the read view shows a neutral `AI draft` badge meaning someone reviewed and kept it, and it grants nothing"

requirements-completed: [ORG-03, ORG-04]

coverage:
  - id: D1
    description: "A manager can define and save voice/tone, up to six colours and up to ten phrases from the profile page; PUT /brand-kit is the only writer"
    requirement: "ORG-03"
    verification:
      - kind: unit
        ref: "cd frontend && npx vitest run — 12 files, 92 passed; npm run build green (tsc -b + vite)"
        status: pass
      - kind: manual
        ref: "checkpoint Task 3 — provisionally unblocked, not walked through"
        status: deferred
    human_judgment: true
  - id: D2
    description: "The card renders only for a manager and the query is gated on the same value, so the brand-kit request is never issued for a non-manager (P-09)"
    requirement: "ORG-03"
    verification:
      - kind: other
        ref: "OrgProfile.tsx renders <BrandKitEditor> under `canEdit &&`, and useBrandKit(orgId, canEdit) carries the same gate"
        status: pass
      - kind: manual
        ref: "checkpoint behaviour 2 (cross-org denial) — not verified"
        status: deferred
    human_judgment: true
  - id: D3
    description: "A draft populates the live fields in place — no preview, no diff, no modal, no Apply-draft control — and is never written to any client storage (P-07)"
    requirement: "ORG-04"
    verification:
      - kind: other
        ref: "grep over BrandKitEditor.tsx: 0 localStorage/sessionStorage, 0 'apply draft'/'use this draft', 1 role=\"status\", 1 bg-gold/[0.06]; useDraftBrandKit invalidates nothing"
        status: pass
      - kind: manual
        ref: "checkpoint behaviour 6 (draft never auto-applied) — ROADMAP criterion 4's observable, NOT verified"
        status: deferred
    human_judgment: true
  - id: D4
    description: "A save rejection lands on the row that caused it; blank rows are dropped from the payload and the server's index is mapped back to the display row"
    requirement: "ORG-03"
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/brand-kit-rejection.test.ts — 5 cases over resolveKitRejection, including the dropped-blank-row index remap and the unplaceable fallback"
        status: pass
    human_judgment: false
  - id: D5
    description: "A0: with AI unconfigured the Draft control is render-locked and explained — disabled + aria-disabled, padlock, a visible sentence and the same string as title, never pointer-events-none, never hidden, never a red error on load"
    requirement: "ORG-04"
    verification:
      - kind: other
        ref: "LockedControl in BrandKitEditor.tsx: disabled + aria-disabled=\"true\" + title + a visible <p>; grep pointer-events-none returns 0"
        status: pass
      - kind: manual
        ref: "checkpoint behaviour 5 (AI button when unconfigured) — not verified in a browser"
        status: deferred
    human_judgment: true
  - id: D6
    description: "Exactly one beforeunload listener, owned by the page, covering a dirty bio or a pending draft"
    requirement: "ORG-04"
    verification:
      - kind: other
        ref: "grep -c beforeunload: OrgProfile.tsx = 1, components/*.tsx = 0; BrandKitEditor reports dirtiness via onDirtyChange"
        status: pass
    human_judgment: false
  - id: D7
    description: "The four UI-SPEC visual backstop states at 320 / 768 / 1440px"
    requirement: "ORG-03"
    verification:
      - kind: manual
        ref: "checkpoint Task 3 visual backstops — none of the four eyeballed"
        status: deferred
    human_judgment: true

# Metrics
duration: 35min
completed: 2026-08-14
status: complete
---

# Phase 4 Plan 09: Brand Kit and AI Draft Flow Summary

**The brand kit ships with the AI draft filling the live form in place — one writer, no preview, no cache — but the phase's six-behaviour manual walkthrough was provisionally unblocked rather than performed, so every human-judgment truth in this plan is still unverified.**

## Performance

- **Duration:** ~35 min
- **Completed:** 2026-08-14
- **Tasks:** 3 (2 auto, 1 checkpoint)
- **Files:** 6 (2 created, 4 modified)
- **Suite:** 87 → **92 frontend tests passing**, 0 failing. `npm run build` (tsc -b + vite) green in 18.09s.

## Checkpoint outcome — read this before trusting anything visual below

Task 3 was `checkpoint:human-verify`, gate `blocking`: the six manual UAT behaviours plus the four
UI-SPEC visual backstop states. **The checkpoint was presented in full and the user's literal
response was "approved for now .. I will check later".**

That is a **provisional, deferred unblock — not a pass.** Nobody has run the six behaviours and
nobody has eyeballed the four visual states. The user chose to close the phase now and verify at
their own pace afterwards. This section exists so that decision stays traceable rather than
disappearing into a green tick.

**Not yet manually verified — the six behaviours:**

| # | Behaviour | Status |
|---|---|---|
| 1 | All four org types (house, society, region, council) editable, each saving a bio with the same layout | **not verified** |
| 2 | Cross-org denial is invisible, not broken — no Edit control, no greyed control, no padlock, no permission line, no Brand kit card for a non-manager, plus a readable **403** from `curl -X PATCH` | **not verified** (security-relevant: RBAC denial) |
| 3 | A bad link (`javascript:alert(1)`, then `https://evil.com`) is rejected with the server's reason inline, only that field marked, every other typed value intact; a tab inside a hostname reads back normalised | **not verified** (security-relevant: XSS / URL validation) |
| 4 | Logo round-trip — PNG survives a hard reload, SVG rejected with its copy, >2 MB gives the size message; `/admin/orgs` still reads as one grid | **not verified** |
| 5 | With `GEMINI_API_KEY` unset, **Draft with AI** is render-locked with a *visible* explanation — hoverable, focusable, padlock, sentence beneath — not bare-disabled, not hidden, not a red error on load | **not verified** |
| 6 | AI draft is never auto-applied — draft, edit a field, navigate away in-app without saving, return, and the kit is unchanged with no strip and no trace. **This is ROADMAP criterion 4's observable.** | **not verified** |

**Not yet manually verified — the four visual backstops (each at 320px, 768px and 1440px):**

| # | State | Status |
|---|---|---|
| B1 | A ~150-character organisation name wraps in the page title without clipping the 80px tile or forcing horizontal scroll | **not verified** |
| B2 | A long hostname on the website chip wraps or truncates with the full URL in `title` | **not verified** |
| B3 | A maximal brand kit (500-char voice/tone, ten 200-char phrases) fills the form without the card running past two viewport heights, every counter correct at its limit | **not verified** |
| B4 | The 12-card Houses grid with at least one uploaded logo reads as one grid | **not verified** |

Behaviours 2, 3 and 6 are the ones worth doing first: two are security boundaries (cross-org RBAC
denial and hostile-URL rejection) and the third is the phase's headline ROADMAP criterion. Re-running
them without the user present would not have produced a meaningful confirmation, so no verification
was attempted in their absence and no dev server was started.

**What *is* verified** is everything automatable, and it is all green: `npx vitest run` (92 passing)
and `npm run build` (tsc -b + vite) at this commit, plus the structural greps recorded per truth in
the `coverage` block above. The plan's `must_haves` that reduce to code structure — the gating, the
absent apply-control, the zero client-storage writes, the single listener — are discharged by those.
Every truth needing a pair of eyes is marked `deferred` in `coverage`, not `pass`, so
`/gsd-verify-work` will abstain on them rather than inherit a claim nobody made.

## Accomplishments

- **`BrandKitEditor` — the whole Brand kit card.** Read, empty, loading, error and edit states in
  one component. Empty is a plain **No brand kit yet.** line, deliberately not the `EmptyState`
  primitive — one of three cards on a page must not claim a full-height empty state. Loading and
  failure are scoped to this card only; Profile and Links are untouched by either.
- **The swatch *is* the picker.** A native `<input type="color">` at `opacity-0` sits over a 36px
  `border-white/20` square, with `aria-label="Pick colour {n}"`. Zero new dependencies. The
  adjacent hex `Input` is never disabled, never read-only and never removed, because a native colour
  picker is not keyboard-operable everywhere — typing is the accessible path and it always works.
  **The hex text, not the chip, is the value.**
- **No field is hard-capped and Save is never pre-disabled.** Counters render from 400/500 and
  160/200 and turn red past the limit with a **trim {n} characters** line. `grep -c maxLength`
  returns 0. A paste is never silently shortened, and the client never guesses a server rule.
- **`resolveKitRejection` is exported and pure**, taking the envelope and the display indices of the
  rows actually sent. Blank rows are dropped from the payload, so marshmallow's index and the
  display row diverge the moment one row is empty; five unit cases pin the remap, the flattened
  list-level case and the unplaceable fallback.
- **The AI draft fills the live fields in place.** No preview panel, no diff, no modal, no
  Apply-draft control (P-07). The gold strip is Phase 2's banner class string lifted verbatim — the
  phase's one and only gold surface — with `role="status"` (nothing is wrong) and a **Discard
  draft** ghost button.
- **The draft is never cached.** Zero `localStorage`, zero `sessionStorage`, and `useDraftBrandKit`
  invalidates nothing, so the saved kit is never refetched over the form. It lives in component
  state and dies with the component.
- **Every AI state has a visible explanation.** A0 render-locked with padlock + visible sentence +
  `title`, still hoverable and focusable, never `pointer-events-none`. A3 shows **Drafting…** with
  `aria-busy` (never `aria-disabled` — it is working, not unavailable), a 300ms minimum, a
  `aria-live` caption after 1200ms and a 30-second `AbortController` timeout. A5 is an inline strip
  above the control, heading chosen from `code` and never by string-matching, body the server's
  sentence verbatim, and `ai_unavailable` additionally flips the control to A0 for the session so a
  second click cannot repeat the failure.
- **One listener, owned by the page.** `BrandKitEditor` reports dirtiness upward via
  `onDirtyChange`; `OrgProfile`'s existing `dirty` became `(profile bio changed) || kitDirty`. This
  closes 04-08's deferred issue 1. `grep -c beforeunload` is 1 in the page and 0 across components.
- **The provider is never named.** Zero matches for gemini/llm/prompt in any user-facing string; the
  copy says **AI**.

## Task Commits

1. **Task 1: `BrandKitEditor` — voice/tone, palette, phrases** — `da44493`
2. **Task 2: The AI draft flow — states A0 through A5, discard, and navigation** — `0c7e16f`
   (plus `9f4eb84`, the colour-picker focus-ring fix)
3. **Task 3: [CHECKPOINT] Phase 4 manual verification** — no commit; provisionally unblocked, see above

## Files Created/Modified

- `frontend/src/components/BrandKitEditor.tsx` (new, ~870 lines) — the card, the form, the AI block,
  `resolveKitRejection`, `Counter`, `RemoveButton`, `FieldRejection`, `LockedControl`.
- `frontend/src/components/__tests__/brand-kit-rejection.test.ts` (new) — 5 cases over the placer.
- `frontend/src/pages/OrgProfile.tsx` — the Brand kit mount under `canEdit`, `kitDirty` state, and
  the widened `beforeunload` condition.
- `frontend/src/components/SocialLinksEditor.tsx` — exported `ROW_SHELL`, `CAPTION_LABEL` and
  `firstMessage` so the three lists on this page share one string rather than three copies.
- `frontend/src/lib/api.ts`, `frontend/src/lib/queries.ts` — `source: 'manual' | 'ai_draft'` on the
  save payload.

## Decisions Made

- **The colour input is written *before* the swatch in the DOM.** Tailwind's `peer-focus-visible`
  compiles to a general sibling combinator, so the peer must come first; the positioned input still
  paints above its in-flow sibling and stays clickable. Without this the `opacity-0` input swallows
  its own focus ring and the picker has no visible keyboard indicator at all. This was found and
  fixed after Task 2 (`9f4eb84`).
- **`pickerValue()` guards the native input.** A half-typed hex is not a valid value and the browser
  silently rewrites an invalid one to `#000000` — which would look like the user's colour changing
  under them. The picker falls back to the same "obviously unset" white a new row starts at while
  the text field keeps exactly what was typed.
- **One `<fieldset disabled>` with `className="contents"`**, not a `disabled` prop threaded through
  every field. The whole Brand kit card is busy during a draft and the rest of the page is not;
  `contents` keeps the layout identical.
- **Discard's threshold is `touched`, not `draftShown`.** An untouched draft discards immediately
  with no dialog — the model's words are not the user's work. Only the user's own typing earns a
  confirm.
- **`source` is provenance, not approval state.** It is sent on save and surfaces as a neutral
  **AI draft** badge meaning someone reviewed this and kept it. It grants nothing and gates nothing.

## Deviations from Plan

None. Both auto tasks were executed as written; the one follow-up commit (`9f4eb84`) is an
accessibility fix to Task 1's own output, described above, not a scope change.

Task 3's checkpoint was resolved by the user's provisional unblock rather than by the six
confirmations the plan's acceptance criteria call for. That is recorded here as an outcome, not as a
deviation to be waved through: the criteria are not met, they are **deferred**.

## Known Stubs

None in code. No placeholder values, no empty branches, no TODO.

## Deferred Issues

1. **The six manual UAT behaviours and the four visual backstops are unperformed** (see the
   checkpoint section). Worth running as a single ~20-minute pass before the phase is presented;
   behaviours 2, 3 and 6 first.
2. Carried forward and still open: the shared `Dialog` primitive does not trap focus (04-07) — this
   plan's discard dialog uses it, with `autoFocus` on Cancel, `Esc` to close and focus returned to
   the trigger, but no trap. `POST /auth/refresh` 500s on a replayed token (Phase 2), which makes a
   hard reload bounce to `/login`.
3. The vite bundle is now 1.30 MB (371 kB gzip) and past the 500 kB warning. Pre-existing and
   unrelated to this plan; no code-splitting attempted here.

## Threat Flags

None new. The plan's register is discharged as follows, with the manual half of two of them still
outstanding:

| Threat | Discharged by |
|---|---|
| T-04-59 AI content persisted without review | No Apply-draft control; `PUT /brand-kit` is the only writer; grep-asserted. **Manual step 6 still outstanding.** |
| T-04-60 draft surviving a reload | Zero client storage, no persisted query key, `useDraftBrandKit` invalidates nothing; grep-asserted |
| T-04-61 brand kit shown to a non-manager | Card renders under `canEdit`; `useBrandKit(orgId, canEdit)` carries the same gate, so no request and no 403. **Manual step 2 still outstanding.** |
| T-04-62 provider identity leaking into copy | Zero gemini/llm/prompt matches in user-facing strings; failure bodies are the server's own sentence |
| T-04-63 palette bypassing the hex rule via the AI path | Server revalidates through `BrandKitSchema`; the client lowercases on blur and places the 422 per row |
| T-04-64 hung provider call freezing the surface | 30-second `AbortController` routed to A5; only the Brand kit card disables during flight |
| T-04-65 unsaved work lost without warning | The strip discloses before the loss; one page-owned `beforeunload`; an edited draft's discard is confirmed |

## User Setup Required

`GEMINI_API_KEY` in `backend/.env` (see `backend/.env.example`) to exercise the AI draft path. With
it unset the surface is fully usable and the control is render-locked with its explanation — which
is itself checkpoint behaviour 5, still to be confirmed.

## Next Phase Readiness

Phase 4 is code-complete. What Phase 5 inherits:

- **`brand_kit_for()` (04-04) is the campaign creator's read seam**, with its default-on-absence
  behaviour already settled, so the generator needs no absence branch.
- **The palette is six-digit hex only**, enforced server-side, because Phase 5 interpolates those
  values into a CSS context in generated mail. Do not relax it client-side.
- **`source: 'ai_draft'` is provenance and grants nothing** — Phase 5 must not read it as approval.
- **The outstanding manual UAT is the one thing between this phase and a clean sign-off.** It is
  listed in full above so it can be picked up cold.

## Self-Check: PASSED

- Created files present on disk: `frontend/src/components/BrandKitEditor.tsx`,
  `frontend/src/components/__tests__/brand-kit-rejection.test.ts`.
- Commits present in `git log`: `da44493`, `0c7e16f`, `9f4eb84`.
- `cd frontend && npx vitest run` — 12 files, **92 passed**, 0 failed.
- `cd frontend && npm run build` — built in 18.09s, exit 0 (includes `tsc -b`).
- No dev server was started during this continuation, as instructed.

---
*Phase: 04-organisation-profile-brand-kit*
*Completed: 2026-08-14*
