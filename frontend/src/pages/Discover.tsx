import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useEvents, useMyRegistrations, useCities } from '../lib/queries'
import { Badge, Button, Card, Mandala } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cover, scaleLabel, daysUntil, cx, formatDate, formatTime } from '../lib/format'
import { EkatvaEvent } from '../lib/types'
import { useSession } from '../lib/session'
import CitySelector from '../components/CitySelector'

export default function Discover() {
  const { data: events = [], isLoading, isError, error } = useEvents()
  const { data: regs = [] } = useMyRegistrations()
  const { data: CITIES = [] } = useCities()
  const { city: userCity } = useSession()
  const [activeCity, setActiveCity] = useState(userCity || 'All')
  const [activeCategory, setActiveCategory] = useState('All')
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notified, setNotified] = useState(false)

  const allCategories = useMemo(() => {
    const cats = new Set<string>()
    events.forEach(e => {
      e.tags?.forEach(t => cats.add(t))
    })
    return ['All', ...Array.from(cats)]
  }, [events])

  const featured = useMemo(() => {
    return [...events]
      .filter((e) => e.status === 'upcoming')
      .sort((a, b) => b.registered - a.registered)
      .slice(0, 3)
  }, [events])
  
  const trendingElsewhere = useMemo(() => {
    return [...events]
      .filter((e) => e.status === 'upcoming' && e.city !== activeCity && !regs.some((r: any) => r.activity?.id === e.id))
      .sort((a, b) => b.registered - a.registered)
      .slice(0, 4)
  }, [events, activeCity, regs])

  const upcomingGlobally = useMemo(() => {
    return events.filter((e) => e.status === 'upcoming').length
  }, [events])

  const upcoming = useMemo(() => {
    let filtered = events.filter((e) => e.status === 'upcoming')

    if (activeCity !== 'All') {
      filtered = filtered.filter((e) => e.city === activeCity)
    }

    if (activeCategory !== 'All') {
      filtered = filtered.filter((e) => e.tags?.includes(activeCategory))
    }

    return filtered.sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
  }, [events, activeCategory, activeCity])

  if (!isLoading && !isError && upcomingGlobally === 0) {
    return <GlobalEmptyState notifyEmail={notifyEmail} setNotifyEmail={setNotifyEmail} notified={notified} setNotified={setNotified} />
  }

  return (
    <div>
      <FeaturedCarousel events={featured} />

      {/* Filters Header */}
      <div id="feed" className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-h2 font-semibold text-gold">Upcoming near you</h2>
      </div>

      {/* Visual Category Chips */}
      {allCategories.length > 1 && (
        <div className="mb-4 overflow-x-auto pb-2 scrollbar-none flex items-center gap-2">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cx(
                'whitespace-nowrap rounded-full border px-4 py-1.5 text-[13px] font-medium transition-all duration-300 capitalize',
                activeCategory === cat
                  ? 'border-teal bg-teal text-onyx shadow-glow-teal'
                  : 'border-white/10 bg-white/5 text-graytext-light hover:border-white/20 hover:text-offwhite',
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* City chips */}
      <CitySelector
        cities={CITIES.map((c: any) => c.name)}
        activeCity={activeCity}
        setActiveCity={setActiveCity}
      />

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
        <div className="space-y-12 mt-8 animate-[fadeIn_0.5s_ease-out]">
          
          {/* Notify Me Empty State */}
          <Card className="relative overflow-hidden border-teal/20 bg-onyx shadow-2xl p-10 sm:p-14 text-center group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-transparent" />
            <Mandala size={48} className="mx-auto mb-6 text-teal opacity-80 transition-transform duration-700 group-hover:rotate-90 group-hover:scale-110" />
            
            <div className="relative z-10">
              <h3 className="text-h1 font-bold text-offwhite mb-3 tracking-tight">
                Things are quiet in {activeCity}
              </h3>
              <p className="text-body text-graytext-light max-w-lg mx-auto mb-8">
                Be the first to know when a meetup drops. Enter your email and we'll ping you the second an event goes live in your city.
              </p>
              
              {!notified ? (
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto">
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    placeholder="student@college.edu"
                    className="w-full rounded-xl border border-white/10 bg-black/40 px-5 py-3 text-[15px] text-offwhite placeholder:text-graytext-mid focus:border-teal focus:outline-none transition-colors shadow-inner"
                  />
                  <Button 
                    size="lg" 
                    className="w-full sm:w-auto shadow-glow-teal whitespace-nowrap"
                    onClick={() => {
                      if(notifyEmail.includes('@')) setNotified(true);
                    }}
                  >
                    Notify Me
                  </Button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-xl bg-teal/10 border border-teal/20 px-6 py-3 text-teal font-medium">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  You're on the list!
                </div>
              )}
            </div>
          </Card>

          {/* Trending Elsewhere Mini-Feed */}
          {trendingElsewhere.length > 0 && (
            <div className="border-t border-white/5 pt-10">
              <div className="flex items-center gap-3 mb-6">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-graytext-mid"><path d="M17 2.1l4 4-4 4"></path><path d="M3 12.2v-2a4 4 0 014-4h12.8M7 21.9l-4-4 4-4"></path><path d="M21 11.8v2a4 4 0 01-4 4H4.2"></path></svg>
                <h3 className="text-h3 font-semibold text-graytext-mid">Meanwhile, trending elsewhere...</h3>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {trendingElsewhere.map(e => {
                  const isRegistered = regs.some((r: any) => r.activity?.id === e.id)
                  return (
                    <Link key={e.id} to={`/events/${e.id}`}>
                      <EventCard e={e} isRegistered={isRegistered} compact />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function FeaturedCarousel({ events }: { events: EkatvaEvent[] }) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (events.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex(i => (i + 1) % events.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [events.length])

  if (events.length === 0) return null

  const e = events[activeIndex]

  return (
    <section 
      className="relative mb-9 overflow-hidden rounded-xl2 border border-white/5 flex flex-col items-center justify-center text-center p-10 h-[420px]"
      style={{ background: cover(e.cover) }}
    >
      <div className="absolute inset-0 bg-onyx/60 backdrop-blur-sm transition-all duration-1000" />
      <div className="grain absolute inset-0 rounded-xl2 mix-blend-overlay opacity-50" />
      
      <div className="relative z-10 max-w-3xl flex flex-col items-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal/25 bg-onyx/50 backdrop-blur-md px-3 py-1 text-caption font-semibold text-teal">
          <Mandala size={16} /> Featured Event
        </div>
        <h1 className="text-[36px] font-bold leading-tight text-offwhite md:text-[48px] mb-4 drop-shadow-md transition-all duration-500 line-clamp-2">
          {e.title}
        </h1>
        <p className="max-w-[560px] text-body text-graytext-light line-clamp-2 mb-8 drop-shadow-sm">
          {e.description || `Join us at ${e.venue} for an incredible experience.`}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to={`/events/${e.id}`}>
            <Button size="lg">Explore Event</Button>
          </Link>
          <div className="flex gap-2">
            <Badge tone="teal">{daysUntil(e.startsAt)}</Badge>
            <Badge tone="gold">{scaleLabel[e.scale]}</Badge>
          </div>
        </div>
      </div>
      
      {/* Carousel Dots */}
      <div className="absolute bottom-6 flex gap-2 z-10">
        {events.map((_, i) => (
          <button 
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cx("h-1.5 rounded-full transition-all duration-300", i === activeIndex ? "w-8 bg-teal" : "w-2 bg-white/30 hover:bg-white/50")}
          />
        ))}
      </div>
    </section>
  )
}

function SocialProof({ count }: { count: number }) {
  if (count === 0) return <span className="text-caption text-graytext-mid">Be the first!</span>
  
  const avatars = Math.min(count, 3)
  const colors = ['bg-[#FF6B6B]', 'bg-[#4ECDC4]', 'bg-[#FFE66D]', 'bg-[#845EC2]']
  
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2 mr-2">
        {Array.from({ length: avatars }).map((_, i) => (
          <div 
            key={i} 
            className={cx("w-6 h-6 rounded-full border-2 border-onyx shadow-sm", colors[i % colors.length])}
          />
        ))}
      </div>
      <span className="text-caption font-medium text-graytext-mid">
        {count} going
      </span>
    </div>
  )
}

function EventCard({ e, isRegistered, compact }: { e: EkatvaEvent; isRegistered?: boolean; compact?: boolean }) {
  const nearlyFull = e.registered / e.capacity > 0.85
  return (
    <Card hover className="h-full overflow-hidden flex flex-col">
      <div
        className={cx("relative flex items-end p-4 transition-transform duration-500 hover:scale-105", compact ? "h-24" : "h-32")}
        style={{ background: cover(e.cover) }}
      >
        <div className="grain absolute inset-0" />
        <div className="relative flex w-full items-center justify-between">
          <Badge tone="gold">{daysUntil(e.startsAt)}</Badge>
          {nearlyFull && !compact && <Badge tone="warn">Filling fast</Badge>}
        </div>
      </div>
      <div className="relative p-4 bg-onyx z-10 flex-1 flex flex-col">
        <div className="text-caption uppercase tracking-wider text-teal">
          {e.city}
        </div>
        <div className="mt-1 line-clamp-2 text-h3 font-semibold text-offwhite">
          {e.title}
        </div>
        
        {!compact && e.tags && e.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {e.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-sm bg-white/5 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-graytext-mid">
                {t}
              </span>
            ))}
          </div>
        )}
        
        <div className="mt-auto pt-4">
          <div className="flex items-center gap-2 text-[13px] text-graytext-light">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M16 3v4M8 3v4M3 10h18" />
            </svg>
            {formatDate(e.startsAt)}
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
            <SocialProof count={e.registered} />
            {isRegistered ? (
              <Badge tone="success">Registered</Badge>
            ) : (
              <span className="text-caption font-semibold text-teal">Register +</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

function GlobalEmptyState({ notifyEmail, setNotifyEmail, notified, setNotified }: any) {
  return (
    <div className="relative flex min-h-[80vh] w-full flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-onyx/40 animate-[fadeIn_0.5s_ease-out]">
      {/* Immersive background gradient with pulse */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal/20 via-onyx to-[#1A1A1A] opacity-60 animate-pulse transition-opacity duration-[3000ms]" />
      
      {/* Ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-teal/30 mix-blend-screen blur-[80px]" />
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-[#1A3A35]/50 mix-blend-screen blur-[100px]" />
      <div className="grain absolute inset-0 mix-blend-overlay opacity-30" />

      {/* Glassmorphism Card */}
      <div className="relative z-10 w-full max-w-2xl px-6">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-3xl shadow-2xl">
          <Mandala size={64} className="mx-auto mb-8 text-teal opacity-90 animate-[spin_60s_linear_infinite]" />
          
          <h1 className="mb-4 text-[42px] font-bold leading-tight tracking-tight text-offwhite sm:text-[56px] drop-shadow-lg">
            The Season is Quiet
          </h1>
          <p className="mx-auto mb-10 max-w-lg text-[16px] leading-relaxed text-graytext-light">
            We're brewing up new experiences behind the scenes. 
            Get notified the second our next event calendar drops.
          </p>

          <div className="mx-auto max-w-md">
            {!notified ? (
              <div className="flex flex-col gap-4 sm:flex-row">
                <input
                  type="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="student@college.edu"
                  className="w-full flex-1 rounded-2xl border border-white/10 bg-black/30 px-6 py-4 text-[15px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none focus:ring-1 focus:ring-teal/50 transition-all shadow-inner"
                />
                <Button
                  size="lg"
                  className="rounded-2xl px-8 shadow-glow-teal whitespace-nowrap"
                  onClick={() => {
                    if (notifyEmail.includes('@')) setNotified(true)
                  }}
                >
                  Subscribe
                </Button>
              </div>
            ) : (
              <div className="inline-flex items-center gap-3 rounded-2xl border border-teal/20 bg-teal/10 px-8 py-4 text-[15px] font-medium text-teal shadow-lg animate-[fadeUp_0.3s_ease-out]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                You're on the priority list!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
