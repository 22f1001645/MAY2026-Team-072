import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { EkatvaEvent } from '../lib/types'
import { CITIES } from '../lib/mock'
import { useEvents } from '../lib/queries'
import { useSession } from '../lib/session'
import { Badge, Button, Card, Mandala } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cover, cx, daysUntil, formatDate, formatTime, scaleLabel } from '../lib/format'

export default function Discover() {
  const { city } = useSession()
  // Feed defaults to the student's city/region (FR-C4)
  const [activeCity, setActiveCity] = useState<string>(city)
  const [q, setQ] = useState('')

  // Live city feed from the API (server-side city filter + client search)
  const { data: events = [], isLoading, isError, error } = useEvents(activeCity)

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => e.status === 'upcoming')
        .filter((e) => e.title.toLowerCase().includes(q.toLowerCase()))
        .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
    [events, q],
  )

  const featured = upcoming.find((e) => e.scale === 'regional_fest') ?? upcoming[0]
  const rest = upcoming.filter((e) => e.id !== featured?.id)

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

      {/* Featured */}
      {!isLoading && !isError && featured && (
        <Link to={`/events/${featured.id}`}>
          <Card hover className="mb-8 grid overflow-hidden md:grid-cols-2">
            <div
              className="relative min-h-[220px] p-6"
              style={{ background: cover(featured.cover) }}
            >
              <div className="grain absolute inset-0" />
              <div className="relative flex h-full flex-col justify-between">
                <Badge tone="gold">★ Featured · {scaleLabel[featured.scale]}</Badge>
                <div>
                  <div className="text-caption uppercase tracking-widest text-offwhite/70">
                    {featured.org}
                  </div>
                  <div className="mt-1 text-h2 font-bold text-offwhite">
                    {featured.title}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="mb-3 flex items-center gap-2 text-caption text-teal">
                <Badge tone="teal">{daysUntil(featured.startsAt)}</Badge>
                {featured.tags.map((t) => (
                  <Badge key={t}>{t}</Badge>
                ))}
              </div>
              <p className="text-body text-graytext-light">{featured.description}</p>
              <div className="mt-5 grid grid-cols-2 gap-4 text-[13px]">
                <Meta label="When" value={`${formatDate(featured.startsAt)} · ${formatTime(featured.startsAt)}`} />
                <Meta label="Where" value={featured.venue} />
                <Meta label="City" value={featured.city} />
                <Meta
                  label="Spots"
                  value={`${featured.registered}/${featured.capacity} filled`}
                />
              </div>
              <div className="mt-6">
                <Button>View & register →</Button>
              </div>
            </div>
          </Card>
        </Link>
      )}

      {/* Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((e) => (
          <Link key={e.id} to={`/events/${e.id}`}>
            <EventCard e={e} />
          </Link>
        ))}
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-caption uppercase tracking-wider text-graytext-mid">
        {label}
      </div>
      <div className="text-offwhite">{value}</div>
    </div>
  )
}

function EventCard({ e }: { e: EkatvaEvent }) {
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
          <span className="text-caption font-semibold text-teal">Register →</span>
        </div>
      </div>
    </Card>
  )
}
