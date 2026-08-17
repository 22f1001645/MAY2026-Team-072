import { safeExternalHref } from '../lib/format'
import type { SocialLink } from '../lib/types'
import { PLATFORM_LABELS } from './SocialLinksEditor'

/* The read render of an organisation's links — ORG-02, 04-UI-SPEC.md S5.
 *
 * This component receives only what the server vouches for. A link the read
 * filter refused never arrives here at all, and there is deliberately no prop
 * through which it could: the read view is a faithful picture of what the
 * server stands behind, and nothing else. Not shown-and-disabled, not greyed,
 * not struck through, not replaced by a placeholder, not counted, and reserving
 * no space. Telling a reader that a link they cannot have exists is an
 * invitation to ask for it, and the reader is exactly the party who must never
 * receive it.
 *
 * A manager in read mode therefore sees precisely what a reader sees. The one
 * disclosure a manager gets lives in the section header and in the editor,
 * where they can act on it — never here.
 *
 * `safeExternalHref` is layer 3 of ORG-02's defence: layer 1 is the server's
 * write gate and layer 2 the same predicate on the read path. It is still worth
 * six lines here, because React 18.3.1 only *warns* on a `javascript:` href —
 * it renders the attribute anyway, so React is not the boundary. */

const CHIP =
  'inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-[14px] text-teal hover:text-teal-accent hover:border-teal/40 transition duration-200 ease-material focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50'

/** The website chip is labelled with its host, which is the thing a reader
 *  actually checks before clicking — `Website` alone is uninformative and the
 *  full URL is not information anyone scans for. Parsing is safe here because
 *  the value already passed the server's read filter; the fallback exists so a
 *  label is never the raw URL even if it somehow did not. */
function hostLabel(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return PLATFORM_LABELS.website
  }
}

export function SocialLinksRow({ links, website }: { links: SocialLink[]; website: string | null }) {
  return (
    <div className="flex flex-wrap gap-2">
      {website && <Chip url={website} label={hostLabel(website)} />}
      {links.map((link) => (
        <Chip key={link.platform} url={link.url} label={PLATFORM_LABELS[link.platform] ?? link.platform} />
      ))}
    </div>
  )
}

function Chip({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={safeExternalHref(url)}
      target="_blank"
      rel="noopener noreferrer"
      title={url}
      className={CHIP}
    >
      <span className="min-w-0 break-all">{label}</span>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
        aria-hidden
      >
        <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
      </svg>
    </a>
  )
}
