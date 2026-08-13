import { useState } from 'react'
import { HOUSE_META } from '../pages/Orgs'
import { cx } from '../lib/format'

/* The single logo renderer (04-UI-SPEC.md S3, S8).
 *
 * Every logo in the app goes through this component, including the two
 * /admin/orgs call sites. It owns the whole fallback ladder and the
 * broken-image path, and it is the only place `HOUSE_META` is consulted.
 *
 * The ladder resolves top-down and the order is the contract:
 *   1. org.logoUrl                        — the uploaded file. Real data wins.
 *   2. HOUSE_META[org.name]?.imageLogo    — the seeded /houses/*.png mark.
 *   3. HOUSE_META[org.name]?.logo         — the emoji glyph.
 *   4. an initials monogram.
 * Rungs 2 and 3 are eligible only for `type === 'house'` on an exact name
 * match. Every organisation reaches a rung; there is no fifth state, and **a
 * broken-image glyph is never a state of this component** — each <img> rung
 * carries an onError that advances the ladder by one and re-renders.
 *
 * The component consumes an already-absolute `logoUrl`: `adaptOrganisation` in
 * lib/api.ts resolved it against the API base exactly once, so nothing here
 * concatenates a base URL. */

export type Rung = 1 | 2 | 3 | 4

/** Just the fields the ladder reads — so a bare `/orgs` row and a full
 *  `OrgProfile` are both acceptable without a cast at the call site. */
export interface LogoOrg {
  name: string
  type: string
  logoUrl?: string | null
}

/** Which rung renders, given a floor to start from.
 *
 *  `from` is what makes one function serve two callers: the component passes
 *  its current floor (advanced by each failed image), and the Remove-logo
 *  dialog passes 2 to ask "what would this organisation fall back to?" so its
 *  copy names the true outcome rather than guessing. */
export function resolveRung(org: LogoOrg, from: Rung = 1): Rung {
  const meta = org.type === 'house' ? HOUSE_META[org.name] : undefined
  if (from <= 1 && org.logoUrl) return 1
  if (from <= 2 && meta?.imageLogo) return 2
  if (from <= 3 && meta?.logo) return 3
  return 4
}

/** The first letter of up to two words, uppercased. A single-word name yields
 *  one character — the monogram never grows past two. */
export function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()
}

export function OrgLogo({
  org,
  size,
  previewUrl,
  onLogoLoadError,
  className,
}: {
  org: LogoOrg
  size: 40 | 80
  /** An object URL for a file chosen but not yet stored. Renders as rung 1 on
   *  a neutral tile, and is never the tile's persisted state. */
  previewUrl?: string | null
  /** Fires only when an **uploaded** logo fails to load. A reader cannot act on
   *  a missing file, so the ladder just advances; a manager in edit mode is the
   *  only one told, and this is how the Profile card learns. */
  onLogoLoadError?: () => void
  className?: string
}) {
  // Resetting the floor during render rather than in an effect: an effect would
  // paint one frame of the old rung against the new logo — visible as a flash
  // of the House mark the instant an upload lands.
  const identity = `${org.name}|${org.logoUrl ?? ''}`
  const [floorFor, setFloorFor] = useState<{ identity: string; floor: Rung }>({ identity, floor: 1 })
  if (floorFor.identity !== identity) setFloorFor({ identity, floor: 1 })
  const floor = floorFor.identity === identity ? floorFor.floor : 1

  const meta = org.type === 'house' ? HOUSE_META[org.name] : undefined
  const rung: Rung = previewUrl ? 1 : resolveRung(org, floor)
  const fall = (to: Rung) => setFloorFor({ identity, floor: to })

  const box =
    size === 40
      ? 'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[18px] overflow-hidden'
      : 'grid h-20 w-20 shrink-0 place-items-center rounded-2xl text-[36px] shadow-lg overflow-hidden'

  // The tint follows the rung that actually rendered. Uploaded artwork carries
  // its own colour, so a house tint behind it would produce a pairing the
  // uploader never chose; rungs 2 and 3 keep the seeded tint exactly as it is
  // on /admin/orgs today.
  const tinted = (rung === 2 || rung === 3) && !!meta
  const tint = tinted
    ? size === 40
      ? { background: `${meta!.color}18`, color: meta!.color }
      : { background: `${meta!.color}20`, color: meta!.color, border: `1px solid ${meta!.color}40` }
    : undefined
  const neutral = rung === 4 ? 'bg-white/[0.06]' : 'bg-white/[0.04] border border-white/10'

  return (
    <div className={cx(box, !tinted && neutral, className)} style={tint}>
      {rung === 1 && (
        <img
          src={previewUrl ?? org.logoUrl ?? ''}
          alt={`${org.name} logo`}
          className="h-full w-full object-cover"
          onError={() => {
            if (previewUrl) return
            onLogoLoadError?.()
            fall(2)
          }}
        />
      )}
      {rung === 2 && (
        <img
          src={meta!.imageLogo}
          alt={`${org.name} logo`}
          className="h-full w-full object-cover"
          onError={() => fall(3)}
        />
      )}
      {/* Rungs 3 and 4 are decorative text inside a tile that sits beside the
          organisation's name — a screen reader should hear the name once. */}
      {rung === 3 && <span aria-hidden>{meta!.logo}</span>}
      {rung === 4 && (
        <span
          aria-hidden
          className={cx('font-semibold text-graytext-light', size === 80 && 'text-[28px]')}
        >
          {initialsOf(org.name)}
        </span>
      )}
    </div>
  )
}
