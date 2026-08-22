---
phase: 6
slug: event-execution-close-out
status: approved
shadcn_initialized: false
preset: none
created: 2026-08-18
---

# 06-UI-SPEC — Phase 6: Event Execution & Close-Out

**Generated:** 2026-08-18
**Phase:** 6 — Event Execution & Close-Out
**Status:** Approved ✓

---

## 1. Design System Baseline

This phase inherits the **Ekatva Brand Kit v1.0** tokens already codified in `tailwind.config.js` and `frontend/src/components/ui.tsx`. No new design tokens are introduced. All new surfaces MUST use these tokens exclusively — no ad-hoc hex values.

No shadcn/cn is in use; the project's hand-rolled design system is the source of truth.

### Color Palette

| Token | Hex / Value | Usage in Phase 6 |
|---|---|---|
| `teal` | `#5CE6C9` | QR success state, active timeline nodes, CTA buttons, star fill, focus rings |
| `teal-accent` | `#3FD4B6` | Button hover, timeline connector lines (active), QR scan frame border |
| `teal-deep` | `#1F4F59` | Secondary button bg, accordion panel header bg |
| `teal-grad` | `#0E2F36` | Card gradient base, CheckIn page bg tint |
| `gold` | `#FFCF96` | Page headings (SectionTitle), empty-state icon |
| `onyx` | `oklch(0.13 0.015 175)` | Page background, card substrate |
| `offwhite` | `#F8F8F8` | Body text, timeline descriptions, student names |
| `graytext-light` | `#AAAAAA` | Timeline timestamps, captions, feedback comment placeholder |
| `graytext-mid` | `#666666` | Placeholder text, disabled labels, draft expense row metadata |
| `divider` | `#333333` | Timeline track line, accordion separator, roster row border |
| `emerald-300` | `—` | QR duplicate badge, check-in success indicator |
| `red-300` | `—` | QR invalid/error card, reimbursement validation error |
| `amber-300` | `—` | Expense draft pending badge |

### Typography

| Scale | Size / Weight | Usage |
|---|---|---|
| `text-h1` | 36px / 700 | Page titles via `<SectionTitle>` |
| `text-h2` | 28px / 600 | Section headers (e.g., "Attendance", "Event Timeline") |
| `text-h3` | 20px / 600 | Card sub-headers, accordion headers, panel titles |
| `text-body` | 16px / 400 | Timeline descriptions, form labels, roster names |
| `text-caption` | 12px / 400 | Timeline timestamps, attendee count, QR scan metadata |
| Font | Poppins | All surfaces — already loaded globally |

### Spacing

| Use | Class |
|---|---|
| Page outer padding | `px-6 py-8` (matches existing pages) |
| Card inner padding | `p-5` (stat panels) or `p-6` (content cards) |
| Section gap | `mb-8` between major sections |
| Form field gap | `gap-4` between inputs |
| Inline row gap | `gap-3` within a single row |
| Accordion header | `px-5 py-4` |
| Timeline node gap | `gap-4` between timeline entries |

### Existing Primitives Available (reuse, do not duplicate)

- `Button` — variants: `primary`, `secondary`, `ghost`, `danger`; sizes: `sm`, `md`, `lg`
- `Card` — `hover` prop for interactive cards; `shadow-card`, `rounded-xl2`
- `Badge` — tones: `teal`, `gold`, `neutral`, `success`, `warn`, `danger`
- `SectionTitle` — eyebrow + h1 + sub + right slot
- `Input` — single-line field; token-correct focus ring
- `Textarea` — multiline; same token classes as `Input`; auto-save on blur (Phase 5 pattern)
- `Select` — token-correct dropdown
- `Dialog` — modal with backdrop blur; max-w-md default
- `EmptyState` — empty card with teal circle icon placeholder
- `Progress` — horizontal bar; tone `teal` or `gold`
- `ToastProvider` / `useToast` — success/error/info toasts (3.5s auto-dismiss)
- `StatCard` — stat display card with label/value/hint

---

## 2. New Components Required

### 2.1 `QRScannerTab`

**Purpose:** Camera-based QR code scanner for the CheckIn page. Wraps `@yudiel/react-qr-scanner` with Ekatva styling and scan-result UI.

**Visual spec:**
- Container: `flex flex-col items-center gap-4`
- **Camera viewport:** `rounded-xl2 overflow-hidden w-full max-w-[360px] aspect-square mx-auto border-2 border-teal/30`. The scanner fills this container. Scan frame overlay: animated `border-2 border-teal` corner indicators (CSS-only, 20px arms at each corner, `animate-pulse`).
- **Scan-in-progress state:** camera live, no additional overlay.
- **Success result card (dismisses on next scan):** `flex items-center gap-3 w-full max-w-[360px] rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-3 text-emerald-300 text-[14px] font-medium`. Left: green checkmark SVG 18px. Content: `"Checked in — [Student Name]"`. Auto-clears after 3 seconds OR on next scan, whichever comes first. Simultaneously fires `addToast("Checked in — [Student Name]", "success")` toast.
- **Error card (persistent until next scan):** `flex flex-col gap-1 w-full max-w-[360px] rounded-xl bg-red-500/10 border border-red-400/30 px-4 py-3`. Title: `text-red-300 text-[14px] font-medium`. Sub: `text-caption text-red-300/70`. Cases:
  - `duplicate`: title `"Already checked in"`, sub `"[Student Name] was marked present earlier."`
  - `invalid_qr`: title `"Invalid QR code"`, sub `"This code is not valid for this event. Ask the student to refresh."`
  - network error: title `"Check-in failed"`, sub `"Network error — try again or switch to Roster."`
- Camera stays live in all states (no auto-pause on error).

---

### 2.2 `RosterTab`

**Purpose:** Tap-based manual check-in roster (fallback). Lists registered students; each row tap marks attendance.

**Visual spec:**
- `Search` input at top: `Input placeholder="Search by name..."` full width.
- Student rows: `flex items-center justify-between py-3.5 border-b border-divider group`.
  - Left: name `text-body text-offwhite` + registered method badge (e.g., `Badge tone="neutral" "Registered"`).
  - Right: already checked-in → `Badge tone="success" "Present ✓"`; not checked-in → `Button variant="secondary" size="sm" "Check in"`.
  - On "Check in" press → button shows spinner + `"Checking in…"` (disabled); on success → row swaps to `"Present ✓"` badge + `addToast("[Name] checked in", "success")`.
- Top-of-page stats bar: `flex gap-6 mb-4 text-caption`.
  - `"[N] total registered"` in `text-graytext-light`
  - `"[N] checked in"` in `text-teal`
  - `"[N] absent"` in `text-graytext-mid`
- Empty state (no registrations): `EmptyState title="No registrations yet" sub="Students must register before being checked in."`.

---

### 2.3 `CheckInPage` (Page: `/events/:id/checkin`)

**Purpose:** Container page for the QR + Roster tabs. Organiser-only. Already linked from `EventDetail.tsx` line 244.

**Layout:**
```
<SectionTitle eyebrow="Day-Of" title="Check-In" right={<statBadge>} />

<div className="flex gap-2 mb-6">                // Tab switcher
  <Button variant={tab==='qr' ? 'primary' : 'ghost'} onClick={()=>setTab('qr')}>QR Scanner</Button>
  <Button variant={tab==='roster' ? 'primary' : 'ghost'} onClick={()=>setTab('roster')}>Roster</Button>
</div>

{tab === 'qr' ? <QRScannerTab /> : <RosterTab />}
```
- Tab state: `useState<'qr' | 'roster'>('qr')`.
- Camera permission denied: `<Card p-8 text-center>` — icon + `"Camera access denied"` title + `text-body text-graytext-light "Switch to Roster to check students in manually."` + `Button variant="secondary" onClick={()=>setTab('roster')} "Switch to Roster"`.
- Page background: `bg-onyx` (no gradient — functional tool surface).

---

### 2.4 `QRTicket` (inline component in `MyRegistrations`)

**Purpose:** Attendee-facing QR code rendered inline above each confirmed registration card (D-03). Uses `qrcode.react`.

**Visual spec:**
- Renders only for registrations where `activity.status !== 'ended'` and `status === 'confirmed'`.
- Container: `flex flex-col items-center gap-2 py-4 border-b border-divider/50`.
- Label: `text-caption uppercase tracking-wider text-graytext-light "Your Check-In Code"`.
- QR: `<QRCodeSVG value={registration.id} size={180} bgColor="transparent" fgColor="#5CE6C9" />` — teal foreground on transparent background (matches dark theme).
- Sub-label: `text-caption text-graytext-mid "Show this to the organiser at the door"`.
- If already attended (`attended === true`): replace QR with `Badge tone="success" "Attended ✓"` + `text-caption text-graytext-mid "[Event Name]"`.

---

### 2.5 `EventTimeline` (section in `ManageEvent`)

**Purpose:** Read-only chronological projection of event activity (TIMELINE-01). Rendered as a scrollable section at the bottom of `ManageEvent`.

**Layout:**
```
<section aria-label="Event Timeline" className="mt-12">
  <h2 className="text-h2 text-offwhite mb-6">Event Timeline</h2>
  <div className="relative flex flex-col gap-0">
    {events.map((e, i) => <TimelineEntry key={e.id} event={e} isLast={i === events.length - 1} />)}
  </div>
</section>
```

**`TimelineEntry` visual spec:**
- Container: `relative flex gap-4 pb-6` (last entry: `pb-0`).
- Left column: `flex flex-col items-center w-8 shrink-0`.
  - **Node:** `w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0`.
    - Proposal / admin events: `border-teal bg-teal/10` + teal SVG icon.
    - Check-in events: `border-emerald-400 bg-emerald-400/10` + check SVG icon.
    - Report / reimbursement: `border-gold bg-gold/10` + document SVG icon.
    - Registration / campaign: `border-teal-accent bg-teal-accent/10` + person / megaphone SVG icon.
  - **Connector line:** `flex-1 w-0.5 bg-divider mt-1` — hidden on last entry.
- Right column: `flex flex-col gap-0.5 pt-1 pb-0`.
  - Description: `text-body text-offwhite`.
  - Metadata: `text-caption text-graytext-light` — actor name (if any) + ISO timestamp formatted as `"14 Aug 2026 at 3:45 PM"`.
  - Check-in entries show `Badge tone="neutral" "QR"` or `Badge tone="neutral" "Manual"` inline after description.

**Empty state:** `EmptyState title="No activity yet" sub="Timeline events will appear here as the event progresses."`.
**Loading:** 4 skeleton rows (`bg-white/5 rounded-xl h-10 animate-pulse`).

---

### 2.6 `ReimbursementPanel` (accordion in `ManageEvent`)

**Purpose:** Expense draft management + Meetup Head submit with social-post URL (REIMB-01/REIMB-02).

**Accordion visual spec:**
- Header: `flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/5 rounded-xl2 transition`.
  - Left: `text-h3 text-offwhite "Reimbursement"` + `Badge tone="warn" "Draft"` (while expenses in draft) or `Badge tone="success" "Submitted"` (after submit).
  - Right: chevron icon rotating 180° on expand.
- Panel (expanded): `px-5 pb-5`.

**Draft expense rows:**
- Each draft row: `flex items-center gap-3 py-3 border-b border-divider group`.
  - `Input placeholder="Expense label" className="flex-1"` (auto-save on blur).
  - `Input type="number" placeholder="Amount ₹" className="w-28 shrink-0"`.
  - `Input placeholder="Bill reference" className="w-40 shrink-0"`.
  - Delete button: `Button variant="ghost" size="sm" aria-label="Remove expense"` — trash icon; visible on `group-hover`.
- Add row: `Button variant="ghost" size="sm" className="mt-3" "+ Add expense"`.
- Empty state (no drafts): `text-caption text-graytext-mid "No expenses yet — add rows above."`.

**Submit section (bottom of panel):**
- Social post URL field: `Input type="url" placeholder="https://instagram.com/p/..." label="Social post link"` (required for submit).
- URL validation: red border + `text-caption text-red-300 "Invalid or unsafe URL"` on invalid.
- Meetup Head: `Button variant="primary" size="lg" "Submit Reimbursement"`. Requires non-empty social URL.
- Non-Meetup-Head: same button but `aria-disabled="true"` + `title="Only the Meetup Head can submit"` + `text-caption text-graytext-mid mt-2 "This action requires the assigned Meetup Head."`.
- After submit: replace draft list with `Badge tone="success" "Submitted"` + total amount + submitted timestamp.
- Confirm dialog: `Dialog title="Submit Reimbursement?"` — body: `"This will send [N] expense(s) totalling ₹[amount] for admin review."` + Confirm / Cancel buttons.

---

### 2.7 `ReflectionPanel` (section in `ManageEvent`)

**Purpose:** Post-event reflection draft/submit (FEEDBACK-01 — any team member drafts, Meetup Head submits).

**Visual spec:**
- Container: `Card p-6 mb-8`.
- Header: `flex items-center justify-between mb-4`.
  - Left: `text-h3 text-offwhite "Post-Event Reflection"`.
  - Right: `Badge tone="success" "Submitted"` (after submit) or `Badge tone="neutral" "Draft"`.
- **Challenges textarea:** `Textarea placeholder="What challenges did the team face?" rows={4}`. Label: `text-caption uppercase tracking-wider text-graytext-light mb-1 "Challenges"`. Auto-save on blur (same pattern as Phase 5 ScheduleRow — inline `"Saving…"` fade text).
- **Learnings textarea:** `Textarea placeholder="What did the team learn? What would you do differently?" rows={4}`. Label: same pattern. Auto-save on blur.
- Save feedback: `"Saving…"` fades in (100ms) then fades out (500ms delay after 800ms).
- **Meetup Head submit button:** `Button variant="primary" size="md" "Submit Reflection"` — calls PATCH `/api/v1/activities/:id/report` with `{status: "submitted"}`.
- **Non-Meetup-Head:** button is `aria-disabled="true"` with `title="Only the Meetup Head can submit the post-event reflection"`. `text-caption text-graytext-mid mt-2 "Awaiting Meetup Head sign-off."`.
- After submit: textareas become `readOnly`; submit button replaced with `Badge tone="success" "Reflection Submitted"` + submitted timestamp.
- Empty state (event not yet ended): panel is hidden entirely; no reflection until event date has passed.

---

### 2.8 `FeedbackForm` (section in `EventDetail`)

**Purpose:** Attendee 1–5 star rating + comment form (FEEDBACK-02). Gated on Attendance record. Visible only after event date.

**Visual spec:**
- Container: `Card p-6 mb-8`.
- Header: `text-h3 text-offwhite mb-4 "Rate This Event"`.
- **Star rating:** 5 star SVG icons in a `flex gap-2` row. Each star: `w-8 h-8 cursor-pointer transition`. Filled ≤ selected: `text-gold fill-gold`; unfilled > selected: `text-divider`. Hover: all stars up to hovered index light up gold (optimistic preview). `aria-label="Rate [N] out of 5"` per star.
- **Comment textarea:** `Textarea placeholder="Share your thoughts (optional)" rows={3} className="mt-4"`.
- **Submit button:** `Button variant="primary" size="md" "Submit Feedback"`. Disabled until a star is selected.
- After submit: replace form with `Badge tone="success" "Feedback Submitted"` + `text-body text-graytext-light "Thank you! Your rating: [N] ★"`.
- Already submitted (409 from backend): show `Badge tone="success" "Feedback Submitted"` without the form.
- **Attendance-gated:** if `registration.attended !== true`, render nothing (no form, no placeholder) — section invisible.
- **Event not ended:** section invisible (rendered only after event `starts_at` has passed).

---

## 3. Page Layouts

### 3.1 CheckIn Page (`/events/:id/checkin`)

See component 2.3. New page file: `frontend/src/pages/CheckIn.tsx`.

### 3.2 ManageEvent Page (existing — new sections added)

New sections appended below existing content, in order:
1. `<ReflectionPanel />` — after the team/attendance stats section.
2. `<ReimbursementPanel />` — after ReflectionPanel.
3. `<EventTimeline />` — last section (bottom of page, scrolled to after close-out is complete).

### 3.3 EventDetail Page (existing — new section added)

New section appended after the event description / schedule section:
1. `<FeedbackForm />` — visible only after event date + attendance confirmed.

### 3.4 MyRegistrations Page (existing — QR inline addition)

`<QRTicket />` component added inline above each registration card. No new page route.

---

## 4. Copywriting Contract

| Context | Copy |
|---|---|
| CheckIn page eyebrow | `"Day-Of"` |
| CheckIn page title | `"Check-In"` |
| QR scan success toast | `"Checked in — [Student Name]"` |
| QR scan success card | `"Checked in — [Student Name]"` |
| QR duplicate card title | `"Already checked in"` |
| QR duplicate card sub | `"[Student Name] was marked present earlier."` |
| QR invalid card title | `"Invalid QR code"` |
| QR invalid card sub | `"This code is not valid for this event. Ask the student to refresh."` |
| QR network error title | `"Check-in failed"` |
| QR network error sub | `"Network error — try again or switch to Roster."` |
| Camera denied title | `"Camera access denied"` |
| Camera denied sub | `"Switch to Roster to check students in manually."` |
| Camera denied CTA | `"Switch to Roster"` |
| Roster search placeholder | `"Search by name..."` |
| Roster empty state | `"No registrations yet"` / `"Students must register before being checked in."` |
| QR ticket label | `"Your Check-In Code"` |
| QR ticket sub | `"Show this to the organiser at the door"` |
| QR attended badge | `"Attended ✓"` |
| Timeline section title | `"Event Timeline"` |
| Timeline empty state | `"No activity yet"` / `"Timeline events will appear here as the event progresses."` |
| Reflection panel title | `"Post-Event Reflection"` |
| Challenges label | `"Challenges"` |
| Challenges placeholder | `"What challenges did the team face?"` |
| Learnings label | `"Learnings"` |
| Learnings placeholder | `"What did the team learn? What would you do differently?"` |
| Reflection submit CTA | `"Submit Reflection"` |
| Reflection non-head tooltip | `"Only the Meetup Head can submit the post-event reflection"` |
| Reflection non-head sub | `"Awaiting Meetup Head sign-off."` |
| Reflection submitted badge | `"Reflection Submitted"` |
| Reimbursement panel title | `"Reimbursement"` |
| Expense label placeholder | `"Expense label"` |
| Expense amount placeholder | `"Amount ₹"` |
| Expense bill placeholder | `"Bill reference"` |
| Expense add row CTA | `"+ Add expense"` |
| Expense empty state | `"No expenses yet — add rows above."` |
| Social URL placeholder | `"https://instagram.com/p/..."` |
| Social URL label | `"Social post link"` |
| Social URL invalid | `"Invalid or unsafe URL"` |
| Submit reimbursement CTA | `"Submit Reimbursement"` |
| Submit reimb dialog title | `"Submit Reimbursement?"` |
| Submit reimb dialog body | `"This will send [N] expense(s) totalling ₹[amount] for admin review."` |
| Reimb non-head tooltip | `"Only the Meetup Head can submit"` |
| Reimb non-head sub | `"This action requires the assigned Meetup Head."` |
| Feedback section title | `"Rate This Event"` |
| Feedback submit CTA | `"Submit Feedback"` |
| Feedback submitted badge | `"Feedback Submitted"` |
| Feedback submitted sub | `"Thank you! Your rating: [N] ★"` |

---

## 5. Interaction & Animation Contracts

| Interaction | Spec |
|---|---|
| QR scan result fade-in | `animate-fade-up` on result card mount |
| QR result auto-clear | Result card fades to `opacity-0` over 300ms after 3s |
| Star rating hover | All stars ≤ hovered index: `text-gold fill-gold transition-colors duration-100` |
| Star rating click | Clicked index locked; re-click same star clears selection |
| Reflection auto-save | `"Saving…"` text: `opacity-0 → 1 (100ms)`, then `opacity-1 → 0 (500ms, delay 800ms)` |
| Accordion expand | `max-h-0 → max-h-[999px] transition-all duration-300 ease-material overflow-hidden` |
| Accordion chevron | `rotate-0 → rotate-180 transition-transform duration-200` |
| Timeline entry mount | Each entry: `animate-fade-up` with staggered `delay-[N*50ms]` (capped at 400ms) |
| Expense row delete | Fade + `max-h` collapse: `max-h-[72px] → max-h-0 transition-all duration-200` |
| Check-in button loading | Spinner SVG (`animate-spin-slow`) + `"Checking in…"` text; button `disabled` |
| Page enter | `animate-fade-up` on page container |
| Button hover/press | Inherits `Button` base: `hover:scale-[1.02] active:scale-[0.97]` |

---

## 6. Accessibility

- `QRScannerTab`: `<video>` has `aria-label="QR scanner camera"`. Scan result card: `role="status" aria-live="polite"`.
- `RosterTab` search: `aria-label="Search registered students"`. Student rows: `role="row"` in `role="table"` wrapper for screen-reader list comprehension.
- `CheckIn` tab switcher: `role="tablist"` + `role="tab"` + `aria-selected` on each tab button.
- Star rating: `role="radiogroup" aria-label="Event rating"`. Each star: `role="radio" aria-label="[N] star[s]" aria-checked={selected === N}`.
- `ReimbursementPanel` accordion: `aria-expanded` on trigger, `aria-controls` pointing to panel `id`.
- `ReflectionPanel` disabled submit: `aria-disabled="true"` (not `disabled`) — tooltip remains keyboard-reachable.
- `EventTimeline`: `<section aria-label="Event Timeline">`. Each entry: `<article aria-label="[type] at [timestamp]">`.
- All SVG icons: `aria-hidden="true"` with sibling visually-hidden text for buttons that are icon-only.
- Focus order on ManageEvent follows DOM order (existing sections → reflection → reimbursement → timeline).

---

## 7. Responsive Breakpoints

| Breakpoint | Behaviour |
|---|---|
| `< 640px` (mobile) | CheckIn QR viewport: `max-w-full` (full width); Roster stats bar: 2-line wrap; Expense rows: stack `flex-col`; Timeline: left column collapses (connector line hidden, node stays) |
| `640–1024px` (tablet) | QR viewport: `max-w-[320px]`; Expense rows: 3-column (label + amount + bill) side by side; Full layout |
| `≥ 1024px` (desktop) | Full layout throughout |

---

## 8. State Coverage Summary (pre-probe)

| Element | Key states |
|---|---|
| QRScannerTab | idle / scanning / success (with name) / duplicate / invalid / network-error / camera-denied |
| RosterTab | loading / empty / populated / searching / checking-in (per row) |
| QRTicket | upcoming-confirmed / attended / event-ended |
| EventTimeline | loading / empty / populated (1+ entries) |
| TimelineEntry | types: proposal / approved / registration / campaign-live / check-in / report / reimbursement |
| ReimbursementPanel | collapsed / expanded-no-drafts / expanded-with-drafts / submitting / submitted / meetup-head / non-meetup-head |
| ReflectionPanel | hidden (event not ended) / draft / saving / submitted / meetup-head / non-meetup-head |
| FeedbackForm | hidden (not attended / event not ended) / no-rating-selected / rating-selected / submitting / submitted / already-submitted (409) |

---

## UI Considerations

<!-- Populated by ui-consideration-probe (Step 9.5). IDEMPOTENT: this section replaces itself on re-run. -->

### E1 — QRScannerTab

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | Idle (no scan yet): camera live with animated corner frame; no result card shown |
| `loading` | resolved | explicit | Post-scan API call: result card area shows `"Checking in…"` text + spinner; camera stays live |
| `error` | resolved | explicit | Three error variants (duplicate / invalid / network) each have a persistent error card with title + sub; camera stays live |
| `populated` | resolved | explicit | Success: green result card with student name; auto-clears after 3s; toast fires simultaneously |
| `long-text` | resolved | explicit | Student name: `truncate` on result card (max card width 360px) |

### E2 — RosterTab

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | `EmptyState title="No registrations yet" sub="Students must register before being checked in."` |
| `loading` | resolved | backstop | TanStack Query loading: skeleton rows (`bg-white/5 h-14 rounded-xl animate-pulse`) — 4 placeholders |
| `error` | resolved | explicit | `addToast("Failed to load roster. Try again.", "error")` |
| `populated` | resolved | explicit | Each row shows name + status badge or "Check in" button |
| `zero-one-many` | resolved | explicit | 0 → EmptyState; 1 → single row; many → scrollable list; header stats bar always shows counts |
| `long-text` | resolved | explicit | Long student names: `truncate max-w-[240px]` on name cell |

### E3 — QRTicket (inline in My Registrations)

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | Renders nothing for waitlisted registrations or events that have ended |
| `loading` | dismissed | — | QR is derived from `registration.id` (already loaded with the registration list); no async load |
| `populated` | resolved | explicit | Upcoming confirmed: teal QR code + label. Already attended: `"Attended ✓"` badge replaces QR |

### E4 — EventTimeline

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | `EmptyState title="No activity yet" sub="Timeline events will appear here as the event progresses."` |
| `loading` | resolved | backstop | TanStack Query loading: 4 skeleton timeline entries (`bg-white/5 h-10 rounded-xl animate-pulse`) |
| `error` | resolved | explicit | `addToast("Failed to load timeline. Try again.", "error")` |
| `populated` | resolved | explicit | Entries sorted ascending by `at`; each with icon node + connector + description + timestamp |
| `zero-one-many` | resolved | explicit | 0 → EmptyState; 1 → single entry (connector hidden); many → full vertical list with connecting lines |
| `long-text` | resolved | explicit | Entry description: `line-clamp-2`; full text visible on row hover via `title` attr |

### E5 — ReimbursementPanel

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | No draft rows: `text-caption text-graytext-mid "No expenses yet — add rows above."` |
| `loading` | resolved | backstop | On submit: button shows `"Submitting…"` + spinner; rows disabled |
| `error` | resolved | explicit | Submit fails: `addToast("Submission failed. Try again.", "error")`; form re-enables |
| `partial` | resolved | explicit | Mix of filled and empty fields: submit blocked until social URL is filled; empty label/amount fields show placeholder |
| `populated` | resolved | explicit | Rows with data; total rendered below list; confirm dialog shows total |
| `overflow` | resolved | explicit | Many draft rows: panel is `max-h-[500px] overflow-y-auto` when expanded |
| `zero-one-many` | resolved | explicit | 0 → empty state text; 1 row → single row; many → scrollable list; confirm dialog says "N expense(s)" |
| `long-text` | resolved | explicit | Expense label: `truncate` on collapsed row; full text in expanded `Input` |

### E6 — ReflectionPanel

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | Both textareas show placeholders; auto-save fires only when at least one char is present |
| `loading` | resolved | explicit | Auto-save: inline `"Saving…"` fade text (per Phase 5 ScheduleRow pattern); no global spinner |
| `error` | resolved | explicit | Auto-save PATCH fails: `addToast("Failed to save reflection. Try again.", "error")`; last value retained |
| `partial` | resolved | explicit | Either textarea may be populated without the other; both are optional for draft save; Meetup Head submit requires at least one non-empty |
| `long-text` | resolved | explicit | Textareas are `resize-none` with `min-h-[96px]`; very long content scrolls within the textarea |

### E7 — FeedbackForm

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | No star selected: Submit button is `disabled`; comment textarea shows placeholder |
| `loading` | resolved | explicit | Submitting: Submit button shows spinner + `"Submitting…"` text; stars and textarea disabled |
| `error` | resolved | explicit | Submit fails (non-409): `addToast("Submission failed. Try again.", "error")`; form re-enables |
| `partial` | resolved | explicit | Star selected but no comment → submit enabled (comment optional) |
| `populated` | resolved | explicit | After submit: form replaced with success badge + rating text |
| `long-text` | resolved | explicit | Comment textarea: `min-h-[72px] max-h-[160px]` with `resize-none`; long comments scroll in box |

### Coverage Summary

- **Applicable:** 35
- **Resolved:** 33 (28 explicit, 5 backstop)
- **Unresolved:** 0 ✅

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|---|---|---|
| shadcn official | None — not initialized | not applicable |
| `@yudiel/react-qr-scanner` | Main scanner | npm package, not a shadcn block — registry vetting gate not applicable. Package source reviewed: no fetch/eval flags (live-verified in STACK.md during Phase 2) |
| `qrcode.react` | `<QRCodeSVG>` render | npm package — registry vetting gate not applicable. No network calls; pure client-side QR generation |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-08-18
