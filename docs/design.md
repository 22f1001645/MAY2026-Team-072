# Ekatva OS — Design System

Dev-facing component-level design system for the **Ekatva OS product** (`frontend/`, React 18 + Tailwind, dark-mode dashboard). Complements, doesn't replace:

- **`prod documents/EKATVA BRAND KIT & DESIGN SYSTEM.md`** — brand layer (colors, logo, photography, marketing tone). Shared across this app and the marketing site.
- **`ekatva-website/`** — the marketing site (Next.js). Richer motion vocabulary (WebGL orbital scenes, glassmorphism, shimmer CTAs, fluid `clamp()` type) appropriate for a one-time-visit landing experience. **This doc does not import that vocabulary wholesale** — Ekatva OS is a daily-use dashboard: data density, keyboard efficiency, and restraint win over spectacle. Where the two surfaces share a brand color or motion *principle* (ease curve, hover language), it's called out below; where they diverge, that's a deliberate choice, not an oversight.

## 1. Tokens

Source of truth: `frontend/tailwind.config.js`.

| Token | Value | Notes |
|---|---|---|
| `teal` | `#5CE6C9` | CTAs, links, active states |
| `teal-accent` | `#3FD4B6` | Hover state for teal |
| `teal-deep` | `#1F4F59` | Section headers, secondary buttons |
| `teal-grad` | `#0E2F36` | Gradient dark stop |
| `gold` | `#FFCF96` | Headings, celebration accents — never body text |
| `onyx` | `oklch(0.13 0.015 175)` (≈`#030907`) | Grounding background. **Teal-hued, not achromatic** — flat gray reads corporate/sterile, which the brand explicitly rejects. See brand kit §2. |
| `onyx-soft` | `#111111` | Text-on-light near-black |
| status: success / warn / danger | Emerald 400–500 / Amber 400 / Red 300–500 | Fixed semantic triad, soft bg (`/10–/15`) + border (`/25–/40`), never solid fill. Documented in brand kit §2 this session — was implemented consistently across 11 files but never written down. |

**Shape:** buttons/badges = pill (`rounded-full`), cards = 20px (`rounded-xl2`), inputs = 12px (`rounded-xl`).

**Motion easing:** one token, `ease-material` = `cubic-bezier(0.4, 0, 0.2, 1)`, used everywhere. Don't introduce a second easing curve without a documented reason — cohesion (one motion "voice") matters more than any single curve being theoretically better.

## 2. Motion rules

| Interaction | Property | Duration | Notes |
|---|---|---|---|
| Hover (buttons, cards, nav) | `transform`, `background-color`, `border-color`, `box-shadow` | 200ms | Use Tailwind's `transition` utility (curated property list), never `transition-all` — animating layout properties (`width`/`height`/`padding`) forces layout+paint; `transform`/`opacity` are compositor-only. |
| Press (`:active`) | `transform: scale()` | instant, same 200ms | Buttons: `scale(0.97)`. Cards (subtler, not a primary action): `scale(0.99)`. This didn't exist anywhere in the codebase before this session — every pressable element gave feedback only on hover, never confirming a press was registered. |
| Page content reveal | `opacity` + `translateY(20px→0)` | 500ms | `animate-fade-up`, already used on `<main>` |
| Loading spinner | `rotate` | 2.4s linear infinite | Mandala mark, `animate-spin-slow` |

**Reduced motion:** global `@media (prefers-reduced-motion: reduce)` in `index.css` collapses all animation/transition durations to ~0 and disables smooth scroll. This did not exist before this session — added because three independent design-quality passes (Apple HIG motion principles, Emil Kowalski's design-engineering checklist, and the UI/UX accessibility rule set) all flagged its absence independently. It's a floor, not a ceiling — reduced motion means gentler, not that state changes stop communicating (color/opacity still change).

## 3. Component states

`frontend/src/components/ui.tsx` primitives — every page composes these, none should hardcode competing button/card/input styles.

**Button** — variants `primary | secondary | ghost | danger`, sizes `sm | md | lg`.
States: default → hover (scale 1.02, lighten) → active (scale 0.97) → focus (2px teal ring) → disabled (40% opacity, cursor default, press feedback suppressed).

**Card** — `hover` prop toggles the interactive treatment (lift + border glow + press feedback). When `onClick` is also passed, the card is now a real keyboard-operable control: `role="button"`, `tabIndex={0}`, `Enter`/`Space` fire the click handler, and a `focus-visible` ring appears. Before this session it was a bare `<div onClick>` — invisible to keyboard users entirely (WCAG 2.1.1 failure). Non-interactive cards (no `onClick`) are unaffected — they're still plain containers.

**Badge** — `teal | gold | neutral | success | warn | danger` tones, all soft-bg + border, never solid. Non-interactive, no focus state needed.

**Input** — 2px teal focus ring (was 1px — inconsistent with every other focusable primitive; fixed to match).

**Toast** — `role="status" aria-live="polite" aria-atomic="true"` on the container, so screen readers announce success/error/info messages. This was entirely missing before this session — toasts were visually-only. Its entrance animation also referenced a Tailwind arbitrary keyframe (`slideInRight`) that was never defined anywhere in the codebase (confirmed via grep) — the animation was a silent no-op since the component was written. Now reuses the existing `fade-up` token (also fixes the cohesion issue of a one-off animation nobody else uses).

**Loading / ErrorState** (`states.tsx`) — on-brand empty/error treatments, already solid; no changes.

## 4. Accessibility checklist

Applies to every new component in this app:

- [ ] Icon-only buttons have `aria-label` (not just `title` — title isn't reliably exposed to assistive tech)
- [ ] Anything clickable that isn't a `<button>`/`<a>` gets `role="button"` + `tabIndex={0}` + `Enter`/`Space` handling, or — simpler and preferred — just use a `<button>`
- [ ] Focus-visible ring on every interactive element: `focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50`
- [ ] Live-region (`aria-live`) on anything that appears without user action (toasts, async validation messages)
- [ ] `prefers-reduced-motion` respected — this is now handled globally, don't re-introduce a JS-only animation that bypasses the CSS media query
- [ ] Color never the sole indicator (status badges pair color with text, not just a colored dot)

## 5. This session's audit — fixed vs. documented

Three design-quality lenses were run against `ui.tsx` / `Layout.tsx` / `states.tsx` / `tailwind.config.js`: Apple's HIG-derived fluid-interface principles, Emil Kowalski's design-engineering review checklist, and the UI/UX accessibility/interaction rule set. Findings, all fixed in this pass:

| Gap | Where | Fix |
|---|---|---|
| Toast entrance animation was a silent no-op (`slideInRight` keyframe never defined) | `ui.tsx` | Swapped to existing `fade-up` token |
| Toasts had no ARIA live region | `ui.tsx` | `role="status" aria-live="polite"` |
| Interactive `Card` not keyboard-operable | `ui.tsx` | `role="button" tabIndex={0}` + keydown + focus ring |
| No press (`:active`) feedback anywhere | `ui.tsx`, `Layout.tsx` | `active:scale-[0.97]` (buttons), `0.99` (cards) |
| `transition-all` used broadly (animates non-compositor properties) | `ui.tsx`, `Layout.tsx` | Swapped to Tailwind's curated `transition` utility |
| Input focus ring (1px) inconsistent with Button/Card (2px) | `ui.tsx` | Standardized to 2px |
| Global search result rows keyboard-inaccessible (`div onClick`) | `Layout.tsx` | Converted to `<button type="button">` |
| Notification bell + search-clear buttons had no `aria-label` | `Layout.tsx` | Added |
| No `prefers-reduced-motion` support anywhere in the app | `index.css` | Global media query added |

**Flagged, not auto-fixed** (judgment calls, left for a deliberate decision rather than a silent resize):

- **Touch target size** — the header icon buttons (notification bell, logout) are 36px/32px; the recommended minimum is 44×44px. Bumping this changes the sidebar header's visual balance, so it's a design decision, not a bug fix. Recommendation: bump both to `h-11 w-11` (44px) next time that header ships a visual pass.
- **Skeleton loading states** — pages currently show a spinner (`Loading`) for all TanStack Query loading states; skeleton placeholders (matching the eventual content's shape) reduce perceived latency and layout shift more than a spinner does. Worth a follow-up pass if a specific page's load time becomes a complaint, not a blanket rewrite today.
