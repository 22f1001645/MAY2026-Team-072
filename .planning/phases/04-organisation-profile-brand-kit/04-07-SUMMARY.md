---
phase: 04-organisation-profile-brand-kit
plan: 07
subsystem: frontend
tags: [react, typescript, tailwind, tanstack-query, file-upload, rbac, accessibility, vitest]

# Dependency graph
requires:
  - phase: 04-organisation-profile-brand-kit
    plan: 06
    provides: "adaptOrgProfile with absoluteUploadUrl, api.orgProfile/updateOrgProfile/uploadOrgLogo, useOrgProfile/useUpdateOrgProfile/useUploadOrgLogo/useCapabilities, safeExternalHref, the guarded non-JSON error parse"
  - phase: 04-organisation-profile-brand-kit
    plan: 03
    provides: "the multipart logo endpoint and its magic-byte sniff"
  - phase: 04-organisation-profile-brand-kit
    plan: 01
    provides: "GET/PATCH /orgs/<id>/profile and the bio bound"
  - phase: 02-session-and-capabilities
    provides: "capabilities.manageableOrgIds, the AppShell redirect, NAV, the Interaction State contract"
provides:
  - "Textarea primitive in frontend/src/components/ui.tsx"
  - "OrgLogo in frontend/src/components/OrgLogo.tsx — the single logo renderer, plus the exported resolveRung / initialsOf helpers"
  - "frontend/src/pages/OrgProfile.tsx — the /orgs/:orgId page, its gating and the Profile section"
  - "the protected /orgs/:orgId route in App.tsx"
  - "the data-derived Organisation profile nav entry in Layout.tsx"
  - "the Open organisation profile entry point in the /admin/orgs house detail modal"
  - "HOUSE_META exported from pages/Orgs.tsx as fallback data, read by exactly one component"
affects: [04-08-social-links, 04-09-phase-integration]

actuals:
  tokens: 8900
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A fallback ladder is one ordered resolver plus a `from` floor, so the renderer and the copy that must name the next rung ask the same function rather than each other"
    - "Reset derived child state during render against an identity string, not in an effect, when a stale frame would be visible as a wrong image"
    - "A capability gates what renders and the query that would 403; the request is never issued rather than issued and swallowed"
    - "An acceptance grep that cannot be satisfied is answered with a stronger substitute check, not a weaker change"

key-files:
  created:
    - frontend/src/components/OrgLogo.tsx
    - frontend/src/pages/OrgProfile.tsx
    - frontend/src/components/__tests__/org-logo-ladder.test.ts
  modified:
    - frontend/src/components/ui.tsx
    - frontend/src/App.tsx
    - frontend/src/components/Layout.tsx
    - frontend/src/pages/Orgs.tsx

key-decisions:
  - "HOUSE_META stays defined in pages/Orgs.tsx and is exported, rather than moving to a shared module: both of the plan's greps require the twelve entries to remain literally in that file, and `export` is a one-word diff against a file move that would have rewritten two call sites for no behavioural gain"
  - "The Profile card renders its own 80px tile only in edit mode; in read mode the identity header's tile is the only one, because two identical 80px tiles stacked on a read-only page is duplication the spec did not ask for"
  - "The Links and Brand kit cards are declared as commented mounting points rather than empty rendered cards — an empty Links card shipped now would be a visible stub, and the `editing` union already declares all three sections"
  - "The nav entry is appended for any role with at least one manageable organisation, not only the organiser view: /orgs/:orgId is not in ViewSwitcher's ORGANISER_ROUTES, so an organiser-only entry would vanish from the sidebar while the user was standing on the page"
  - "Esc-to-close and initial focus on Cancel are handled locally in OrgProfile.tsx; the focus trap belongs in the shared Dialog primitive and would change eight existing call sites, so it is deferred rather than smuggled in"
  - "The error strip uses `p-4` instead of the inherited `px-4 py-3`, because this phase forbids 12px and `py-3` is 12px"

patterns-established:
  - "Cross-org denial is verified by asserting the absence of every affordance at once — edit controls, aria-disabled nodes, disabled controls, file inputs, the switcher and permission vocabulary all counted to zero in one page-level probe"
  - "A monogram is built from letter/digit runs, never from a whitespace split, because organisation names carry brackets and ampersands"

requirements-completed: [ORG-01]

status: complete
---

# Phase 4 Plan 07: Organisation Profile Page, Gating and the Logo Ladder Summary

The `/orgs/:orgId` page ships with per-section editing gated on `manageableOrgIds`, a logo upload
that previews optimistically and discards the preview whenever the server refuses the file, and a
single `OrgLogo` renderer that every logo in the app — including both `/admin/orgs` tiles — now
resolves through.

## What was built

**`Textarea` (`components/ui.tsx`).** The `ProposalNew.tsx` class string lifted verbatim plus the
two global focus-visible utilities. The four existing hand-rolled call sites were deliberately not
migrated, exactly as Phase 2 scoped the `Select` lift; `git diff --stat` on `ManageEvent.tsx` and
`ApprovalQueue.tsx` is empty.

**`OrgLogo` (`components/OrgLogo.tsx`).** One component owning the whole ladder: uploaded
`logoUrl` → the seeded `HOUSE_META` image → the emoji glyph → an initials monogram. Rungs 2 and 3
are eligible only for `type === 'house'` on an exact name match. Each `<img>` rung carries an
`onError` that advances the floor by one, so a broken-image glyph is never a state of the
component. The tint follows the rung that actually rendered — neutral for an upload or a monogram,
the existing `${color}18` / `${color}20 + 1px solid ${color}40` for the seeded marks. Two pure
helpers are exported alongside it: `resolveRung(org, from)`, whose `from` floor lets the remove
dialog ask what rung 2 would produce instead of guessing, and `initialsOf`.

**`OrgProfile` (`pages/OrgProfile.tsx`).** Identity header, then the locked `Profile → Links →
Brand kit` column. `org.type` is read in exactly one place on this page (the type badge); the
second read the truths allow lives inside `OrgLogo`. `canEdit` is computed once as
`manageableOrgIds.includes(orgId)` and passed down — never a role, never an org name, never a POR
string, and never sent to the API. The logo control is a styled `<label>` wrapping a
visually-hidden `<input type="file">`, so the focusable thing is a real input and the label carries
the ring. The upload fires on file choose behind an object URL at `opacity-60` with `aria-busy`,
and the preview is revoked and dropped in `onSettled` either way. `Save changes` is never
pre-disabled on a client-side field check; the only `disabled` expressions on it are the in-flight
`isPending` and the mid-edit capability loss.

**Route and entry points.** `/orgs/:orgId` sits inside `AppShell`'s `<Routes>` above the catch-all,
so an unauthenticated visitor is bounced to `/login` for free. `Layout.tsx` gains the file's first
data-derived nav entry, and the `/admin/orgs` house detail modal gains **Open organisation
profile**.

**`/admin/orgs` reconciliation.** Both tiles now render `<OrgLogo />`. `HOUSE_META` was not deleted
(P-04): all twelve entries and all four keys survive, `grep -c "House'"` is still 12, and
`meta.imageLogo` no longer appears anywhere. The one pre-existing external link resolves
`org.website` first and the seeded entry second, both through `safeExternalHref()`, and its `rel`
became `noopener noreferrer`.

## Verification

`npx tsc --noEmit`, `npx vitest run` (9 files, 72 tests) and `npm run build` are all clean.
`no-por-literals.test.ts` passes with its allowlist unchanged, and `OrgProfile.tsx` was not added
to it.

Every grep in the three acceptance blocks passes except one, treated below as a deviation.

### Manual smoke (backend on :5000, dev server on :5173, headless Chromium)

| Check | Result |
|---|---|
| POR holder loads `/orgs/{region id}` | Renders: eyebrow **Organisation**, gold title, **Region** + city badges, org switcher (2 manageable orgs), Profile card with **Edit** |
| Bio saves | Typed, saved, toast fired; `GET /orgs/{id}/profile` returns the stored bio |
| PNG uploads | Tile becomes `http://localhost:5000/api/v1/uploads/<uuid>.png`, label swaps to **Replace logo**, remove control appears |
| Logo survives navigation and a fresh cold-load session | Yes, both |
| Second org type (a House) via the switcher and the modal button | Same page shape, no per-type difference |
| POR-less student on the same URL | `editButtons: 0, ariaDisabled: 0, disabledControls: 0, fileInputs: 0, switcher: 0, permissionWords: false, logoImg: true, h1: 1, h2: 1` |
| `/admin/orgs` grid, 12 Houses, one uploaded | Eleven seeded marks at their original tint (`rgba(74,222,128,0.094)` = `${color}18`), Nilgiri's upload on `rgba(255,255,255,0.04)`. Nothing announces which is which |
| House detail modal | Seeded image at `${color}20` with the `${color}40` border, website `https://kaziranga.iitmbs.org/` with `rel="noopener noreferrer"`, **Open organisation profile** present and navigating |

Smoke-test writes (two bios, two logos) were reverted afterwards, so the seeded database is back as
it was.

## Deviations from Plan

### 1. [Plan defect] One acceptance grep in Task 3 is unsatisfiable; a stronger check replaced it

**Found during:** Task 3.

**Criterion:** `git diff -U0 frontend/src/pages/Orgs.tsx | grep -cE "^[-+].*(gap-|space-y-|p-[0-9]|m[btlrxy]?-[0-9])"` returns `0`.

**Why it cannot pass:** the plan also requires changing `href={meta.website}` → `safeExternalHref(...)`
and `rel="noreferrer"` → `rel="noopener noreferrer"`. Both attributes sit on the same physical JSX
line as that anchor's `className`, which contains `ml-2` and `gap-1.5`. Any edit to the `href` or
the `rel` therefore marks a line containing a spacing token, whether the attributes stay inline or
are split across lines — the removed line still matches. The grep is a proxy for S8's actual rule,
**"No spacing value in `Orgs.tsx` changes"**, and the proxy breaks on a line that mixes an
attribute with a class list.

**What was done instead:** the intent was verified directly and more strongly, by comparing the
multiset of every spacing token in the file before and after:

```
git show HEAD:Orgs.tsx | grep -oE '(gap-[0-9.]+|space-[xy]-[0-9.]+|p[trblxy]?-[0-9.]+|m[trblxy]?-[0-9.]+)' | sort | uniq -c
```

Before and after are **byte-identical** — same tokens, same counts. No spacing value changed and no
spacing class was added or removed. The two flagged diff lines are the same anchor, differing only
in `href` and `rel`; its `className` is untouched.

**Commit:** 8a16ef9

### 2. [Rule 1 - Bug] The monogram rendered punctuation as an initial

**Found during:** Task 2's manual smoke.

**Issue:** `initialsOf` split the name on whitespace and took each word's first character.
`"Hyderabad (AP & Telangana)"` splits into `Hyderabad` and `(AP`, so the 80px tile rendered **`H(`**
— which reads as a rendering fault, not a mark. It would have hit every region organisation, since
all ten seeded region names carry a parenthesised suffix.

**Fix:** take runs of letters and digits (`/[\p{L}\p{N}]+/gu`) instead of whitespace-delimited
words. That name now yields `HA`. A single-word name still yields one character, and an
all-punctuation name yields an empty monogram rather than garbage.

**Files modified:** `frontend/src/components/OrgLogo.tsx`

**Commit:** 6cfcda1

### 3. [Rule 2 - Missing coverage] Added a test for the ladder and the monogram

The ladder's order *is* the contract, and both it and `initialsOf` are pure. A reordering is
invisible in review and would show as the wrong logo on twelve seeded Houses, so
`src/components/__tests__/org-logo-ladder.test.ts` pins the four rungs, house-type eligibility, the
"every organisation reaches a rung" guarantee, and the four monogram edge cases including the `H(`
regression. Nine tests, no fixtures. Committed with the fix (6cfcda1).

## Interpretations recorded

- **"Declared, empty mounting points" for Links and Brand kit** were read as code-level mounting
  points: commented placeholders in the locked section order, with `'links'` and `'brandkit'`
  already members of the `editing` union. Rendering two empty cards would have shipped a visible
  stub to users this plan cannot fill.
- **The Profile card's tile renders in edit mode only.** In read mode the identity header's 80px
  tile is the page's only one. The plan's wording is "the 80px `OrgLogo` with the upload control
  beneath it in edit mode"; two identical 80px tiles on a read-only page is duplication.
- **`org.website` exists.** 04-02's checkpoint resolved as option-a, so the `HOUSE_META`-only
  fallback path the plan described as a contingency was not needed.

## Known Stubs

None in this plan's output. The Links and Brand kit sections are absent rather than stubbed — no
empty card, no heading over nothing — and 04-08 and 04-09 mount them.

## Deferred Issues

Logged to `deferred-items.md`, not fixed here (out of this plan's scope):

1. **`POST /api/v1/auth/refresh` returns 500 on a replayed refresh token** —
   `UNIQUE constraint failed: refresh_token_blocklist.jti`. Pre-existing Phase 2 behaviour.
   Consequence seen throughout this smoke: a hard reload of any authed page bounces to `/login`
   instead of restoring the session. Nothing in Phase 4 touches refresh rotation. In-app navigation
   and cold-load sign-in both work, so it did not block verification.
2. **The shared `Dialog` primitive does not trap focus or restore it to the trigger.** 04-07 added
   `Esc` and initial focus on `Cancel` locally; the trap belongs in `components/ui.tsx` and would
   change all eight existing call sites.

## Threat Flags

None. No new network endpoint, auth path, file-access pattern or schema change was introduced —
this plan consumes 04-01/04-03's endpoints through 04-06's client. T-04-46 through T-04-52 are all
discharged as planned: `canEdit` is grep-asserted free of POR literals and `role === 'admin'`, the
non-manager's affordance count is zero, every URL including the seeded ones goes through
`safeExternalHref`, `rel="noopener noreferrer"` is on the one external link, client size/type
rejections send no request, the preview is discarded on failure, and `onError` advances the ladder
rather than exposing a broken-image glyph.

## Self-Check: PASSED

All three created files exist on disk and all four commits (`11adbb3`, `12ed8ca`, `6cfcda1`,
`8a16ef9`) are present in the log.
