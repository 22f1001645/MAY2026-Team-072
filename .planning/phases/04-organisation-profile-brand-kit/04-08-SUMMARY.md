---
phase: 04-organisation-profile-brand-kit
plan: 08
subsystem: ui
tags: [react, typescript, tailwind, tanstack-query, security, xss, url-validation, accessibility, vitest]

# Dependency graph
requires:
  - phase: 04-organisation-profile-brand-kit
    plan: 02
    provides: "PUT /orgs/<id>/social-links (replace-all, keys `links` + `website`), the placeable rejection codes with details.platform / details.field, withheld_platforms as platform keys only, and the read-side filter that makes them withheld"
  - phase: 04-organisation-profile-brand-kit
    plan: 06
    provides: "safeExternalHref, the SocialLink / OrgProfile types, adaptOrgProfile, api.replaceSocialLinks and useReplaceSocialLinks"
  - phase: 04-organisation-profile-brand-kit
    plan: 07
    provides: "the /orgs/:orgId page, its canEdit gate, the locked section order and the Links mounting point"
provides:
  - "frontend/src/components/SocialLinksEditor.tsx — the seven-field editor, plus the exported PLATFORM_KEYS / PLATFORM_LABELS / PLATFORM_PLACEHOLDERS locked maps and the pure resolveRejection placer"
  - "frontend/src/components/SocialLinksRow.tsx — the read-side chip row, layer 3 of ORG-02"
  - "the Links card wired into OrgProfile.tsx between Profile and Brand kit, with the manager-only withheld count badge"
  - "the corrected social-links wire contract in lib/api.ts and lib/queries.ts — `links` + `website`, not `social_links`"
affects: [04-09-phase-integration]

actuals:
  tokens: 5700
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A server rejection is placed on a row by walking the envelope's `details`, in a pure exported function the component calls and a test calls directly — so where an error lands is asserted without rendering anything"
    - "A 422 keyed by payload row index is mapped through the order actually sent, never the display order, because blank rows are omitted from a replace-all payload"
    - "A component is made safe by the props it does not have: the read view has no channel through which a withheld link could arrive, so the absence rule is a property of its shape rather than of a branch"

key-files:
  created:
    - frontend/src/components/SocialLinksEditor.tsx
    - frontend/src/components/SocialLinksRow.tsx
    - frontend/src/components/__tests__/social-links-errors.test.ts
    - frontend/src/components/__tests__/social-links-row.test.tsx
  modified:
    - frontend/src/pages/OrgProfile.tsx
    - frontend/src/lib/api.ts
    - frontend/src/lib/queries.ts
    - frontend/src/lib/__tests__/request-error-body.test.ts

key-decisions:
  - "04-02's checkpoint resolved as option-a, so the website field ships. It is rendered above the six platform rows, separated by its own `Social profiles` divider label, and never appears in a platform selector"
  - "`resolveRejection` is exported as a pure function taking the envelope and the sent platform order, so the whole placement contract is unit-tested without a DOM — the part most likely to break silently is the part with no visual"
  - "`sentOrder` is threaded through a ref rather than assuming marshmallow's row index matches the display order: blank rows are omitted from the payload, so the two differ the moment one row is empty"
  - "The withheld row's `Hidden` badge and amber caption render only when the row is also empty, so a manager who retypes the URL stops being told about a problem they just fixed"
  - "The `grep -ciE 'hidden|withheld'` acceptance criterion was answered with a stronger substitute check — the spec itself mandates `aria-hidden` on the chip glyph, so the literal grep is unsatisfiable by construction"

patterns-established:
  - "A negative UI claim (a reader never learns a hidden link exists) is asserted by a grep over the read component's whole vocabulary plus a page-source check in the live browser, not by a comment"
  - "An acceptance grep that the design contract itself makes unsatisfiable is replaced by a narrower check that proves the same intent, and the substitution is recorded — the 04-07 precedent, applied again"

requirements-completed: [ORG-01, ORG-02]

coverage:
  - id: D1
    description: "Seven distinct fields save through one replace-all call: the website field rendered above and visually separated from six fixed platform rows, in the locked order Instagram, LinkedIn, X, YouTube, Facebook, GitHub"
    requirement: "ORG-01"
    verification:
      - kind: automated_ui
        ref: "live browser: the editor exposes exactly link-website plus the six platform ids in the declared order, each with its locked placeholder"
        status: pass
      - kind: unit
        ref: "cd frontend && npx tsc --noEmit && npm run build"
        status: pass
    human_judgment: false
  - id: D2
    description: "A rejection lands on the row that caused it and destroys nothing else in the form: only the offending field is marked, every other typed value and the website field survive"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "frontend/src/components/__tests__/social-links-errors.test.ts — 9 cases over resolveRejection, covering 400 details.platform, 400 details.field, the 422 payload-index walk, and the section-level fallback"
        status: pass
      - kind: automated_ui
        ref: "live browser: javascript:alert(1) typed into Instagram alongside three other filled fields → only link-instagram carries border-red-400/50, all four typed values intact, focus on link-instagram, zero section-level strips"
        status: pass
    human_judgment: false
  - id: D3
    description: "Headings come from the envelope `code`, never from string-matching the message, and the body is the server's sentence verbatim"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "social-links-errors.test.ts — social_url_scheme / social_url_host / duplicate_platform / validation_error each assert the exact heading and the verbatim body"
        status: pass
      - kind: automated_ui
        ref: "live browser: heading 'That link needs to start with http:// or https://' over the server's own 'A link must start with http:// or https://.'"
        status: pass
    human_judgment: false
  - id: D4
    description: "A link the server refuses to vouch for is simply absent from the read view — no placeholder, no count, no reserved space, and no trace in the page source"
    requirement: "ORG-02"
    verification:
      - kind: automated_ui
        ref: "live browser: javascript:alert(1) inserted straight through the ORM on `linkedin` → read view renders exactly one chip; outerHTML contains no 'javascript:alert', no 'alert(1)' and not even the word 'linkedin'"
        status: pass
      - kind: unit
        ref: "frontend/src/components/__tests__/social-links-row.test.tsx#renders one chip per vouched link plus the website, and nothing else"
        status: pass
    human_judgment: false
  - id: D5
    description: "Layer 3: every chip's href goes through safeExternalHref, so a value that is not http: or https: makes React omit the attribute and the chip renders as inert text"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "social-links-row.test.tsx#omits the href entirely for a value that is not http or https (layer 3)"
        status: pass
      - kind: unit
        ref: "frontend/src/lib/__tests__/url-safety.test.ts — 30 scheme vectors behind the helper"
        status: pass
    human_judgment: false
  - id: D6
    description: "Every chip carries target=\"_blank\" and rel=\"noopener noreferrer\", and its label is a locked platform name or a hostname, never the raw URL"
    requirement: "ORG-02"
    verification:
      - kind: unit
        ref: "social-links-row.test.tsx#carries target and both rel tokens on every chip; #labels a platform from the locked map, never by capitalising the key; #labels the website chip with its hostname, not the raw URL"
        status: pass
      - kind: automated_ui
        ref: "live browser after a successful save: chips read ekatva.example.org / Instagram / X / GitHub, each rel='noopener noreferrer' with the full URL in title"
        status: pass
    human_judgment: false
  - id: D7
    description: "A withheld link is disclosed to a manager and to no one else: an amber Hidden badge and its caption in the editor, a count badge in the section header, and nothing at all for a reader"
    requirement: "ORG-02"
    verification:
      - kind: automated_ui
        ref: "live browser: manager header reads '1 link needs attention' and the LinkedIn row shows Hidden + the amber caption with an EMPTY input; the withheld URL is absent from the DOM"
        status: pass
      - kind: automated_ui
        ref: "live browser as a POR-less student on the same URL: editButtons 0, no 'needs attention' copy, no hidden/withheld vocabulary, no trace of the hostile value, and the one vouched chip still rendered"
        status: pass
    human_judgment: false
  - id: D8
    description: "Empty states: zero renderable links means the whole Links card is absent for a reader, and 'No links yet.' plus the Edit control for a manager"
    requirement: "ORG-01"
    verification:
      - kind: automated_ui
        ref: "live browser with the org's links and website cleared — reader sees h2s ['Profile'] only; manager sees h2s ['Profile','Links'] with 'No links yet.' and the Edit control"
        status: pass
    human_judgment: false
  - id: D9
    description: "S5 long-text backstop: a 60-character hostname on the website chip wraps with the full URL in title and forces no horizontal scroll at 320px"
    requirement: "ORG-02"
    verification:
      - kind: automated_ui
        ref: "live browser at 320x800 with a 59-character hostname — label wraps inside the chip over three lines, title carries the full URL, scrollWidth 320 == clientWidth 320"
        status: pass
    human_judgment: false
  - id: D10
    description: "Save links is never pre-disabled on a client-side URL check; the only disabled expression on it is the in-flight request"
    requirement: "ORG-02"
    verification:
      - kind: other
        ref: "grep -n disabled frontend/src/components/SocialLinksEditor.tsx — two occurrences, both `disabled={saving}`; zero field-content terms"
        status: pass
      - kind: automated_ui
        ref: "live browser: Save links clicked with javascript:alert(1) in a field, request issued, server rejected"
        status: pass
    human_judgment: false

# Metrics
duration: 40min
completed: 2026-08-14
status: complete
---

# Phase 4 Plan 08: Social Links Editor and Public Link Render Summary

**Seven fields that survive their own rejection, and a read view whose safety is a property of the props it does not have — a `javascript:alert(1)` row sitting in the database produces exactly one chip, zero bytes of trace in the page source, and exactly one amber count that only its manager can see.**

## Performance

- **Duration:** 40 min
- **Completed:** 2026-08-14
- **Tasks:** 2
- **Files:** 8 (4 created, 4 modified)
- **Suite:** 72 → 87 frontend tests passing, 0 failing. `npx tsc --noEmit` clean, `npm run build` green.

## `website` — the 04-02 checkpoint outcome, again

**Included.** 04-02's Task 1 checkpoint resolved as **option-a**, so `organisations.website` is a real column and the editor ships the field. The plan's contingency ("if 04-02's checkpoint chose option-b, omit the website field entirely") does not apply and nothing was omitted.

## Accomplishments

- **`SocialLinksEditor`** — the website field with its own caption label, `Input` and hint, then a **Social profiles** divider, then all six platform rows unconditionally at `space-y-2` in the shared row shell. The `.map` over `PLATFORM_KEYS` carries no `.filter(` and no `&&` guard, so the shape never changes with content and there is no zero/one/many shift in the editor.
- **Display labels are a locked map.** `PLATFORM_LABELS` and `PLATFORM_PLACEHOLDERS` are module-level `Record<string, string>` carrying all seven rows from the Copywriting Contract. Zero `toUpperCase` and zero `charAt(0)` in the file — `x` → **X** and `github` → **GitHub** are typed out, not derived.
- **`resolveRejection` is the whole placement contract, exported and pure.** It reads the envelope's `code` and `details` and returns `{ target, heading, body }`. A 400 walks `details.platform` or `details.field`; a 422 walks marshmallow's nested `messages` down to the first actual sentence, so a raw serialised object can never be rendered. Nine unit cases pin it, including the fallback where no row resolves and the message renders once at section level with `role="alert"`, `tabIndex={-1}` and a `scrollIntoView({ block: 'center' })`.
- **`sentOrder` is the detail the plan was right to name.** Marshmallow keys a 422 by the row's index *in the payload we sent*, and blank rows are omitted from a replace-all payload — so the index and the display order diverge the moment one row is empty. The editor records the platform order of the last payload in a ref and maps through it. A test asserts a lone YouTube entry lands on YouTube and not on the fourth displayed row.
- **A rejected save keeps everything**, verified in a live browser rather than asserted: with four fields typed and `javascript:alert(1)` in Instagram, only `link-instagram` gains `border-red-400/50`, focus moves to it, all four typed values survive verbatim, and zero section-level strips render.
- **`SocialLinksRow`** — up to seven teal chips in a `flex flex-wrap gap-2` row. The website chip is labelled with its hostname via `new URL(href).hostname`, every platform chip with its locked display name, the full normalised URL rides in `title`, and a 14px `aria-hidden` glyph follows the label.
- **The absence rule is structural, not conditional.** The component takes `links` and `website` and nothing else — there is no prop through which a withheld link could arrive, so "not shown-and-disabled, not greyed, not counted, reserving no space" is a consequence of the component's shape rather than of a branch someone could later add an `else` to.
- **Layer 3 on every chip.** `href={safeExternalHref(url)}` is the file's only `href={`, and a test asserts that a `javascript:` value produces an anchor with **no href attribute at all** — React 18.3.1 renders that attribute if you hand it one, so React is not the boundary.
- **The Links card wired into `OrgProfile.tsx`** between Profile and Brand kit, with the amber **{n} link needs attention** badge guarded on `canEdit && needsAttention > 0`, `addToast('Links saved', 'success')` on success, and `qc.setQueryData(['orgProfile', orgId], data)` so the read view re-renders from the server's own response and never from form state.

## Task Commits

1. **Task 1: `SocialLinksEditor` — the website field, six fixed rows, and placeable rejections** — `0fd7bba`
2. **Task 2: `SocialLinksRow` — the read view, the absence rule, and the Links card** — `331343e`

## Files Created/Modified

- `frontend/src/components/SocialLinksEditor.tsx` (new) — the seven-field form, the two locked maps, the `ERROR_HEADINGS` code map with its fallback helper, `resolveRejection`, and the withheld-row disclosure.
- `frontend/src/components/SocialLinksRow.tsx` (new) — the chip row, `hostLabel`, and the single `Chip` renderer.
- `frontend/src/components/__tests__/social-links-errors.test.ts` (new) — 9 cases over `resolveRejection`.
- `frontend/src/components/__tests__/social-links-row.test.tsx` (new) — 6 render cases: the absence rule, the locked label, the hostname label, both `rel` tokens, the omitted href, and the empty case.
- `frontend/src/pages/OrgProfile.tsx` — the Links card, `submitLinks`, `startLinks` / `cancelLinks`, the withheld count badge, and `blockedFor(section)` generalised from the single-section `blockedBy`.
- `frontend/src/lib/api.ts`, `frontend/src/lib/queries.ts`, `frontend/src/lib/__tests__/request-error-body.test.ts` — the wire-contract fix (deviation 1).

## Decisions Made

- **`resolveRejection` is exported and pure.** The single most important rule on this surface — a rejection lands on its own row and destroys nothing else — has no visual signature when it breaks: the form still looks right, the error just sits in the wrong place. Extracting the decision into a function that takes the envelope and the sent order, and calling it from both the component and the test, is what makes that rule assertable at all.
- **`sentOrder` lives in a ref, not in state.** It is written at submit time and read at render time, and it must not cause a render of its own — a `useState` here would re-render the form on every save for a value nothing displays.
- **The withheld disclosure is gated on `flagged.has(key) && !values[key]`.** A manager who retypes the URL should stop being told about a problem while they are in the middle of fixing it; the amber caption asks them to enter it again, so it must disappear the moment they do.
- **`hostLabel` falls back to the label map rather than to the raw URL.** Parsing is safe because the value already passed the server's read filter, but if it somehow did not, the fallback keeps the promise that a chip's label is never a full URL.
- **The chip still renders when `safeExternalHref` refuses.** S5 says so explicitly ("the chip renders as inert text"), so the refusal is visible as a non-navigable label rather than as a silently missing row. That is the spec's choice, not a leniency: an unexplained gap is what the absence rule reserves for links the *server* refused, and conflating the two would make a client-side refusal look like a server one.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The social-links request body used a key the endpoint rejects, and had no way to send `website`**

- **Found during:** Task 2 (wiring `submitLinks` through `useReplaceSocialLinks`)
- **Issue:** `api.replaceSocialLinks` was typed and serialised as `{ social_links: [...] }`. `SocialLinksReplaceSchema` names the field `links`, and marshmallow's default `unknown=RAISE` turns any other key into a 422 — so **every save would have failed**, with a schema error the editor could not place on a row. The same signature had no `website` key at all, so the website field the whole surface is built around could never have reached the server.
- **Fix:** `replaceSocialLinks` and `useReplaceSocialLinks` now take `{ links, website? }`, matching the schema. The docblock records that `website` is absent-means-unchanged server-side, that the editor owns the field and always sends it, and that a blank string clears it.
- **Files modified:** `frontend/src/lib/api.ts`, `frontend/src/lib/queries.ts`, `frontend/src/lib/__tests__/request-error-body.test.ts` (its fixture payload used the old key)
- **Verification:** `npx tsc --noEmit` clean, 87 tests passing, and a live round trip: a rejected save returned `400 social_url_scheme` with `details.platform`, and a corrected save returned 200 with the website and three links normalised and rendered.
- **Committed in:** `331343e` (Task 2)

**2. [Rule 2 - Missing coverage] Added a render test for the read view**

- **Found during:** Task 2
- **Issue:** Task 2's acceptance criteria are entirely greps plus one manual step. A grep proves a string is present; it cannot prove React actually omitted the `href`, that the label is the hostname rather than the URL, or that nothing renders when there is nothing to render — and all three are one careless edit away from being wrong with no visual signature.
- **Fix:** `frontend/src/components/__tests__/social-links-row.test.tsx`, 6 cases, no fixtures, using the `@testing-library/react` setup the repo already has.
- **Files modified:** `frontend/src/components/__tests__/social-links-row.test.tsx` (new)
- **Verification:** 6 passing.
- **Committed in:** `331343e` (Task 2)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 missing coverage)
**Impact on plan:** No scope creep. Every artifact, symbol and acceptance criterion in the plan is delivered; deviation 1 was required for the surface to function at all.

### Acceptance criteria: one literal-vs-intent note

**`grep -ciE "hidden|withheld" frontend/src/components/SocialLinksRow.tsx` returns `0` is unsatisfiable by construction.** The same UI-SPEC section that states the absence rule (S5) also *mandates* `aria-hidden` on the chip's external-link glyph, and the Accessibility Contract repeats it. A case-insensitive grep for `hidden` therefore matches the one attribute the spec requires. The criterion is a proxy for "the read view carries no withheld-link vocabulary", so the intent was verified directly and more precisely:

| Check | Result |
|---|---|
| `grep -ciE 'withheld'` | **0** |
| every `*hidden` token that is not exactly `aria-hidden` | **0** |
| `grep -cE '\bHidden\b'` (the badge word) | **0** |
| `grep -ciE 'attention\|link hidden\|[0-9]+ link'` | **0** |
| live page source as a reader, hostile row present | no `javascript:alert`, no `alert(1)`, not even the word `linkedin` |

This is the same substitution 04-07 recorded for its own unsatisfiable grep: answer the intent with a stronger check, never weaken the change to satisfy the proxy.

## Manual verification (backend on :5000, dev server on :5173, headless Chromium)

A hostile row was inserted **straight through the ORM**, bypassing the write gate entirely, alongside one legitimate link:

```
instagram  https://instagram.com/ekatva
linkedin   javascript:alert(1)
```

| Check | Result |
|---|---|
| `GET /orgs/{id}/profile` | `social_links` carries instagram only · `withheld_platforms: ['linkedin']` · the string `javascript` appears nowhere in the response body |
| Manager read view | Exactly **one** chip: `Instagram`, `href=https://instagram.com/ekatva`, `rel="noopener noreferrer"`, full URL in `title` |
| Manager page source | `javascript:alert` **false** · `alert(1)` **false** · the word `linkedin` **false** |
| Manager section header | `Links · 1 link needs attention · Edit` |
| POR-less student, same URL | one chip, `editButtons: 0`, no `needs attention` copy, no `hidden`/`withheld` vocabulary, no trace of the hostile value, **no gap where the withheld link was** |
| Editor, seven fields | `link-website` first, then instagram · linkedin · x · youtube · facebook · github in the locked order, each with its locked placeholder |
| Withheld row in the editor | `LinkedIn · Hidden · This link was saved earlier but is no longer safe to show. Enter it again to restore it.` with an **empty** input; the withheld URL is absent from the DOM |
| **Rejection placement** — `javascript:alert(1)` in Instagram, with website / X / GitHub also filled | only `link-instagram` carries `border-red-400/50`; heading **That link needs to start with http:// or https://**, body **A link must start with http:// or https://.** verbatim; `document.activeElement` is `link-instagram`; **0** section-level strips; **all four typed values intact**; still in edit mode |
| Corrected save | 200 → four chips: `ekatva.example.org` (hostname, not the URL) · `Instagram` · `X` · `GitHub`, all with both `rel` tokens; `Links saved` toast; edit mode left; read view re-rendered from the server's response |
| Empty — reader | Links and website cleared → the reader's page renders `h2`s `['Profile']` only. **The whole card is absent.** |
| Empty — manager | Same data → `['Profile','Links']` with **No links yet.** and the Edit control |
| S5 long-text backstop at 320px | A 59-character hostname wraps across three lines inside the chip, full URL in `title`, `scrollWidth` 320 == `clientWidth` 320 — no horizontal scroll |

Every write made during the smoke was reverted afterwards; the seeded database is back as it was and `git status` shows no leftover.

## Issues Encountered

- **A hard page reload bounces to `/login`.** This is the Phase 2 refresh-rotation bug already logged by 04-07 (`POST /auth/refresh` 500s on a replayed token) and is unrelated to this plan. It cost two invalid readings during the smoke, both re-run through in-app navigation, which works. Nothing in Phase 4 touches refresh rotation.
- Nothing else. The plan's line references and the 04-02 rejection contract were accurate; `details.platform` and `details.field` arrived exactly as documented.

## Known Stubs

None. No placeholder values, no empty branches, no TODO left behind.

## Deferred Issues

1. **The `beforeunload` guard does not cover an unsaved links edit.** `OrgProfile.tsx`'s `dirty` flag is `editing === 'profile' && bio !== org.bio`; the links editor owns its own field state, so the page cannot see it. UI-SPEC's global dirty-state rule wants one page-owned listener covering any dirty section, which means lifting the editor's state or having it report dirtiness upward — a change to a surface 04-09 also touches. Not in this plan's `must_haves`, and deliberately not smuggled in.
2. Carried forward and still open: the shared `Dialog` primitive does not trap focus (04-07), and `POST /auth/refresh` 500s on a replayed token (Phase 2).

## Threat Flags

None. Every surface this plan adds sits inside the plan's own register and each carries its mitigation and its evidence:

| Threat | Discharged by |
|---|---|
| T-04-53 stored URL in an `href` | `safeExternalHref` on the file's only `href={`; the omitted-attribute case is a passing test |
| T-04-54 withheld URL reaching the DOM | `withheld_platforms` is keys only; the withheld row renders an empty input; page-source check found no trace |
| T-04-55 disclosing a hidden link to a reader | the count badge is guarded on `canEdit`; a POR-less student sees no badge, no gap and no vocabulary |
| T-04-56 reverse tabnabbing | `target="_blank" rel="noopener noreferrer"` on every chip, asserted per-chip in a test |
| T-04-57 client re-validating URLs | Save's only `disabled` expression is `saving`; zero field-content terms |
| T-04-58 user believing a value saved that did not | the read view re-renders from `qc.setQueryData` over the server's response |

## User Setup Required

None for this plan. 04-02's `flask db upgrade` still applies to anyone who has not run it.

## Next Phase Readiness

Ready. What 04-09 inherits:

- **The Links section is complete and wired**; the Brand kit mounting point is still the only commented placeholder in `OrgProfile.tsx`.
- **`PLATFORM_LABELS` is exported from `SocialLinksEditor.tsx`** and is already consumed by `SocialLinksRow.tsx`. If a third consumer appears, move it to a shared module then — two call sites do not justify a new file.
- **`resolveRejection`'s 422 walk is reusable in shape** for S6's indexed-palette rejection: same envelope, same `firstMessage` recursion, but keyed by palette index instead of platform. It is deliberately not generalised yet — one caller, one shape.
- **The `beforeunload` gap in deferred issue 1 is worth closing in 04-09**, since the brand-kit editor adds a third section with the same problem and S7-N makes the listener a named contract.

No blockers.

## Self-Check: PASSED

- Created files present on disk: `frontend/src/components/SocialLinksEditor.tsx`, `frontend/src/components/SocialLinksRow.tsx`, `frontend/src/components/__tests__/social-links-errors.test.ts`, `frontend/src/components/__tests__/social-links-row.test.tsx`.
- Commits present in `git log`: `0fd7bba`, `331343e`.
- `cd frontend && npx tsc --noEmit` — clean (exit 0).
- `cd frontend && npx vitest run` — 11 files, 87 passed, 0 failed.
- `cd frontend && npm run build` — built in 15.11s (exit 0).

---
*Phase: 04-organisation-profile-brand-kit*
*Completed: 2026-08-14*
