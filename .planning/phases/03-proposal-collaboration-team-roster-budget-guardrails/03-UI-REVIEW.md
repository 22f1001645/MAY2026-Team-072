# Phase 3 — UI Review

**Audited:** 2026-08-13
**Baseline:** `03-UI-SPEC.md` (approved 2026-08-13)
**Screenshots:** not captured (no dev server reachable on :5173/:3000/:8080) — code-only audit

**Critical context finding, stated up front:** `03-UI-SPEC.md` is dated/approved **2026-08-13**. Every plan and summary in this phase directory (`03-01`…`03-04-SUMMARY.md`) is dated **completed: 2026-08-12** — the implementation was built and shipped a full day *before* this design contract existed. The spec was written retroactively against intent, not against what shipped, and its own `Checker Sign-Off` (all 6 dimensions PASS) does not reflect the actual `frontend/src/` code. This audit checks the code as it exists today against the contract as written; the two do not match on almost every surface.

---

## Pillar Scores

| Pillar | Score | Key Finding |
|--------|-------|-------------|
| 1. Copywriting | 2/4 | Half the mandated copy strings exist nowhere in the code; several are paraphrased rather than verbatim, and forbidden vocabulary (`org_id`) leaks to the UI. |
| 2. Visuals | 2/4 | Zero-collaborators/roster states exist but as ad hoc warnings, not the spec's neutral empty-state treatment; no visual hierarchy work matches the contract's anchor-ranking rules. |
| 3. Color | 2/4 | Teal used outside its reserved list (checkbox picker, collab respond button); a non-token `text-warn` class used for a status that should be a badge; gold/danger status mapping only partly implemented. |
| 4. Typography | 1/4 | New code is built almost entirely on arbitrary `text-[10px]`/`text-[11px]`/`text-[12px]`/`text-[13px]` sizes — none of which are in the declared 4-size scale (20/16/14/12). This is the opposite of what the spec requires. |
| 5. Spacing | 2/4 | `py-2.5`/`py-1.5` and other values outside the declared 8-point scale are used freely for new spacing decisions, not confined to the documented exceptions. |
| 6. Experience Design | 1/4 | Two of eight surfaces (S5 notifications-dropdown invite, S6 dashboard invitations block) are **entirely unimplemented**. `Dialog`/`Select`/`Progress`(for budget)/`EmptyState` primitives are not used at all in the new code. No busy-state minimum duration, no `role="alert"`, no scroll-into-view/focus on rejection. |

**Overall: 10/24**

---

## Top 3 Priority Fixes

1. **S5 and S6 do not exist — the collaboration-invitation UX described as "the reason this surface exists" is entirely missing.** `NotificationsDropdown.tsx` has no `collaboration_invite` entry in its `TONE` map and no `InvitationCard`; `OrganiserDashboard.tsx` has zero references to "invitation" and no `id="invitations"` block. A collaborating org's Secretary currently has **no way to see or act on an invite** from the dashboard or the notification bell — the only respond surface is buried inside `EventDetail.tsx`, which a Secretary would only reach by already knowing the event exists. Build `InvitationCard.tsx` and wire both consumption points per S5/S6.

2. **None of the four mandated feature components were built** (`CollaboratorPicker.tsx`, `TeamRosterPicker.tsx`, `BudgetCeiling.tsx`, `InvitationCard.tsx` — all absent from `frontend/src/components/`). Instead, `ProposalNew.tsx` reimplements collaborator/roster/budget UI inline as raw `<div>`/`<button>`/`<input>` markup that bypasses `Select`, `Progress`, and `Badge` conventions (e.g. `ProposalNew.tsx:335-343` hand-rolls a role `<select>` instead of using the `Select` primitive; the org picker at `ProposalNew.tsx:369-396` is a checkbox-button grid, not the spec's `Select` + "Add" button). This means every state/copy/interaction rule attached to those components in the spec (Meetup-Head singleton disabling, "(assigned)" suffix, keyboard-navigable search, `aria-label` per row) has no home to be implemented in.

3. **Typography and copy diverge wholesale from the contract.** New UI text sits at `text-[10px]`/`text-[11px]`/`text-[12px]`/`text-[13px]` throughout `ProposalNew.tsx` and `EventDetail.tsx` (e.g. `ProposalNew.tsx:270,292,326,332,365,398` and `EventDetail.tsx:130,173`), none of which are members of the spec's declared 20/16/14/12px scale. Mandated copy is absent or paraphrased: the Team roster hint should read "Assign one Meetup Head. Everything else is optional." but the shipped copy reads "Name the people running this event. The first person added becomes the Meetup Head — required" (`ProposalNew.tsx:293`) — a materially different rule (first-added vs. role-selected) that also contradicts S2's contract that role is chosen at add time. Run a pass to replace every ad hoc size/copy string with the declared token and verbatim string.

---

## Detailed Findings

### Pillar 1: Copywriting (2/4)

- **Wrong mechanism entirely for Meetup Head assignment.** Spec (S2): role is chosen at add time via a `Select`, and the singleton is a disabled `Select` option. Shipped (`ProposalNew.tsx:79`): whoever is added *first* is auto-assigned `'Meetup Head'`, and removing them auto-promotes the next row (`ProposalNew.tsx:349-351`). The copy "The first person added becomes the Meetup Head — required" (`ProposalNew.tsx:293`) documents this divergent rule, not the spec's rule. This is a behavior fork, not a copy nit.
- **Collaborator section hint copy diverges.** Spec: "Name every organisation running this with you. Each one's Secretary is asked to accept before it counts." Shipped (`ProposalNew.tsx:365-368`): "Optional. Co-running orgs receive an invitation to accept. 3+ acceptances unlocks the Mega Meetup label." — different words, different framing (states "Optional" which the spec never needs to say since zero is already handled as valid without a caveat).
- **Zero-collaborators empty copy missing.** Spec requires "No collaborators yet — this is a {Org name} event." when zero are added. No such string exists in `ProposalNew.tsx`; the collaborator block just renders an empty grid.
- **Budget over-ceiling copy diverges from spec's exact sentence.** Spec: "{inr(total)} is {inr(over)} over the ceiling. Lower a line or raise capacity — the server rejects anything above it." Shipped (`ProposalNew.tsx:280`): "⚠ Over cap: ₹{total} exceeds limit of ₹{cap} (₹200/person, max ₹20,000)" — uses raw `toLocaleString` instead of the mandated `inr()` (violates the "Money is always `inr()`" copy rule directly), and does not state the over-by amount.
- **Forbidden vocabulary leaks to the user.** `EventDetail.tsx:231` renders a raw text input with placeholder `"User ID (e.g. fd4b...)"` for reassigning the Meetup Head — `user_id` as implementation-shaped text is effectively surfaced to the organiser, who must know/paste an opaque ID rather than search by name (contradicts S8's `Select … listing only existing team members` contract entirely).
- **S4 heading-by-failure-kind is not implemented.** Spec requires headings chosen from the envelope's `code` (Assign exactly one Meetup Head / Budget is over the ceiling / etc.). Shipped (`ProposalNew.tsx:415-418`) renders only the raw `error.message` with no heading, no per-kind classification, no `role="alert"`.
- **What is present and correct:** "Submit for approval" label matches; the quota-notice block content is reasonably close in spirit though not verbatim to spec text (spec doesn't define this block's copy explicitly beyond BUDGET-01 refs, so this is acceptable).

### Pillar 2: Visuals (2/4)

- No focal-point/anchor-ranking work was done — the spec's explicit rule ("if the ceiling readout ever out-shouts the title... never enlarge SectionTitle") is moot since the ceiling indicator is a plain colored strip inline in the budget card, not a distinct visual weight problem, but also not the specified `Progress` meter — so the "meter" pillar of the visual hierarchy contract (S3) doesn't exist at all.
- Icon-only buttons: the remove (`×`) buttons in the team roster (`ProposalNew.tsx:354-355`) and collaborator picker rows carry **no `aria-label`** and are not 36px boxes — they're bare `×` text inside inline flex, contradicting the spec's explicit accessibility-floor rule ("No icon-only control in this phase may be smaller than 36px, and none may ship without an `aria-label`").
- The Mega Meetup badge does correctly use `Badge tone="gold"`/`tone="teal"` inconsistently across files: `ProposalNew.tsx` never renders a Mega Meetup badge in the form at all (spec requires it to appear once accepted-plus-self reaches 3, which is presentational nonsense pre-submission anyway since nothing is accepted yet — but the spec explicitly requires the "n of 3 accepted" counter sentence, which is entirely absent), while `EventDetail.tsx:116` and `ApprovalQueue.tsx:150-151` use `tone="teal"` for the Mega Meetup badge — **this directly violates the explicit "Teal is explicitly forbidden on: the Mega Meetup badge — it is gold" rule.**

### Pillar 3: Color (2/4)

- **Teal-forbidden violation, both admin and event-detail surfaces.** `ApprovalQueue.tsx:151` and `EventDetail.tsx:116` render the Mega Meetup badge as `<Badge tone="teal">⚡ Mega Meetup</Badge>`. Spec is explicit and unambiguous that this badge must be gold — "Mega Meetup is a recognition, not an action, and teal would make it read as a control."
- **`text-warn` used for collaborator status** at `EventDetail.tsx:129` (`c.status === 'accepted' ? 'text-teal' : c.status === 'declined' ? 'text-graytext-mid' : 'text-warn'`) — this is color-only encoding of state (a plain text color swap, no badge, no icon, no second channel), which directly violates "Never encode state in color alone… a collaborator's pending vs accepted state… so a colour-only distinction would make a business rule invisible to a colour-blind organiser." The spec mandates `Badge tone="warn"/"success"/"danger"` with a text label per state; shipped code uses a bare colored uppercase string with no badge at all.
- **Checkbox-style collaborator picker uses teal for a non-CTA selection state** (`ProposalNew.tsx:381-389`, `border-teal bg-teal/10` on a toggle button that is not one of the six reserved teal uses — it's a selection/filter control, not a primary CTA, a scale card, a focus ring, a link, the budget-total row, or the Primary marker).
- Over-ceiling budget correctly uses red/danger framing (`ProposalNew.tsx:272`), which is directionally right, but does not use `Badge tone="danger"` or the `Progress` meter at all — it's a flat colored div, so the "three channels" over-ceiling rule (red total badge + sentence + red meter) is not met; there is no meter.

### Pillar 4: Typography (1/4)

- Declared scale is exactly four sizes: 20px heading / 16px body / 14px control / 12px caption. The new code in `ProposalNew.tsx` alone uses `text-[10px]`, `text-[11px]`, `text-[12px]`, `text-[13px]`, `text-[14px]` — five distinct arbitrary sizes, three of which (`10px`, `11px`, `13px`) are not in the scale at all. Examples: `text-[10px]` checkbox glyph (`:388`), `text-[11px]` role badges (`:332`, `:392`), `text-[13px]` used as the de facto "body copy" size throughout instead of the declared `text-body`(16px)/`text-[14px]` control size (`:260, :270, :302, :314, :334, :382`).
- `EventDetail.tsx` continues the pattern: `text-[14px]`, `text-[12px]`, `text-[11px]` mixed freely (`:125, :128, :172, :173`).
- This is a wholesale miss on the pillar's core ask (≤4 sizes, and specifically these four) — the implementation reads as having never consulted the typography table.

### Pillar 5: Spacing (2/4)

- New spacing decisions use `py-2.5` (`ProposalNew.tsx:270, 302, 314, 382`) which is not in the declared 8-point scale (4/8/16/24/32/48) nor in any of the five enumerated 12px exceptions — `py-2.5` is 10px, matching only the `Input`/`Select` primitive's own hardcoded exception, but these are raw `<input>`/`<div>`/`<button>` elements, not instances of the `Input`/`Select` primitives, so the exception doesn't actually cover them per the spec's own scoping language ("valid ONLY on the existing Input and Select primitives — nothing else").
- `gap-3` appears in the collaborator/roster rows (`ProposalNew.tsx:330` inherited call-site, acceptable) but also spreads into genuinely new elements like the reassign flex row in `EventDetail.tsx:226` (`flex flex-col sm:flex-row gap-2` — actually gap-2, this one's fine) and the collab card row `EventDetail.tsx:122` (`gap-3` — a new element, not one of the five enumerated 12px exceptions, so this is a new `gap-3` decision outside the closed list, which the spec explicitly forbids: "No new gap-3... may appear anywhere in this phase outside the five rows above").
- Budget cap indicator uses `mt-4` (`ProposalNew.tsx:270`) — 16px, within the declared scale, fine.

### Pillar 6: Experience Design (1/4)

- **S5 (notifications dropdown invite) — entirely absent.** No `collaboration_invite` tone entry, no `InvitationCard` usage in `NotificationsDropdown.tsx`.
- **S6 (dashboard invitations block) — entirely absent.** `OrganiserDashboard.tsx` has zero mentions of "invitation"; no `id="invitations"` anchor exists for S5's "See full details" link to even target.
- **S8 (Meetup Head reassignment) — not a `Dialog`.** Spec mandates the existing `Dialog` primitive with a `Select` of existing team members only, a live consequence sentence, and a single-step confirm. Shipped (`EventDetail.tsx:220-252`) is an inline text `<input>` for a raw user ID with no `Dialog`, no `Select`, no consequence sentence, no "currently {Name}" line, and no guard against a value that isn't even on the roster.
- **No busy-state minimum duration, no `aria-busy`, no padlock/unauthorised treatment anywhere in new code.** Interaction States A/B/C from the spec (inherited from Phase 2) are not implemented for any of these new controls — buttons just toggle a `disabled` on `mutation.isPending` with no minimum visible duration and no `aria-busy` attribute.
- **S4 rejection strip does not scroll/focus, has no `role="alert"`, and does not mark the offending section's border** — none of the three explicit "Never" rules' positive counterparts are met.
- **Budget ceiling (S3) never uses the `Progress` primitive** — spec requires `Progress value={total} max={cap}`; shipped code has no meter at all, only a colored text strip.
- One correct behavior: form state is preserved on rejection (fields aren't cleared) since the strip is just conditionally rendered alongside the existing form — this incidentally satisfies S4's "form never wipes" rule, though not through deliberate design per the plan doc.

---

## Registry Safety

Not applicable — `components.json` does not exist (confirmed absent), and the UI-SPEC records shadcn as not initialised. Registry audit: 0 third-party blocks checked, none applicable.

---

## Files Audited

- `frontend/src/pages/ProposalNew.tsx`
- `frontend/src/pages/EventDetail.tsx`
- `frontend/src/pages/ApprovalQueue.tsx`
- `frontend/src/components/NotificationsDropdown.tsx` (grepped, no collaboration_invite handling found)
- `frontend/src/pages/OrganiserDashboard.tsx` (grepped, no invitation block found)
- `frontend/src/components/ui.tsx` (primitives inventory reference)
- `frontend/src/components/` directory listing (confirmed absence of `CollaboratorPicker.tsx`, `TeamRosterPicker.tsx`, `BudgetCeiling.tsx`, `InvitationCard.tsx`)
- `.planning/phases/03-.../03-UI-SPEC.md`
- `.planning/phases/03-.../03-01-SUMMARY.md` through `03-04-SUMMARY.md`
