---
phase: 05-post-acceptance-pipeline-design-campaign-live-workspace
plan: 07
subsystem: frontend/campaign
tags: [CAMPAIGN-04, CAMPAIGN-05, OD-3, D-11, D-12, public-surface, clipboard]
status: complete

requires:
  - 05-02 (campaign singleton, slug minting, form-field CRUD, by_slug_or_id resolution, anonymous preview payload)
  - 05-06 (ScheduleRow blur-save/revert mechanics, the shape FormFieldRow mirrors)
  - 05-01 (assert_editable — the server control behind the disabled affordances)
provides:
  - frontend FormFieldRow (inline custom registration fields)
  - frontend RegistrationLinkCard (copy the server's registration_url)
  - "isPublicEventPath — the one anonymously renderable client path"
  - "api.campaign / api.generateSlug / api.formFields CRUD + their hooks"
  - "registration_url and form_field_types on the GET /campaign payload"
affects:
  - 05-08 (PipelineStepper + PushLiveGate read the same useCampaign query this plan introduced)
  - 05-10/05-11 (poster + mail editors mount into the CampaignBuilder sections beside Registration)

tech-stack:
  added: []
  patterns:
    - "Server-owned URL shape: the browser copies registration_url verbatim and never assembles it (D-12)"
    - "An anonymously renderable path is an anchored single-segment regex, asserted from both sides"
    - "A session-only query is gated on the session, because a 401 is read as expiry and redirects"
    - "A rejected clipboard write is a user-visible outcome, not a swallowed promise"

key-files:
  created:
    - frontend/src/components/FormFieldRow.tsx
    - frontend/src/components/RegistrationLinkCard.tsx
    - frontend/src/components/__tests__/FormFieldRow.test.tsx
    - frontend/src/components/__tests__/RegistrationLinkCard.test.tsx
    - frontend/src/__tests__/public-event-path.test.ts
  modified:
    - frontend/src/App.tsx
    - frontend/src/pages/CampaignBuilder.tsx
    - frontend/src/pages/EventDetail.tsx
    - frontend/src/lib/api.ts
    - frontend/src/lib/queries.ts
    - frontend/src/lib/types.ts
    - frontend/src/components/ui.tsx
    - backend/app/services/campaign_service.py
    - backend/app/controllers/event_controller.py
    - backend/tests/test_campaign_package.py

decisions:
  - "campaign_state gained registration_url, computed by the same _registration_url helper generate_slug uses — the read previously returned only the slug, which would have forced the browser to assemble the URL and broken D-12 on the very first page load."
  - "campaign_state gained form_field_types from constants.FORM_FIELD_TYPES, so the type picker has a server source and the browser keeps no second copy of the list FormFieldSchema validates against."
  - "duplicate_label renders inline under the offending input and does NOT revert the typed value; every other rejection reverts and toasts. A toast cannot say which of several rows collided, and reverting would delete the text the organiser has to edit."
  - "useMyRegistrations and the EventChat drawer are gated on a session. Their 401 enters the shared refresh path, which reads it as an expired session and redirects to /login — an unguarded call would have bounced the visitor straight off the public page."
  - "The anonymous description now reads activity.description, the same column the authenticated to_dict(detail=True) uses, rather than routing through the Proposal relationship."
  - "The clipboard write is wrapped: a refusal is reported to the organiser rather than leaving them believing they hold a link they do not have."

metrics:
  duration: 55min
  completed: 2026-08-16
  tasks: 3
  commits: 5

actuals:
  tokens: 21000
  tasks: 3
  commits: 5
---

# Phase 5 Plan 07: Shareable Registration Link and the Logged-Out Visitor Summary

An organiser can now shape the registration form inline, copy a link, and hand it to someone with no Ekatva account — who opens it, reads the event, and registers after signing in.

## What Shipped

**Task 1 — `FormFieldRow`** (`869b930`). Inline add/edit/remove of custom registration fields, mirroring `ScheduleRow`'s blur-save, `Saving…` caption and revert-on-error. A dropdown-type row exposes a comma-separated options editor; a text-type row does not. A duplicate label surfaces the server's own message under the offending input. The type picker is filled from `form_field_types` on the campaign payload, so no copy of the allowed set lives in the browser.

**Task 2 — `RegistrationLinkCard` and the public path** (`c1c1405`). The card shows the link in teal monospace or a `Generate Link` button before one is minted, and copies the `registrationUrl` **prop** — never the rendered text, which is truncated by CSS, and never a browser-assembled string. `isPublicEventPath` opens exactly one client path, `/events/<one-segment>`, to visitors with no session; the register control sends them through `/login` and back.

**Task 3 — manual verification** (below). Two real bugs found and fixed (`28b67bf`, `60fcc69`).

## Task 3 — Manual Verification Outcome

Performed by the coordinator against a running backend (`:5000`) and frontend (`:5173`) using headless Chromium, signed in as the seeded organiser `saiteja@ds.study.iitm.ac.in` managing activity *QA Test Meetup Phase3* (`d955e56062734fa18de2423de87fd4f1`).

**Not a bare approval — two genuine bugs surfaced, both fixed and committed.**

| Step | Outcome |
|---|---|
| 3 — teal monospace URL, truncated | **PASS**. Computed style `rgb(92,230,201)` = `#5CE6C9` (Ekatva Teal); `font-family: ui-monospace/SFMono/Menlo/…`; class `truncate max-w-[400px]` with `text-overflow: ellipsis`. |
| 4 — Copy button and `Link copied!` toast | **BUG FOUND AND FIXED** — see below. |
| 5 — logged-out visitor renders the event page | **BUG FOUND AND FIXED** — see below. |
| 6 — register → `/login` → back to the same event | **PASS**. Anonymous click on "Register — it's free" landed on `/login`; signing in as `arav@ds.study.iitm.ac.in` returned to the exact same event URL, now rendering the authenticated page. |
| 7 — regenerate, old link stops resolving | **GAP, not a bug** — see Known Gaps. |

### Bug 1 — the failed copy was completely silent (step 4)

`RegistrationLinkCard.handleCopy` awaited `navigator.clipboard.writeText` with nothing around it. The headless browser denied clipboard-write (`NotAllowedError`), the promise rejected into nothing, and the click produced **no success toast, no error toast, no feedback of any kind**. The organiser is left believing a link is on their clipboard when it is not — the worst outcome this card can produce.

This is not only a headless artifact: an insecure context, a browser policy or a revoked permission all cause the same refusal in a real browser. Fixed by reporting it:

```tsx
try {
  await navigator.clipboard.writeText(registrationUrl)
  addToast('Link copied!', 'success')
} catch {
  addToast('Could not copy automatically. Select and copy the link manually.', 'error')
}
```

The fallback works because the URL is already on screen for the reader to select. Verified post-fix in the denied-permission environment: the error toast appears. The happy-path argument was already correct — the full `registrationUrl` prop, not a reconstruction — matching D-12 and the existing source-level test. A spec now covers the refusal path (`says so when the browser refuses the clipboard write`).

### Bug 2 — every anonymous visit returned 500 (step 5)

`backend/app/controllers/event_controller.py:38`, the anonymous branch of `GET /events/<id>`, read `activity.proposal.description`. `Proposal` has no `description` attribute at all — it carries only `activity_id`, `submitted_by` and `status`. Every anonymous visit to a real event raised `AttributeError: 'Proposal' object has no attribute 'description'` and answered 500.

The bug predates this plan; it arrived with commit `76ca505` in the earlier partial 05-02/05-06 work. **This checkpoint is the first thing that ever exercised the anonymous branch against real data.**

Fixed by reading `activity.description` — the column `Activity` already has, and the one the authenticated `to_dict(detail=True)` already uses. Both faces of the event now take description from one source.

**Why the existing test missed it.** `test_slug_resolves_to_event` covers this endpoint anonymously and asserts 200, and it passed throughout. Its fixture helper `_seed_activity` is documented as creating "a minimal Activity directly **without a Proposal row**" — so `activity.proposal` was always `None` and the old ternary short-circuited before it could touch the missing attribute. The guard branch was tested; the real branch never was.

A regression test now seeds an activity **with** a proposal, which is the entire point of it. Negative control run: restoring the old line reproduces the exact failure —

```
E  assert 500 == 200
ERROR app:errors.py:42 'Proposal' object has no attribute 'description'
```

Post-fix the public page renders correctly for a logged-out visitor: title, description, date, venue, capacity, organiser, register CTA. A full-text scan of the anonymous page found no occurrence of "budget", "collaborator", "team member", "co-head" or "meetup head" (T-05-33 holds).

## Known Gaps

**No regenerate affordance in the UI (checkpoint step 7).** Once a slug exists, `RegistrationLinkCard` renders only the Copy button. The plan's checkpoint step 7 ("click Generate Link a second time") assumes a capability Task 2 was never asked to build — its acceptance criteria only require that a *null* URL renders `Generate Link`. This is a gap between the checkpoint script and the task spec, not a defect.

The underlying mechanism is correct and was verified directly at the API layer: `POST .../campaign/generate-slug` called twice minted `qa-test-meetup-phase3-jj9i-a` then `qa-test-meetup-phase3-2vsg3w`; the first resolved 200 before regeneration and 404'd immediately after. Backend rotation and invalidation work; only a UI trigger is missing.

**Deliberately not built here** — adding a regenerate button is a scope decision beyond this checkpoint's authority. Carry it as a backlog item for a future plan, alongside the "are you sure, this breaks every link already shared" confirmation such a button needs.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `campaign_state` did not carry `registration_url`**
- **Found during:** Task 2
- **Issue:** The plan feeds the card from "the campaign query's `registration_url`", but `campaign_state` returned only `registration_slug`; the URL existed solely on the `generate_slug` response. On page load with an existing slug the card had no URL, and the only way to render one would have been to assemble it in the browser — exactly what D-12 forbids.
- **Fix:** Extracted `_registration_url(slug)` as the single place the URL shape is written, used by both `generate_slug` and `campaign_state`.
- **Files:** `backend/app/services/campaign_service.py`, `backend/tests/test_campaign_package.py`
- **Commit:** `c1c1405`

**2. [Rule 3 - Blocking] No server source for the allowed field types**
- **Found during:** Task 1
- **Issue:** The plan forbids a client-side copy of the allowed types, but no endpoint exposed `FORM_FIELD_TYPES`, and deriving them from the fields already returned is empty on a virgin activity.
- **Fix:** `campaign_state` now carries `form_field_types`. `FormFieldSchema` validates against the same tuple, so picker and 422 cannot disagree.
- **Files:** `backend/app/services/campaign_service.py`, `backend/tests/test_campaign_package.py`
- **Commit:** `869b930`

**3. [Rule 1 - Bug] Session-only queries would have bounced the anonymous visitor**
- **Found during:** Task 2
- **Issue:** `EventDetail` mounts `useMyRegistrations`, and the chat drawer is always mounted so `EventChat`'s announcements query runs on load. Both answer 401 without a session; `request` routes a 401 into the shared single-flight refresh, whose failure fires `_onSessionExpired` and navigates to `/login`. The public page would have redirected itself away the instant it rendered, defeating OD-3 entirely.
- **Fix:** `useMyRegistrations` takes an `enabled` flag; `EventDetail` passes `!!currentUser` and gates the chat trigger and drawer on a session.
- **Files:** `frontend/src/lib/queries.ts`, `frontend/src/pages/EventDetail.tsx`
- **Commit:** `c1c1405`

**4. [Rule 2 - Accessibility] `Select` had no accessible-name pass-through**
- **Found during:** Task 1
- **Issue:** UI-SPEC §7 requires named controls in repeating rows, and the plan's criteria require `Select` from `./ui`; the primitive accepted no `aria-label`.
- **Fix:** Added an optional `ariaLabel` prop. Additive, no call site changed.
- **Files:** `frontend/src/components/ui.tsx`
- **Commit:** `869b930`

### Found During Manual Verification

**5. [Rule 1 - Bug] Silent clipboard failure** — Bug 1 above. Commit `60fcc69`.

**6. [Rule 1 - Bug] 500 on every anonymous event view** — Bug 2 above. Pre-existing from `76ca505`. Commit `28b67bf`.

### Extra Test Files Beyond the Plan's File List

`FormFieldRow.test.tsx` (Task 1 is `tdd="true"` with five stated behaviours) and `public-event-path.test.ts` (an unverified widening predicate is precisely threat T-05-34; the boundary is asserted from both sides).

## Verification

| Gate | Result |
|---|---|
| `cd frontend && npm run build` | exit 0 |
| `cd frontend && npm test` | 128 passed, 17 files |
| `cd backend && python -m pytest` | exit 0, full suite |
| Task 3 manual checkpoint | Steps 3 and 6 pass; steps 4 and 5 found bugs, both fixed and re-verified; step 7 recorded as a gap |

Threat dispositions held: T-05-33 (no organiser-internal content on the anonymous page — full-text scan), T-05-34 (`isPublicEventPath` anchored, sub-paths asserted rejected), T-05-35 (register endpoint keeps `@auth_required`; the client change is convenience), T-05-36 (clipboard receives the server payload; source test forbids browser-origin assembly), T-05-37 (labels render as React children only).

## Commits

| Hash | Message |
|---|---|
| `869b930` | feat(05-07): add inline editing for custom registration fields |
| `c1c1405` | feat(05-07): make the registration link copyable and openable without a login |
| `28b67bf` | fix(05-07): stop the public event page failing when the event has a proposal |
| `60fcc69` | fix(05-07): tell the organiser when copying the registration link fails |
| `a4d6aef` | chore: ignore the .gstack tooling directory |

## Known Stubs

None.

## Self-Check: PASSED

All five created files and the five recorded commits verified present on disk and in git history.
