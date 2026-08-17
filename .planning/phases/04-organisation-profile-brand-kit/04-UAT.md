---
status: testing
phase: 04-organisation-profile-brand-kit
source: [04-VERIFICATION.md]
started: 2026-08-14T09:30:00Z
updated: 2026-08-14T09:30:00Z
---

## Current Test

number: 1
name: All four org types editable, same layout
expected: |
  House, society, region and council each save a bio through the same page shape — no per-type branch beyond the type badge.
awaiting: user response

## Tests

### 1. All four org types editable, same layout
expected: House, society, region and council each save a bio through the same page shape — no per-type branch beyond the type badge.
result: [pending]

### 2. Cross-org denial is invisible, not broken
expected: As a Secretary of org A viewing org B's profile — no Edit control, no greyed control, no padlock, no permission line, no Brand kit card. Separately, a curl PATCH against org B using org A's Secretary token returns a readable 403.
result: [pending]

### 3. A bad link is rejected with the form intact
expected: Entering `javascript:alert(1)` or `https://evil.com` in a social link row and saving is rejected inline under the server's sentence, only that field marked, every other typed field survives. A link with a tab inside the hostname reads back normalised after saving.
result: [pending]

### 4. Logo round-trip and the Houses grid
expected: A PNG upload persists and renders after a hard reload; an SVG upload is rejected with its specific message; a file over the size cap gives the size-limit message, not a stack trace; `/admin/orgs` shows the 12-card grid with no visual seam between uploaded and seeded logos.
result: [pending]

### 5. AI draft button when unconfigured
expected: With `GEMINI_API_KEY` unset, "Draft with AI" is render-locked — a padlock and a visible explanatory sentence, hoverable/focusable, never `pointer-events-none`, never hidden, never a bare disabled control.
result: [pending]

### 6. AI draft is never auto-applied
expected: With a key configured, press Draft, edit a field, navigate to another page in-app without saving, then return — the saved kit (or absence of one) is unchanged, with no trace of the draft.
result: [pending]

### 7. Four visual backstop states (320px / 768px / 1440px)
expected: A ~150-character org name, a long website hostname chip, a maximal brand-kit form, and the Houses grid all render with no clipping and no forced horizontal scroll at any of the three widths; the grid reads as one grid.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
