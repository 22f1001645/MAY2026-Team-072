import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useEvents, useMyRegistrations, useCities, useSubscribeToCityAlert } from '../lib/queries'
import { uploadUrl } from '../lib/api'
import { Badge, Button, Card } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cover, scaleLabel, daysUntil, cx, formatDate, formatTime } from '../lib/format'
import { EkatvaEvent } from '../lib/types'
import { useSession } from '../lib/session'
import WelcomeBanner from '../components/WelcomeBanner'

function InlineDropdown({ value, options, onChange, isCity }: { value: string, options: string[], onChange: (v: string) => void, isCity: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative inline-block" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 border-b-[3px] border-teal/40 text-teal hover:border-teal transition-colors focus:outline-none cursor-pointer pb-0.5"
      >
        <span>{value === 'All' ? (isCity ? 'anywhere' : 'all') : value.toLowerCase()}</span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-3 w-56 max-h-64 rounded-xl border border-white/10 bg-onyx-overlay/90 backdrop-blur-3xl shadow-[0_20px_50px_rgba(14,47,54,0.5)] z-50 overflow-y-auto custom-scrollbar animate-fade-down origin-top-left flex flex-col p-1.5 text-[15px] font-semibold text-white tracking-normal leading-normal">
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false) }}
              className={`text-left px-4 py-2.5 rounded-lg transition-colors ${value === opt ? 'bg-teal/20 text-teal' : 'hover:bg-white/10'}`}
            >
              {opt === 'All' ? (isCity ? 'Anywhere' : 'All') : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Discover() {
  const { data: events = [], isLoading, isError, error } = useEvents()
  const { data: regs = [] } = useMyRegistrations()
  const { data: CITIES = [] } = useCities()
  const [searchParams] = useSearchParams()
  const { city: userCity } = useSession()
  const [activeCity, setActiveCity] = useState(searchParams.get('city') || userCity || 'All')
  const [activeCategory, setActiveCategory] = useState('All')
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notified, setNotified] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const subscribeAlert = useSubscribeToCityAlert()

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
    return (
      <div>
        <WelcomeBanner />
        <GlobalEmptyState notifyEmail={notifyEmail} setNotifyEmail={setNotifyEmail} notified={notified} setNotified={setNotified} activeCity={activeCity} />
      </div>
    )
  }

  return (
    <div>
      <WelcomeBanner />
      <FeaturedCarousel events={featured} isLoading={isLoading} />

      {/* Dynamic Sentence Header */}
      <div className="mb-10 mt-6 lg:mt-8">
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-white tracking-tight leading-[1.4] md:leading-[1.3] flex flex-wrap items-center gap-x-2 gap-y-3">
          <span>Discover</span>
          <InlineDropdown 
            value={activeCategory} 
            options={allCategories} 
            onChange={setActiveCategory} 
            isCity={false} 
          />
          <span>events in</span>
          <InlineDropdown 
            value={activeCity} 
            options={['All', ...new Set(CITIES.map((c: any) => c.name))]} 
            onChange={setActiveCity} 
            isCity={true} 
          />
        </h1>
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
        <div className="space-y-12 mt-8 animate-[fadeIn_0.5s_ease-out]">
          
          {/* Notify Me Empty State */}
          <Card className="relative overflow-hidden border-teal/20 bg-onyx shadow-2xl p-10 sm:p-14 text-center group">
            <div className="absolute inset-0 bg-gradient-to-br from-teal/5 to-transparent" />
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-6 text-teal opacity-80 transition-transform duration-700 group-hover:scale-110">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
            
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
                    className="w-full rounded-xl border border-white/10 bg-onyx/40 px-5 py-3 text-[15px] text-offwhite placeholder:text-graytext-mid focus:border-teal focus:outline-none transition-colors shadow-inner"
                  />
                  <Button
                    size="lg"
                    className="w-full sm:w-auto shadow-glow-teal whitespace-nowrap"
                    disabled={subscribeAlert.isPending}
                    onClick={() => {
                      if (!notifyEmail.includes('@')) {
                        setEmailError('Enter a valid email address')
                        return
                      }
                      setEmailError(null)
                      subscribeAlert.mutate(
                        { email: notifyEmail, city: activeCity },
                        { onSuccess: () => setNotified(true) }
                      )
                    }}
                  >
                    {subscribeAlert.isPending ? 'Subscribing...' : 'Notify Me'}
                  </Button>
                </div>
              ) : null}

              {!notified && emailError && (
                <p role="alert" className="mt-3 text-caption text-red-300">{emailError}</p>
              )}
              {!notified && subscribeAlert.isError && (
                <p role="alert" className="mt-3 text-caption text-red-300">
                  {(subscribeAlert.error as Error)?.message || 'Something went wrong. Please try again.'}
                </p>
              )}

              {notified && (
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

function FeaturedCarousel({ events, isLoading }: { events: EkatvaEvent[], isLoading?: boolean }) {
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    if (events.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex(i => (i + 1) % events.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [events.length])

  if (isLoading) {
    return (
      <section className="relative mb-9 overflow-hidden rounded-xl2 border border-white/5 bg-[#070C0A] flex flex-col items-center justify-center text-center p-10 h-[420px]">
        {/* Subtle Brand Gradients for depth */}
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[120%] bg-teal/5 blur-[80px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[100%] bg-emerald/5 blur-[80px] rounded-full pointer-events-none mix-blend-screen" />
        
        {/* Shimmering Layout Elements */}
        <div className="relative z-10 max-w-3xl flex flex-col items-center w-full">
          <div className="w-36 h-8 rounded-full bg-white/[0.03] border border-white/[0.05] mb-5 overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full animate-shimmer" />
          </div>
          <div className="w-3/4 max-w-[500px] h-14 rounded-2xl bg-white/[0.02] border border-white/[0.05] mb-4 overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full animate-[shimmer_2s_infinite_0.2s]" />
          </div>
          <div className="w-1/2 max-w-[300px] h-5 rounded-lg bg-white/[0.02] mb-8 overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full animate-[shimmer_2s_infinite_0.4s]" />
          </div>
          <div className="w-40 h-12 rounded-full bg-white/[0.03] border border-white/[0.05] overflow-hidden relative">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent -translate-x-full animate-[shimmer_2s_infinite_0.6s]" />
          </div>
        </div>
      </section>
    )
  }

  if (events.length === 0) return null

  return (
    <div className="relative mb-9 overflow-hidden rounded-xl2 border border-white/5 h-[420px] group">
      <div 
        className="flex w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {events.map((e, idx) => (
          <section
            key={e.id}
            className="w-full h-full shrink-0 relative flex flex-col items-center justify-center text-center p-10 bg-200 animate-gradient-shift"
            style={!e.posterName ? { backgroundImage: cover(e.cover) } : {}}
          >
            {e.posterName && (
              <img src={uploadUrl(e.posterName)} alt="" className="absolute inset-0 h-full w-full object-cover" />
            )}
            <div className="absolute inset-0 bg-onyx/60 backdrop-blur-sm" />
            <div className="grain absolute inset-0 mix-blend-overlay opacity-50" />
            
            <div 
              className="relative z-10 max-w-3xl flex flex-col items-center transition-all duration-700 delay-100"
              style={{ opacity: activeIndex === idx ? 1 : 0, transform: activeIndex === idx ? 'translateY(0)' : 'translateY(20px)' }}
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-teal/25 bg-onyx/50 backdrop-blur-md px-3 py-1 text-caption font-semibold text-teal shadow-inner">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" className={activeIndex === idx ? "animate-pulse" : ""}>
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg> Featured Event
              </div>
              <h1 className="text-[36px] font-bold leading-tight text-offwhite md:text-[48px] mb-4 drop-shadow-md line-clamp-2">
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
          </section>
        ))}
      </div>

      {/* Navigation Arrows */}
      {events.length > 1 && (
        <>
          <button 
            onClick={() => setActiveIndex(i => (i - 1 + events.length) % events.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-onyx/40 hover:bg-scrim/80 text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <button 
            onClick={() => setActiveIndex(i => (i + 1) % events.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-onyx/40 hover:bg-scrim/80 text-white backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </>
      )}

      {/* Carousel Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
        {events.map((_, i) => (
          <button 
            key={i}
            onClick={() => setActiveIndex(i)}
            className={cx("h-1.5 rounded-full transition-all duration-300", i === activeIndex ? "w-8 bg-teal" : "w-2 bg-white/30 hover:bg-white/50")}
          />
        ))}
      </div>
    </div>
  )
}

function SocialProof({ count }: { count: number }) {
  if (count === 0) return <span className="text-caption text-graytext-mid">Be the first!</span>
  
  const avatars = Math.min(count, 3)
  
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2 mr-2">
        {Array.from({ length: avatars }).map((_, i) => (
          <div 
            key={i} 
            className="w-6 h-6 rounded-full border border-white/20 bg-onyx shadow-sm flex items-center justify-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/5" />
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-graytext-mid relative z-10">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          </div>
        ))}
      </div>
      <span className="text-caption font-medium text-graytext-mid">
        {count} going
      </span>
    </div>
  )
}

function EventCard({ e, isRegistered, compact }: { e: EkatvaEvent; isRegistered?: boolean; compact?: boolean }) {
  const isFull = e.registered >= e.capacity
  const nearlyFull = e.registered / e.capacity > 0.85
  const isWaitlistClosed = new Date(e.startsAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
  
  return (
    <Card hover className="h-full overflow-hidden flex flex-col group/card">
      <div
        className={cx("relative flex items-end p-4 transition-transform duration-500 hover:scale-105 bg-200 animate-gradient-shift", compact ? "h-24" : "h-32")}
        style={!e.posterName ? { backgroundImage: cover(e.cover) } : {}}
      >
        {e.posterName && (
          <img src={uploadUrl(e.posterName)} alt="" className="absolute inset-0 h-full w-full object-cover" />
        )}
        {e.posterName && <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />}
        {!e.posterName && <div className="grain absolute inset-0" />}
        <div className="relative flex w-full items-center justify-between">
          <Badge tone="gold">{daysUntil(e.startsAt)}</Badge>
          {!compact && !isRegistered && (
            isFull 
              ? <Badge tone="neutral">{isWaitlistClosed ? 'At Capacity' : 'Join Waitlist'}</Badge>
              : nearlyFull ? <Badge tone="warn">Almost Full</Badge>
              : null
          )}
        </div>
      </div>
      <div className="relative p-4 bg-onyx z-10 flex-1 flex flex-col">
        <div className="text-caption uppercase tracking-wider text-teal">
          {e.city}
        </div>
        <div className="mt-1 line-clamp-2 text-h3 font-semibold text-offwhite transition-colors group-hover/card:text-teal">
          {e.title}
        </div>
        
        {!compact && e.tags && e.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {e.tags.slice(0, 3).map((t) => {
              const tl = t.toLowerCase()
              const colorClass = tl === 'local' 
                ? 'bg-teal/15 text-teal border-teal/20' 
                : tl === 'fest' 
                ? 'bg-gold/15 text-gold border-gold/20'
                : 'bg-white/5 text-graytext-mid border-white/10'
                
              return (
                <span key={t} className={cx("rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest", colorClass)}>
                  {t}
                </span>
              )
            })}
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

function GlobalEmptyState({ notifyEmail, setNotifyEmail, notified, setNotified, activeCity }: any) {
  const subscribeAlert = useSubscribeToCityAlert()
  const [emailError, setEmailError] = useState<string | null>(null)
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
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-8 text-teal opacity-90">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>
          
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
                  className="w-full flex-1 rounded-2xl border border-white/10 bg-onyx/30 px-6 py-4 text-[15px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none focus:ring-1 focus:ring-teal/50 transition-all shadow-inner"
                />
                  <Button
                    size="lg"
                    className="rounded-2xl px-8 shadow-glow-teal whitespace-nowrap"
                    disabled={subscribeAlert.isPending}
                    onClick={() => {
                      if (!notifyEmail.includes('@')) {
                        setEmailError('Enter a valid email address')
                        return
                      }
                      setEmailError(null)
                      subscribeAlert.mutate(
                        { email: notifyEmail, city: activeCity },
                        { onSuccess: () => setNotified(true) }
                      )
                    }}
                  >
                    {subscribeAlert.isPending ? 'Subscribing...' : 'Subscribe'}
                  </Button>
              </div>
            ) : null}

            {!notified && emailError && (
              <p role="alert" className="mt-3 text-center text-caption text-red-300">{emailError}</p>
            )}
            {!notified && subscribeAlert.isError && (
              <p role="alert" className="mt-3 text-center text-caption text-red-300">
                {(subscribeAlert.error as Error)?.message || 'Something went wrong. Please try again.'}
              </p>
            )}

            {notified && (
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
