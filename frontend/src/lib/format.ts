// Cover gradient keys → on-brand gradients (blend, never contrast — Brand Kit §1)
export const COVERS: Record<string, string> = {
  fest: 'linear-gradient(135deg,#1F4F59 0%,#0E2F36 55%,oklch(0.13 0.015 175) 100%)', // ends in Oneness Black
  evening: 'linear-gradient(135deg,#3FD4B6 0%,#1F4F59 60%,#0E2F36 100%)',
  studio: 'linear-gradient(135deg,#0E2F36 0%,#1F4F59 60%,#5CE6C9 130%)',
  trek: 'linear-gradient(135deg,#1F4F59 0%,#0E2F36 60%,#111111 100%)',
  coffee: 'linear-gradient(135deg,#0E2F36 0%,#1F4F59 70%,#3FD4B6 140%)',
}

export const cover = (key: string) => COVERS[key] ?? COVERS.fest

// Gradient straight from an activity scale (for raw API summaries without a cover key)
export function coverForScale(scale: string): string {
  const map: Record<string, string> = {
    regional_fest: 'fest',
    regional_meetup: 'trek',
    local_meetup: 'evening',
  }
  return cover(map[scale] ?? 'fest')
}

export const scaleLabel: Record<string, string> = {
  local_meetup: 'Local meetup',
  regional_meetup: 'Regional meetup',
  regional_fest: 'Regional fest',
}

// Capacity-range + funding copy per activity scale, for the New Proposal wizard's
// scale cards. Mirrors backend/app/constants.py's CAPACITY_RANGES — regional_fest
// is the sponsor-funded/budget-exempt tier (BUDGET_ABSOLUTE_CEILING comment), not
// regional_meetup, which is why the badge lives there.
export const scaleMeta: Record<string, { range: string; badge?: string }> = {
  local_meetup: { range: '30–50 people' },
  regional_meetup: { range: '75–100 people' },
  regional_fest: { range: '230+ people', badge: 'sponsor-funded' },
}

export function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function daysUntil(iso: string) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const d = new Date(iso)
  d.setHours(0, 0, 0, 0)
  const diff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Past'
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return `In ${diff} days`
}

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ')
}

/** Return `url` when it is safe to put in an `href`, otherwise `undefined`.
 *
 *  Layer 3 of ORG-02's three-layer defence. Layer 1 is the server's write gate
 *  and layer 2 is the same predicate on the read path; this is the last one,
 *  and it exists because **React 18.3.1 only *warns* on a `javascript:` href —
 *  it still renders the attribute.** React is not the security boundary here.
 *  Returning `undefined` makes React omit `href` entirely, so the element
 *  renders as inert text rather than as a live XSS sink.
 *
 *  Parsing goes through the platform's own `URL`, never a regex or a string
 *  split: every bypass this refuses is a parser differential, and a hand-rolled
 *  parser reintroduces the gap by construction. Only `http:` and `https:` are
 *  accepted (`URL` lowercases the protocol, so `JavaScript:` is caught too),
 *  and a scheme-relative `//host/x` or a site-relative `/x` throws without a
 *  base and is refused with everything else that throws.
 *
 *  The **original** string comes back on acceptance, not `parsed.href` — the
 *  server already normalised what it stored, and re-serialising client-side
 *  would show the reader something other than what was saved. */
export function safeExternalHref(url?: string | null): string | undefined {
  if (!url) return undefined
  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}

export function googleCalendarLink(event: { title: string; startsAt: string; venue: string; description?: string }) {
  const start = new Date(event.startsAt)
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '')

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGCalDate(start)}/${formatGCalDate(end)}`,
    details: event.description || '',
    location: event.venue,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function googleCalendarDayLink(startsAt: string) {
  const date = new Date(startsAt)
  const yyyy = date.getFullYear()
  const mm = date.getMonth() + 1
  const dd = date.getDate()
  return `https://calendar.google.com/calendar/u/0/r/day/${yyyy}/${mm}/${dd}`
}
