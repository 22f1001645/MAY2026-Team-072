import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EkatvaEvent, ActivityScale } from '../lib/types'
import { CITIES } from '../lib/mock'
import { useEvents, useMyRegistrations } from '../lib/queries'
import { useSession } from '../lib/session'
import { Badge, Button, Card, Mandala } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cover, cx, daysUntil, formatDate, formatTime, scaleLabel } from '../lib/format'

export default function Discover() {
  const { city } = useSession()
  // Feed defaults to the student's city/region (FR-C4)
  const [activeCity, setActiveCity] = useState<string>(city)
  const [q, setQ] = useState('')
  const [activeScale, setActiveScale] = useState<ActivityScale | 'all'>('all')
  const [sortBy, setSortBy] = useState<'asc' | 'desc'>('asc')

  // Live city feed from the API (server-side city filter + client search)
  const { data: events = [], isLoading, isError, error } = useEvents(activeCity)
  const { data: regs = [] } = useMyRegistrations()

  const upcoming = useMemo(() => {
    let filtered = events.filter((e) => e.status === 'upcoming')
    
    if (q) {
      filtered = filtered.filter((e) => e.title.toLowerCase().includes(q.toLowerCase()))
    }
    
    if (activeScale !== 'all') {
      filtered = filtered.filter((e) => e.scale === activeScale)
    }
    
    return filtered.sort((a, b) => {
      const diff = +new Date(a.startsAt) - +new Date(b.startsAt)
      return sortBy === 'asc' ? diff : -diff
    })
  }, [events, q, activeScale, sortBy])

  return (
    <div>
      {/* Hero */}
      <section className="relative mb-9 overflow-hidden rounded-xl2 border border-white/5 bg-hero-gradient p-8 lg:p-12">
        <div className="grain absolute inset-0 rounded-xl2" />
        <div className="relative max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal/25 bg-teal/10 px-3 py-1 text-caption font-semibold text-teal">
            <Mandala size={16} /> What's happening near you
          </div>
          <h1 className="text-[36px] font-bold leading-[1.15] text-offwhite lg:text-hero">
            Your city, <span className="text-gold">in one place.</span>
          </h1>
          <p className="mt-3 max-w-[560px] text-body text-graytext-light">
            Scattered across a screen no more. Find the meetups, workshops and fests
            happening in {activeCity === 'All' ? 'your community' : activeCity} — and
            actually show up.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#feed">
              <Button size="lg">Browse events</Button>
            </a>
            <Link to="/leaderboard">
              <Button variant="secondary" size="lg">
                See the leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Filters */}
      <div id="feed" className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-h2 font-semibold text-gold">Upcoming near you</h2>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={activeScale}
            onChange={(e) => setActiveScale(e.target.value as ActivityScale | 'all')}
            className="rounded-full border border-white/8 bg-white/5 py-2 pl-4 pr-8 text-[13px] text-offwhite focus:border-teal/40 focus:outline-none appearance-none"
            style={{ background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23a1a1aa\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E") no-repeat right 0.75rem center/12px 12px, rgba(255, 255, 255, 0.05)' }}
          >
            <option value="all" className="bg-onyx">All Scales</option>
            <option value="local_meetup" className="bg-onyx">Local Meetup</option>
            <option value="regional_meetup" className="bg-onyx">Regional Meetup</option>
            <option value="regional_fest" className="bg-onyx">Regional Fest</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'asc' | 'desc')}
            className="rounded-full border border-white/8 bg-white/5 py-2 pl-4 pr-8 text-[13px] text-offwhite focus:border-teal/40 focus:outline-none appearance-none"
            style={{ background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23a1a1aa\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E") no-repeat right 0.75rem center/12px 12px, rgba(255, 255, 255, 0.05)' }}
          >
            <option value="asc" className="bg-onyx">Date: Soonest</option>
            <option value="desc" className="bg-onyx">Date: Furthest</option>
          </select>
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search events…"
              className="w-52 rounded-full border border-white/8 bg-white/5 py-2 pl-9 pr-4 text-[13px] text-offwhite placeholder:text-graytext-mid focus:border-teal/40 focus:outline-none"
            />
            <svg
              className="absolute left-3 top-2.5 text-graytext-mid"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3-3" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      {/* City chips */}
      <div className="mb-8 flex flex-wrap gap-2">
        {['All', ...CITIES.map((c) => c.name)].map((c) => (
          <button
            key={c}
            onClick={() => setActiveCity(c)}
            className={cx(
              'rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-300 ease-material',
              activeCity === c
                ? 'border-teal bg-teal text-onyx'
                : 'border-white/10 bg-white/5 text-graytext-light hover:border-teal/40 hover:text-offwhite',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Live states */}
      {isLoading && <Loading label="Loading events near you…" />}
      {isError && <ErrorState error={error} />}

      {/* Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {upcoming.map((e) => {
          const isRegistered = regs.some((r: any) => r.activity?.id === e.id)
          return (
            <Link key={e.id} to={`/events/${e.id}`}>
              <EventCard e={e} isRegistered={isRegistered} />
            </Link>
          )
        })}
      </div>

      {!isLoading && !isError && upcoming.length === 0 && (
        <Card className="p-12 text-center">
          <Mandala size={40} className="mx-auto mb-3 opacity-60" />
          <div className="text-h3 font-semibold text-offwhite">
            Nothing here yet in {activeCity}
          </div>
          <div className="mt-1 text-body text-graytext-light">
            Be the spark — an organiser can propose the first meetup for your city.
          </div>
        </Card>
      )}
    </div>
  )
}

function EventCard({ e, isRegistered }: { e: EkatvaEvent; isRegistered?: boolean }) {
  const nearlyFull = e.registered / e.capacity > 0.85
  return (
    <Card hover className="h-full overflow-hidden">
      <div
        className="relative flex h-32 items-end p-4"
        style={{ background: cover(e.cover) }}
      >
        <div className="grain absolute inset-0" />
        <div className="relative flex w-full items-center justify-between">
          <Badge tone="gold">{daysUntil(e.startsAt)}</Badge>
          {nearlyFull && <Badge tone="warn">Filling fast</Badge>}
        </div>
      </div>
      <div className="p-4">
        <div className="text-caption uppercase tracking-wider text-teal">
          {e.city} · {scaleLabel[e.scale]}
        </div>
        <div className="mt-1 line-clamp-2 text-h3 font-semibold text-offwhite">
          {e.title}
        </div>
        {e.tags && e.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {e.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-sm bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-graytext-mid">
                {t}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center gap-2 text-[13px] text-graytext-light">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 10h18" />
          </svg>
          {formatDate(e.startsAt)} · {formatTime(e.startsAt)}
        </div>
        <div className="mt-1 flex items-center gap-2 text-[13px] text-graytext-light">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {e.venue}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
          <span className="text-caption text-graytext-mid">
            {e.registered}/{e.capacity} going
          </span>
          {isRegistered ? (
            <Badge tone="success">Registered ✓</Badge>
          ) : (
            <span className="text-caption font-semibold text-teal">Register →</span>
          )}
        </div>
      </div>
    </Card>
  )
}
