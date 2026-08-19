import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useSearchParams } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { useMyPoints, useMyRegistrations, useCities } from '../lib/queries'
import { Badge, Button, Card, Input, SectionTitle, StatCard, useToast } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cover, coverForScale, daysUntil, formatDate, formatTime, cx, googleCalendarLink, googleCalendarDayLink } from '../lib/format'
import { useSession } from '../lib/session'
import { useAuth } from '../lib/auth'
import { CalendarWidget } from '../components/CalendarWidget'

export default function MyRegistrations() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: regs = [], isLoading, isError, error } = useMyRegistrations()
  const { data: points } = useMyPoints()
  const { id: currentUserId, name: userName, city: userCity, role } = useSession()
  const { refreshUser, updateCurrentUser, currentUser } = useAuth()
  const { data: allCities = [] } = useCities()
  const { addToast } = useToast()

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'waitlisted'>('all')
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [, forceCalendarRerender] = useState(0)

  const addToCalendar = (a: { id: string; title: string; startsAt: string; venue: string }) => {
    const isAdded = localStorage.getItem('cal_' + a.id) === '1'
    const url = isAdded
      ? googleCalendarDayLink(a.startsAt)
      : googleCalendarLink({ title: a.title, startsAt: a.startsAt, venue: a.venue })
    window.open(url, '_blank', 'noopener,noreferrer')
    if (!isAdded) {
      localStorage.setItem('cal_' + a.id, '1')
      forceCalendarRerender((t) => t + 1)
    }
  }

  const copyInviteLink = (activityId: string) => {
    const inviteUrl = `${window.location.origin}/events/${activityId}?ref=${currentUser?.id ?? currentUserId ?? ''}`
    navigator.clipboard.writeText(inviteUrl)
    addToast('Invite link copied! Earn points for every friend who registers.', 'success')
  }

  const upcoming = regs.filter((r: any) => r.activity?.status === 'upcoming')
  const attended = regs.filter((r: any) => r.attended).length



  const filteredRegs = useMemo(() => {
    return regs.filter((r: any) => {
      const a = r.activity
      if (!a) return false
      
      const searchMatch = a.title.toLowerCase().includes(q.toLowerCase()) || 
                          a.city.toLowerCase().includes(q.toLowerCase())
      
      const isPast = a.status === 'completed' || a.status === 'cancelled' || new Date(a.startsAt).getTime() < Date.now()
      const isUpcoming = !isPast
      
      let timelineMatch = true
      if (timelineFilter === 'upcoming') timelineMatch = isUpcoming
      if (timelineFilter === 'past') timelineMatch = isPast

      const computedStatus = r.status === 'waitlisted' ? 'waitlisted' : 'confirmed'
      const statusMatch = statusFilter === 'all' || computedStatus === statusFilter

      return searchMatch && statusMatch && timelineMatch
    })
  }, [regs, q, statusFilter, timelineFilter])

  if (isLoading) return <Loading label="Loading your registrations…" />
  if (isError) return <ErrorState error={error} />

  const nextEvent = [...upcoming].sort((a, b) => new Date(a.activity.startsAt).getTime() - new Date(b.activity.startsAt).getTime())[0]

  if (regs.length === 0) {
    return (
      <div className="pb-12 max-w-[1400px] px-4 xl:px-8 mx-auto flex flex-col items-center justify-center min-h-[75vh]">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-onyx via-[#0A100D] to-onyx p-10 md:p-16 text-center shadow-2xl max-w-3xl w-full group">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal/10 blur-[100px] rounded-full pointer-events-none group-hover:bg-teal/20 transition-colors duration-700" />
          <div className="grain absolute inset-0 mix-blend-overlay opacity-20 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-20 h-20 md:w-24 md:h-24 mb-8 rounded-full bg-black/40 border border-white/5 backdrop-blur-xl flex items-center justify-center shadow-inner relative overflow-hidden">
              <div className="absolute inset-0 bg-teal/20 translate-y-full group-hover:translate-y-0 transition-transform duration-700 ease-out" />
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal relative z-10"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 drop-shadow-xl">
              Your Journey Begins Here
            </h1>
            <p className="text-base md:text-lg text-graytext-light max-w-xl mb-10 leading-relaxed">
              You haven't registered for any events yet. Dive into Ekatva to discover new communities, join epic fests, and build your tech network.
            </p>
            
            <Link to="/discover">
              <button className="px-8 py-4 rounded-xl bg-teal text-onyx font-extrabold text-[14px] tracking-wider uppercase hover:bg-teal-400 hover:shadow-[0_0_40px_rgba(92,230,201,0.3)] transition-all flex items-center justify-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                Explore Events
              </button>
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="pb-12 max-w-[1400px] px-4 xl:px-8 mx-auto flex flex-col xl:flex-row gap-8 items-start justify-center">
      <div className="w-full max-w-5xl shrink-0">
        {/* Registrations Hero */}
      {nextEvent ? (
        <section 
          className="mb-10 relative overflow-hidden rounded-[2rem] border border-white/10 shadow-2xl mt-8 flex flex-col md:flex-row group transition-transform duration-500 hover:scale-[1.01]"
          style={{ background: cover(nextEvent.activity.cover) }}
        >
          {/* Dimming overlay so text remains readable over bright gradients */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
          <div className="grain absolute inset-0 opacity-20 mix-blend-overlay pointer-events-none" />
          
          {/* Left Side: Event Details */}
          <div className="relative z-10 flex-1 p-8 md:p-10 flex flex-col justify-center">
            <div className="text-[12px] uppercase tracking-widest text-teal-300 font-bold flex items-center justify-center md:justify-start gap-2 mb-3">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              Next Up in your Calendar
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white leading-[1.1] mb-5 drop-shadow-xl text-center md:text-left">{nextEvent.activity.title}</h1>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-[13px] md:text-[14px]">
              <span className="flex items-center gap-1.5 font-medium bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md text-offwhite">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5CE6C9" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {formatDate(nextEvent.activity.startsAt)} at {formatTime(nextEvent.activity.startsAt)}
              </span>
              <span className="flex items-center gap-1.5 font-medium bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-md text-offwhite">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5CE6C9" strokeWidth="2.5"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                {nextEvent.activity.venue}
              </span>
            </div>
          </div>

          {/* Perforated Divider (Hidden on mobile) */}
          <div className="hidden md:flex relative z-10 w-0 flex-col items-center justify-between">
             <div className="w-8 h-8 rounded-full bg-[#070C0A] absolute -top-4 -translate-x-1/2 border-b border-white/10 shadow-inner" />
             <div className="h-full border-r-[3px] border-dashed border-white/20" />
             <div className="w-8 h-8 rounded-full bg-[#070C0A] absolute -bottom-4 -translate-x-1/2 border-t border-white/10 shadow-inner" />
          </div>
          
          {/* Right Side: Ticket Stub & Action */}
          <div className="relative z-10 md:w-72 p-8 flex flex-col items-center justify-center bg-black/20 border-t md:border-t-0 border-dashed border-white/20 md:border-none backdrop-blur-xl">
            <div className="text-6xl font-black text-white drop-shadow-[0_0_20px_rgba(92,230,201,0.4)] leading-none mb-2">
              {daysUntil(nextEvent.activity.startsAt).replace('In ', '').replace(' days', '').replace('Tomorrow', '1')}
            </div>
            <div className="text-[12px] text-teal-300 uppercase tracking-[0.25em] font-bold mb-6 text-center">
              {daysUntil(nextEvent.activity.startsAt).includes('days') || daysUntil(nextEvent.activity.startsAt) === 'Tomorrow' ? 'Days Away' : 'Event'}
            </div>
            
            <button 
              onClick={() => setSelectedTicket(nextEvent)}
              className="w-full py-3.5 rounded-xl bg-teal text-onyx font-extrabold text-[13px] tracking-wider uppercase hover:bg-teal-400 hover:shadow-[0_0_30px_rgba(92,230,201,0.5)] transition-all flex items-center justify-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              View Pass
            </button>
          </div>
        </section>
      ) : (
        <section className="mb-10 relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-onyx to-black p-8 text-center mt-8">
           <div className="grain absolute inset-0 mix-blend-overlay opacity-20 pointer-events-none" />
           <div className="relative z-10">
             <div className="mx-auto h-16 w-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-graytext-light mb-4 shadow-inner">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
             </div>
             <h2 className="text-2xl font-bold text-offwhite mb-2">Your schedule is clear</h2>
             <p className="text-graytext-mid max-w-md mx-auto mb-6">You don't have any upcoming events right now. Discover new communities and build your tech network.</p>
             <Link to="/discover">
               <Button variant="primary">Discover Events</Button>
             </Link>
           </div>
        </section>
      )}

      {/* Header */}
      <div className="mb-6 mt-4 lg:mt-8">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">My Tickets</h1>
      </div>

      {/* Unified Command Bar */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-white/5 bg-onyx/40 p-3 backdrop-blur-xl shadow-lg">
        {/* Left: Search */}
        <div className="relative w-full lg:w-72 xl:w-96">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tickets..."
            className="w-full pl-10 rounded-xl bg-black/40 border-transparent focus:border-teal/50 text-[14px] text-white placeholder:text-graytext-mid"
          />
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-graytext-mid" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" strokeLinecap="round" />
          </svg>
        </div>
        
        {/* Right: Filters */}
        <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {/* Timeline filter */}
          <div className="flex items-center gap-1 rounded-xl bg-black/40 p-1 shrink-0">
            {(['all', 'upcoming', 'past'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setTimelineFilter(mode)}
                className={cx(
                  'whitespace-nowrap rounded-lg px-5 py-2 text-[13px] font-semibold transition-all duration-300 capitalize text-center',
                  timelineFilter === mode 
                    ? 'bg-white/10 text-offwhite shadow-sm'
                    : 'text-graytext-mid hover:text-offwhite hover:bg-white/5'
                )}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1 rounded-xl bg-black/40 p-1 shrink-0">
            {(['all', 'confirmed', 'waitlisted'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setStatusFilter(mode)}
                className={cx(
                  'whitespace-nowrap rounded-lg px-5 py-2 text-[13px] font-semibold transition-all duration-300 capitalize text-center',
                  statusFilter === mode 
                    ? 'bg-white/10 text-offwhite shadow-sm'
                    : 'text-graytext-mid hover:text-offwhite hover:bg-white/5'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredRegs.length === 0 && (
        <Card className="p-12 text-center border-white/5 border-dashed">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto mb-4 text-white/20">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          {q || statusFilter !== 'all' ? (
            <div className="text-graytext-light">No tickets match your filters.</div>
          ) : (
            <>
              <div className="text-offwhite font-medium mb-1">Your wallet is empty.</div>
              <Link to="/discover" className="text-teal hover:text-teal-accent hover:underline text-[14px]">
                Discover events to fill it up →
              </Link>
            </>
          )}
        </Card>
      )}

      {/* Wallet Style Ticket Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredRegs.map((r: any) => {
          const a = r.activity
          if (!a) return null
          const isWaitlisted = r.status === 'waitlisted'
          const isPastEvent = a.status === 'completed' || a.status === 'cancelled' || r.attended
          
          return (
            <div 
              key={r.id} 
              className={cx(
                "group relative flex flex-col rounded-2xl bg-onyx shadow-xl border border-white/10 overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-2xl",
                isPastEvent && "opacity-75 grayscale-[40%]"
              )}
            >
              {/* Top Banner / Event Art */}
              <div 
                className="relative h-28 w-full p-4 flex items-start justify-between"
                style={{ background: coverForScale(a.scale) }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-onyx to-transparent opacity-80" />
                <div className="relative z-10 flex w-full justify-between items-start">
                  <Badge tone="neutral">{a.city}</Badge>
                  {a.status === 'cancelled' ? (
                    <Badge tone="danger">Cancelled</Badge>
                  ) : isWaitlisted ? (
                    <Badge tone="warn">Waitlist</Badge>
                  ) : r.attended ? (
                    <Badge tone="success">Attended</Badge>
                  ) : a.status === 'completed' ? (
                    <Badge tone="neutral">Missed</Badge>
                  ) : (
                    <Badge tone="teal">{daysUntil(a.startsAt)}</Badge>
                  )}
                </div>
              </div>

              {/* Ticket Perforation Line */}
              <div className="relative flex items-center justify-between -mt-3 z-20">
                <div className="h-6 w-6 rounded-full bg-[#0A0A0A] border-r border-white/10 -ml-3" />
                <div className="flex-1 border-b-[2px] border-dashed border-white/10" />
                <div className="h-6 w-6 rounded-full bg-[#0A0A0A] border-l border-white/10 -mr-3" />
              </div>

              {/* Ticket Body */}
              <div className="flex-1 p-5 flex flex-col">
                <Link to={`/events/${a.id}`} className="block mb-4 group-hover:text-teal transition-colors">
                  <h3 className="text-h3 font-bold text-offwhite leading-snug line-clamp-2">{a.title}</h3>
                </Link>

                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-graytext-mid mb-0.5">Date & Time</div>
                    <div className="text-[13px] font-medium text-offwhite">{formatDate(a.startsAt)}</div>
                    <div className="text-[12px] text-graytext-light">{formatTime(a.startsAt)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-graytext-mid mb-0.5">Location</div>
                    <div className="text-[13px] font-medium text-offwhite line-clamp-3 pr-2 leading-tight">{a.venue}</div>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex gap-2">
                    {a.status !== 'completed' && (
                      <button 
                        className="rounded-full flex items-center justify-center text-teal hover:bg-teal hover:text-onyx transition-colors h-9 w-9 bg-white/5"
                        onClick={() => setSearchParams({ chat: a.id })}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                      </button>
                    )}
                    {a.status === 'upcoming' && !isWaitlisted && (
                      <button 
                        onClick={() => addToCalendar(a)}
                        className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center text-gold hover:bg-gold hover:text-onyx transition-colors" 
                        title={localStorage.getItem('cal_' + a.id) === '1' ? 'Added to Calendar' : 'Add to Calendar'}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                      </button>
                    )}
                  </div>
                  <Button 
                    size="sm" 
                    variant={isPastEvent || isWaitlisted ? "secondary" : "primary"} 
                    disabled={isWaitlisted}
                    onClick={() => setSelectedTicket(r)}
                  >
                    {isWaitlisted ? 'Spot Pending' : 'View Pass'}
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Boarding Pass Modal */}
      {selectedTicket && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0" onClick={() => setSelectedTicket(null)} />
          
          <div className="relative w-full max-w-[340px] flex flex-col bg-offwhite rounded-3xl shadow-2xl overflow-hidden scale-100 animate-[fadeUp_0.4s_ease-out(1.2)]">
            
            {/* Modal Header */}
            <div 
              className="h-32 w-full p-5 text-offwhite relative"
              style={{ background: coverForScale(selectedTicket.activity?.scale || 'local_meetup') }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="grain absolute inset-0 mix-blend-overlay opacity-30 pointer-events-none" />
              
              <button 
                onClick={() => setSelectedTicket(null)}
                className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-black/30 backdrop-blur-md text-white/90 hover:bg-black/60 transition-colors z-50 cursor-pointer"
              >
                ✕
              </button>
              
              <div className="relative z-10 pointer-events-none">
                <div className="text-[10px] uppercase tracking-widest font-bold opacity-80 mb-1">
                  Ekatva Digital Pass
                </div>
                <div className="text-xl font-bold leading-tight line-clamp-2 drop-shadow-md">
                  {selectedTicket.activity?.title}
                </div>
              </div>
            </div>

            {/* Modal Perforation */}
            <div className="relative flex items-center justify-between -mt-4 z-20 pointer-events-none">
              <div className="h-8 w-8 rounded-full bg-black border-r border-black/10 -ml-4 shadow-inner" />
              <div className="flex-1 border-b-[2px] border-dashed border-gray-400 opacity-50" />
              <div className="h-8 w-8 rounded-full bg-black border-l border-black/10 -mr-4 shadow-inner" />
            </div>

            {/* Modal Body (Light theme for tickets) */}
            <div className="px-6 pb-8 pt-4 text-onyx bg-offwhite relative">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Passenger</div>
                  <div className="text-[14px] font-bold text-gray-900 truncate">{userName}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Status</div>
                  <div className={cx("text-[14px] font-bold flex items-center gap-1 capitalize", selectedTicket.status === 'confirmed' ? 'text-teal' : 'text-amber-500')}>
                    {selectedTicket.status === 'confirmed' && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    )}
                    {selectedTicket.status}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Date</div>
                  <div className="text-[14px] font-bold text-gray-900">{formatDate(selectedTicket.activity?.startsAt)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Time</div>
                  <div className="text-[14px] font-bold text-gray-900">{formatTime(selectedTicket.activity?.startsAt)}</div>
                </div>
              </div>

              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Venue</div>
                <div className="text-[14px] font-bold text-gray-900 line-clamp-2">{selectedTicket.activity?.venue}</div>
              </div>

              {/* Barcode Area */}
              <div className="mx-auto flex flex-col items-center justify-center p-4 bg-gray-100 rounded-2xl border border-gray-200">
                <QRCodeCanvas 
                  value={selectedTicket.qr_token}
                  size={180}
                  level="H"
                  fgColor="#0A0A0A" 
                  bgColor="transparent"
                />
                <div className="mt-3 text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                  Scan at Entry
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      </div>

      {/* Right Sidebar - Calendar */}
      <div className="w-full xl:w-[320px] shrink-0 sticky top-24 mt-8">
        <CalendarWidget regs={regs} />
      </div>

    </div>
  )
}
