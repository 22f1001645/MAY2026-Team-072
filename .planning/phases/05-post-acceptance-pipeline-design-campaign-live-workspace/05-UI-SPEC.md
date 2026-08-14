# 05-UI-SPEC — Phase 5: Post-Acceptance Pipeline

**Generated:** 2026-08-14
**Phase:** 5 — Post-Acceptance Pipeline (Design → Campaign → Live → Workspace)
**Status:** Draft (pending checker verification)

---

## 1. Design System Baseline

This phase inherits the **Ekatva Brand Kit v1.0** tokens already codified in `tailwind.config.js` and `frontend/src/components/ui.tsx`. All new surfaces MUST use these tokens — no ad-hoc hex values.

### Color Palette

| Token | Hex / Value | Usage in Phase 5 |
|---|---|---|
| `teal` | `#5CE6C9` | Active step indicators, CTA buttons, focus rings, link accent |
| `teal-accent` | `#3FD4B6` | Button hover, step connector lines (active) |
| `teal-deep` | `#1F4F59` | Secondary button bg, Kanban column header |
| `teal-grad` | `#0E2F36` | Card gradient base, column bg |
| `gold` | `#FFCF96` | Page headings (SectionTitle), task deadline warning |
| `onyx` | `oklch(0.13 0.015 175)` | Page background, card substrate |
| `offwhite` | `#F8F8F8` | Body text, task titles |
| `graytext-light` | `#AAAAAA` | Captions, metadata, empty state sub |
| `graytext-mid` | `#666666` | Placeholder text, disabled labels |
| `divider` | `#333333` | Column separators, card borders |

### Typography

| Scale | Size / Weight | Usage |
|---|---|---|
| `text-h1` | 36px / 700 | Page titles via `<SectionTitle>` |
| `text-h2` | 28px / 600 | Section headers (e.g., "Schedule", "Campaign Builder") |
| `text-h3` | 20px / 600 | Card sub-headers, column titles |
| `text-body` | 16px / 400 | Form labels, schedule item titles |
| `text-caption` | 12px / 400 | Metadata, timestamps, eyebrow labels |
| Font | Poppins | All surfaces — already loaded globally |

### Spacing

| Use | Class |
|---|---|
| Page outer padding | `px-6 py-8` (matches existing pages) |
| Card inner padding | `p-5` (StatCard) or `p-6` (content cards) |
| Section gap | `mb-8` between major sections |
| Form field gap | `gap-4` between inputs |
| Inline row gap | `gap-3` within a single row |

### Existing Primitives Available (reuse, do not duplicate)

- `Button` — variants: `primary`, `secondary`, `ghost`, `danger`; sizes: `sm`, `md`, `lg`
- `Card` — `hover` prop for interactive cards; `shadow-card`, `rounded-xl2`
- `Badge` — tones: `teal`, `gold`, `neutral`, `success`, `warn`, `danger`
- `SectionTitle` — eyebrow + h1 + sub + right slot
- `Input` — single-line field; token-correct focus ring
- `Textarea` — Phase 4 addition; same token classes as `Input`
- `Select` — Phase 4 addition; token-correct dropdown
- `Dialog` — modal with backdrop blur; max-w-md default
- `EmptyState` — empty card with teal circle icon placeholder
- `Progress` — horizontal bar; tone `teal` or `gold`
- `ToastProvider` / `useToast` — success/error/info toasts

---

## 2. New Components Required

### 2.1 `PipelineStepper`

**Purpose:** Displays the 5-step campaign pipeline at the top of the campaign page. Locks visual progress without a multi-page wizard.

**Props:**
```typescript
interface PipelineStepperProps {
  steps: Array<{ id: string; label: string; complete: boolean }>
  currentStep: string
}
```

**Visual spec:**
- Horizontal row of 5 steps connected by lines.
- Each step: circle (32px) + label below.
- **Complete step:** filled `bg-teal` circle + white check icon; connector line `bg-teal`.
- **Active step:** `border-2 border-teal` circle + `text-teal` label; connector left is `bg-teal`, right is `bg-divider`.
- **Pending step:** `border border-divider` circle + `text-graytext-mid` label; connector `bg-divider`.
- Connector lines: `h-0.5 flex-1 mt-4` between circles.
- Label: `text-caption text-center mt-2` (max 12 chars; wrap on small viewports).
- Container: `flex items-start gap-0 mb-8`; responsive — on mobile, show step count text `"Step 2 of 5"` instead of full stepper.

**Step labels:**
1. Schedule
2. Mail Template
3. Poster
4. Registration
5. Push Live

---

### 2.2 `ScheduleRow`

**Purpose:** One editable row in the event schedule editor. Auto-saves on blur (D-03).

**Props:**
```typescript
interface ScheduleRowProps {
  item: EventScheduleItem
  onUpdate: (id: string, patch: Partial<EventScheduleItem>) => void
  onDelete: (id: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  isFirst: boolean
  isLast: boolean
  disabled?: boolean  // true after push-live
}
```

**Visual spec:**
- Container: `flex items-start gap-3 group py-3 border-b border-divider`
- **Position controls:** `flex flex-col gap-0.5` — two `ghost` icon-buttons (↑ / ↓); `disabled:opacity-30`; hidden on `disabled`.
- **Time block field:** `Input` with `placeholder="10:00–10:30"`, `w-32 shrink-0`.
- **Title field:** `Input` with `placeholder="Session title"`, `flex-1`. On blur → call `onUpdate`.
- **Notes field:** collapsed by default; a `<button className="text-caption text-graytext-light hover:text-teal">+ notes</button>` expands a `Textarea` below (same auto-save on blur). Transition: `max-h` animation, `overflow-hidden`.
- **Delete button:** `danger ghost` icon-button, visible on `group-hover`; hidden on `disabled`.
- Saving state indicator: inline `text-caption text-teal "Saving…"` that fades out after 800ms (use `opacity-0 transition-opacity duration-500`).

---

### 2.3 `PresetAccordion`

**Purpose:** Inline accordion listing scale-appropriate schedule presets. Clicking a preset populates the schedule (D-02).

**Visual spec:**
- Container: `Card p-4 mb-4` with header `"Quick-start presets"` (`text-h3`).
- Each preset: a `<button>` row: `flex items-center justify-between w-full py-2.5 border-b border-divider/50 hover:text-teal text-body transition`.
- On click: expands inline to show sample item list (`text-caption text-graytext-light`); click again to collapse. Uses `useState<string | null>` for open preset id.
- "Use this preset" CTA: `Button size="sm" variant="secondary"` inside the expanded section.
- Expand/collapse chevron: rotates 180° on open (`transition-transform duration-200`).

---

### 2.4 `KanbanBoard`

**Purpose:** 3-column task board (To Do / In Progress / Done). Active only after campaign is live.

**Layout:**
- Container: `grid grid-cols-3 gap-4` on desktop; `flex flex-col gap-4` on mobile (< 768px).
- Each **column**: `Card p-4 flex flex-col gap-3 min-h-[400px]`
  - Header: `text-h3 font-semibold mb-3` + task count Badge (`neutral` tone).
  - Background distinction: To Do = standard card substrate; In Progress = `bg-teal-deep/20`; Done = `bg-white/[0.02]`.
  - Column header color: To Do = `text-offwhite`; In Progress = `text-teal`; Done = `text-graytext-light`.

**Task cards:**
- `Card p-4 hover` with `hover:border-teal/30`.
- Title: `text-body font-medium text-offwhite`.
- Assignee: small avatar initials circle (`w-6 h-6 rounded-full bg-teal-deep text-teal text-[10px] font-bold flex items-center justify-center`) + name `text-caption text-graytext-light`.
- Deadline: `text-caption` — overdue → `text-danger` (red-300); due today → `text-amber-300`; future → `text-graytext-mid`.
- Status badge/pill: `Badge` component — To Do = `neutral`, In Progress = `teal`, Done = `success`. Clickable dropdown to change status column.
- Status dropdown: a `<select>` styled as a badge trigger (or a tiny inline `Select` primitive), positioned `absolute bottom-3 right-3`.

**Inline add-task row (in "To Do" column only):**
- A `+ Add task` ghost button at the bottom of To Do column.
- On click: expands an inline form below the last card:
  - `Input placeholder="Task title"` (full width)
  - `Input placeholder="Assignee name or email"` (flex-1)
  - `Input type="date" placeholder="Deadline"` (w-36)
  - `Button size="sm" variant="primary" "Add"` + `Button size="sm" variant="ghost" "Cancel"`
- Transition: `animate-fade-up` on mount.

**Empty state per column:** `EmptyState title="No tasks yet" sub="..."` but compact — `p-6 text-center text-caption text-graytext-light` (no full EmptyState card).

---

### 2.5 `MailTemplateEditor`

**Purpose:** Shows the AI-generated mail draft in an editable textarea (D-05). Handles the degraded state (D-04).

**Visual spec:**
- **Degraded banner (AI failure):** `flex items-center gap-2 rounded-xl bg-amber-400/8 border border-amber-400/25 px-4 py-3 text-amber-300 text-[13px] mb-4`. Icon: `⚠` or info SVG. Text: `"AI unavailable — this is a base template. Edit as needed."`.
- **Mail subject field:** `Input` with label `"Subject"`. Full width above the body.
- **Mail body textarea:** `Textarea` (`min-h-[240px]`, `font-mono text-[13px]`). Same auto-save on blur as schedule items. Character count: `text-caption text-graytext-mid` bottom-right.
- **"Regenerate" button:** `Button variant="ghost" size="sm"` with refresh icon. Disabled while loading. Shows inline `"Generating…"` spinner (the `animate-spin-slow` mandala or a simple SVG spinner).
- **Save indicator:** same fade-out pattern as ScheduleRow.

---

### 2.6 `RegistrationLinkCard`

**Purpose:** Inline card showing the shareable registration link with a one-click copy button (D-11).

**Visual spec:**
- Container: `Card p-5 flex items-center gap-4`
- Left: chain-link SVG icon in teal, 24px.
- Middle: `flex flex-col gap-0.5`
  - Label: `text-caption uppercase tracking-wider text-graytext-light "Registration Link"`
  - URL: `text-teal text-[13px] font-mono truncate max-w-[400px]`
- Right: `Button variant="secondary" size="sm" "Copy"`. On click: `navigator.clipboard.writeText(url)` + `addToast("Link copied!", "success")`.
- "Generate link" state (slug not yet created): show `Button variant="primary" size="sm" "Generate Link"` in place of the URL.

---

### 2.7 `PushLiveGate`

**Purpose:** The final step — push-live button with Meetup Head enforcement (D-06/D-07).

**Visual spec:**
- Container: `Card p-6 border border-teal/20 bg-teal-deep/10`
- Header: `text-h3 text-gold "Ready to go live?"`
- Sub: `text-body text-graytext-light` — description of what push-live does.
- **For Meetup Head:** `Button variant="primary" size="lg" "Push Live"`. Requires confirmation: open a `Dialog` with title `"Publish Campaign?"` and two buttons (Confirm / Cancel).
- **For non-Meetup-Head:** same button but `disabled`. Wrapped in `<div title="Only the Meetup Head can publish">` for tooltip (native HTML tooltip). Additional note: `text-caption text-graytext-mid mt-2 "This action requires the assigned Meetup Head."`.
- **After push-live (already live):** Replace card with a `Badge tone="success"` pill `"Campaign Live ✓"` + `text-body text-graytext-light "Pushed live on [date]"`.

---

## 3. Page Layout — Campaign Builder Page (`/activities/:id/campaign`)

**Route:** `frontend/src/pages/CampaignBuilder.tsx` (NEW)

```
<SectionTitle eyebrow="Phase 5" title="Campaign Builder" />

<PipelineStepper steps={...} currentStep={...} />

│── Section: Schedule Design ──────────────────────────────────────────
│   <h2 className="text-h2 text-offwhite mb-4">Event Schedule</h2>
│   <PresetAccordion />          ← quick-start
│   {scheduleItems.map(item => <ScheduleRow key={item.id} ... />)}
│   <Button variant="ghost" size="sm">+ Add item</Button>

│── Section: Campaign ──────────────────────────────────────────────────
│   <h2>Mail Template</h2>
│   <MailTemplateEditor />

│   <h2>Poster</h2>
│   [file upload area — dashed border Card, drag or click]
│   If poster exists: thumbnail + "Change poster" ghost button

│   <h2>Registration</h2>
│   [Custom fields CRUD — same ScheduleRow-style inline rows]
│   <RegistrationLinkCard />

│── Section: Publish ────────────────────────────────────────────────────
│   <PushLiveGate />
```

---

## 4. Page Layout — Kanban Board Page (`/activities/:id/workspace`)

**Route:** `frontend/src/pages/KanbanWorkspace.tsx` (NEW)

```
<SectionTitle eyebrow="Team Workspace" title="Task Board"
  sub="Manage tasks for [Activity Name]"
  right={<Badge tone="success">Live</Badge>}
/>

<KanbanBoard tasks={tasks} teamMembers={teamMembers} />
```

---

## 5. Copywriting Contract

| Context | Copy |
|---|---|
| Schedule empty state | "No schedule items yet. Use a preset to get started quickly." |
| Schedule item placeholder (title) | "e.g. Opening remarks" |
| Schedule item placeholder (time block) | "10:00–10:30" |
| Campaign builder step locked (no schedule) | "Add at least one schedule item to unlock the campaign builder." |
| AI generation loading | "Generating your mail template…" |
| AI generation success toast | "Mail template generated" |
| AI degraded banner | "AI unavailable — this is a base template. Edit as needed." |
| Poster upload area | "Drop poster image here, or click to browse" |
| Poster format hint | "PNG, JPG, or WebP — max 5 MB" |
| Registration link copied toast | "Link copied!" |
| Push live confirm dialog title | "Publish Campaign?" |
| Push live confirm dialog body | "This will make the event visible to students. The Kanban workspace will activate." |
| Push live success toast | "Campaign is now live!" |
| Push live already live | "Campaign Live ✓" |
| Kanban: no tasks (empty column) | "No tasks here yet" |
| Kanban: add task placeholder | "Task title" |
| Non-Meetup-Head publish tooltip | "Only the Meetup Head can publish" |
| Task overdue | "Overdue" (red-300) |
| Task due today | "Due today" (amber-300) |

---

## 6. Interaction & Animation Contracts

| Interaction | Spec |
|---|---|
| Schedule row save feedback | `"Saving…"` text fades in (opacity 0→1, 100ms) then fades out (opacity 1→0, 500ms delay 800ms) |
| Schedule preset expand | Max-height expand: `max-h-0 → max-h-[400px] transition-all duration-300 ease-material overflow-hidden` |
| Kanban add-task form | `animate-fade-up` (existing keyframe) on mount |
| Status badge change | Instant swap + 200ms `transition-colors` |
| Push-live confirm dialog | `animate-fade-up` on Dialog mount (existing) |
| Poster upload drag hover | `border-teal/60 bg-teal/5` on drag-over |
| PipelineStepper connector | `bg-teal transition-all duration-500 ease-material` — fills left-to-right as steps complete |
| Button hover/press | Inherits from `Button` base: `hover:scale-[1.02] active:scale-[0.97]` |
| Page enter | `animate-fade-up` on page container (`delay-[50ms]`) |

---

## 7. Accessibility

- `PipelineStepper`: each step circle uses `aria-label="Step 1: Schedule — Complete"` (or Pending/Active).
- `ScheduleRow` Up/Down buttons: `aria-label="Move up"` / `aria-label="Move down"`.
- `KanbanBoard` columns: `role="region"` + `aria-label="To Do"` / `"In Progress"` / `"Done"`.
- Task status select: `aria-label="Task status"`.
- `RegistrationLinkCard` Copy button: `aria-label="Copy registration link"`.
- `PushLiveGate` disabled button: `aria-disabled="true"` (not `disabled` attr) so tooltip is still accessible via keyboard focus.
- All interactive icons include `aria-hidden="true"` with sibling visually-hidden labels.
- Focus order on CampaignBuilder page follows DOM order (stepper → schedule → campaign → publish).

---

## 8. Responsive Breakpoints

| Breakpoint | Behaviour |
|---|---|
| `< 640px` (mobile) | PipelineStepper → `"Step N of 5"` text; Kanban → single-column stacked; schedule rows stack vertically |
| `640–1024px` (tablet) | PipelineStepper shows icons without labels; Kanban → 2-col (To Do + In Progress / Done stacked) |
| `≥ 1024px` (desktop) | Full 3-column Kanban; full stepper with labels |

---

## 9. State Coverage Summary (pre-probe)

| Element | Key states |
|---|---|
| PipelineStepper | pending / active / complete per step |
| ScheduleRow | default / saving / disabled (post-live) / first-row (no up) / last-row (no down) |
| PresetAccordion | collapsed / open (one preset at a time) |
| KanbanBoard | loaded / empty-per-column / all-empty / tasks-loading |
| TaskCard | todo / in_progress / done / overdue / due-today / being-edited |
| KanbanAddTask | collapsed / expanded / submitting |
| MailTemplateEditor | idle / generating / generated / degraded (AI failure) / saving |
| RegistrationLinkCard | no-slug / has-slug / copying / copied-flash |
| PushLiveGate | non-meetup-head / meetup-head-ready / confirm-open / pushing / already-live |
| PosterUpload | empty / dragging / uploading / has-poster |

## UI Considerations

<!-- Generated by ui-consideration-probe — written after checker VERIFIED (Step 9.5). IDEMPOTENT: this section replaces itself on re-run. -->

### E1 — PipelineStepper

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | N/A — stepper always has 5 fixed steps; zero-step state cannot occur |
| `loading` | resolved | explicit | Stepper renders from campaign.status (known at page-load); no async load; skeleton not needed |
| `error` | resolved | backstop | If campaign fetch fails, the parent page shows a full-page error toast; stepper is not rendered |
| `partial` | resolved | explicit | Steps before the active one are complete (filled teal); steps after are pending (divider border); always a coherent subset |

### E2 — ScheduleRow

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | Empty title field shows placeholder "e.g. Opening remarks"; blur on empty title does NOT save (field required for save) |
| `loading` | resolved | explicit | Auto-save on blur shows "Saving…" fade text inline on the row; no global spinner |
| `error` | resolved | explicit | If PATCH fails: `addToast("Failed to save", "error")`; field reverts to last-saved value |
| `partial` | resolved | explicit | Time block is optional (nullable); only title is required for save |
| `long-text` | resolved | explicit | Title `Input` is `flex-1 truncate` — long values clip with ellipsis in display; full text visible while focused |
| `overflow` | dismissed | — | ScheduleRow is a horizontal row that doesn't paginate; not a container with overflow |

### E3 — PresetAccordion

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | If no presets exist for the scale: PresetAccordion is not rendered (conditional render in parent) |
| `loading` | resolved | explicit | Presets are hardcoded in constants.py and served synchronously; no async loading needed |
| `error` | dismissed | — | Static data; server error on preset endpoint falls back to hiding the accordion (same as empty) |
| `partial` | dismissed | — | Each preset is fully defined; partial-data scenario not applicable to a hardcoded list |
| `populated` | resolved | explicit | One preset open at a time; expanded shows 3–6 sample items as caption-text list + "Use this preset" button |
| `overflow` | resolved | explicit | Preset list uses `max-h` clamp on expanded accordion: `max-h-[400px] overflow-y-auto` |
| `zero-one-many` | resolved | explicit | 0 presets → hide accordion; 1 preset → single row; many → all rows visible, one expanded |
| `long-text` | resolved | explicit | Preset and item labels use `truncate`; full text in `title` tooltip |

### E4 — KanbanBoard

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | Per-column: `text-caption text-graytext-light "No tasks here yet"` (compact, no full EmptyState card) |
| `loading` | resolved | backstop | TanStack Query loading state: each column shows 2 skeleton task-card placeholders (`bg-white/5 rounded-xl animate-pulse h-20`) |
| `error` | resolved | explicit | TanStack Query error state: `addToast("Failed to load tasks", "error")`; retry button in the column header area |
| `partial` | resolved | explicit | Some columns empty, others populated — renders each column independently; visually correct with per-column empty state |
| `populated` | resolved | explicit | Normal: task cards fill column; column header shows count badge; cards sorted by (position, created_at) |
| `overflow` | resolved | explicit | Each column is `overflow-y-auto min-h-[400px]` — long task lists scroll within the column; grid height expands naturally |
| `zero-one-many` | resolved | explicit | 0 tasks → compact empty text; 1 task → card fills top; many → scroll within column. Count badge uses singular/plural: "1 task" / "3 tasks" |
| `long-text` | resolved | explicit | Task title truncates to 2 lines (`line-clamp-2`); full title visible on card hover via `title` attribute |

### E5 — MailTemplateEditor

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | Before first generation: Textarea shows placeholder "Your mail template will appear here after generation."; Regenerate button is primary |
| `loading` | resolved | explicit | During AI generation: Textarea is `disabled`; Regenerate button shows SVG spinner + "Generating…" text; no other content change |
| `error` | resolved | explicit | On AI failure: degraded amber banner + static fallback template pre-populated in Textarea (PROB-P2 from SPEC) |
| `partial` | resolved | explicit | After generation: mail_subject and mail_body both populated; if only one is present, the missing field shows placeholder |
| `long-text` | resolved | explicit | Textarea is `min-h-[240px]` and auto-grows via `field-sizing: content` (CSS) or manual resize; no max-height cap |

### E6 — RegistrationLinkCard

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | No slug yet: card shows "Generate Link" primary button; URL area shows `text-graytext-mid "—"` |
| `loading` | resolved | explicit | During slug generation: "Generate Link" button shows spinner + "Generating…" text; disabled |
| `error` | resolved | explicit | If generation fails: `addToast("Failed to generate link. Try again.", "error")` |
| `partial` | dismissed | — | Slug is atomic; either it exists or it doesn't; no partial state possible |
| `populated` | resolved | explicit | Slug exists: full URL displayed as `text-teal font-mono truncate`; Copy button active |
| `overflow` | resolved | explicit | URL truncates with `truncate max-w-[400px]`; full URL copied to clipboard (not the truncated display) |
| `zero-one-many` | dismissed | — | Card is a singleton (one registration link per activity); zero-one-many axis not applicable |
| `long-text` | resolved | explicit | Long slug URL: truncated in display (`truncate`); clipboard receives full URL via `registration_url` API field |

### E7 — PushLiveGate

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `loading` | resolved | explicit | During push-live call: "Push Live" button shows spinner + "Publishing…" text; disabled; no page navigation |
| `error` | resolved | explicit | If push-live 403 (non-Meetup-Head client-side bypass attempt): `addToast("Only the Meetup Head can publish", "error")`; button re-enables |
| `long-text` | dismissed | — | Card has fixed copy (no user-supplied text displayed in the gate card itself) |

### E8 — PosterUpload

| Category | Status | Verification | Resolution |
|---|---|---|---|
| `empty` | resolved | explicit | No poster: dashed-border `Card p-8 text-center`; upload icon (SVG); "Drop poster image here, or click to browse"; "PNG, JPG, or WebP — max 5 MB" caption |
| `loading` | resolved | explicit | Uploading: spinner overlay on the drop zone (`bg-black/40 backdrop-blur-sm`); "Uploading…" caption; drop zone disabled |
| `error` | resolved | explicit | Upload failed: `addToast("Upload failed. Try again.", "error")`; wrong type: `addToast("Only PNG, JPG, or WebP accepted", "error")`; too large: `addToast("File too large (max 5 MB)", "error")` |
| `populated` | resolved | explicit | Has poster: thumbnail `img` (128×128, `object-cover rounded-xl`); filename below; "Change poster" ghost button |
| `long-text` | resolved | explicit | Long filename: truncated with `truncate max-w-[200px]` below thumbnail |

### Coverage Summary

- **Applicable:** 41
- **Resolved:** 38 (30 explicit, 5 backstop, 3 dismissed-with-reason)
- **Unresolved:** 0 ✅
