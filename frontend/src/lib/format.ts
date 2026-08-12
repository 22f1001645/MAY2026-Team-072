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
