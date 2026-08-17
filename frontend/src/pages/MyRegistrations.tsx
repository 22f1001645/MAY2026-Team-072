import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { useMyPoints, useMyRegistrations, useCities } from '../lib/queries'
import { Badge, Button, Card, Input, SectionTitle, StatCard, useToast } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { coverForScale, daysUntil, formatDate, formatTime, cx, googleCalendarLink, googleCalendarDayLink } from '../lib/format'
import { useSession } from '../lib/session'
import { useAuth } from '../lib/auth'

export default function MyRegistrations() {
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
      
      const isPast = a.status === 'completed' || a.status === 'cancelled' || r.attended
      const isUpcoming = a.status === 'upcoming'
      
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

  return (
    <div className="pb-12 max-w-5xl mx-auto">
      {/* Registrations Hero */}
      {nextEvent ? (
        <section className="mb-10 relative overflow-hidden rounded-3xl border border-teal/20 bg-gradient-to-r from-onyx via-black to-onyx p-8 shadow-[0_0_40px_rgba(63,212,182,0.05)] mt-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-teal/10 blur-3xl rounded-full pointer-events-none translate-x-1/4 -translate-y-1/4" />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 justify-between">
            <div className="flex flex-col gap-2 text-center md:text-left">
              <div className="text-[12px] uppercase tracking-widest text-teal font-semibold flex items-center justify-center md:justify-start gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                Next Up in your Calendar
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-offwhite leading-tight">{nextEvent.activity.title}</h1>
              <div className="flex items-center justify-center md:justify-start gap-4 text-graytext-light mt-1">
                <span className="flex items-center gap-1.5 font-medium">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {formatDate(nextEvent.activity.startsAt)} at {formatTime(nextEvent.activity.startsAt)}
                </span>
                <span className="hidden sm:inline text-white/20">•</span>
                <span className="flex items-center gap-1.5 font-medium">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                  {nextEvent.activity.venue}
                </span>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center bg-black/50 p-6 rounded-2xl border border-white/10 min-w-[140px] backdrop-blur-md shadow-inner text-center">
              <div className="text-3xl font-black text-teal drop-shadow-md leading-none">
                {daysUntil(nextEvent.activity.startsAt).replace('In ', '').replace(' days', '')}
              </div>
              <div className="text-[11px] text-graytext-mid uppercase tracking-widest font-semibold mt-2">
                {daysUntil(nextEvent.activity.startsAt).includes('days') ? 'Days Away' : 'Event'}
              </div>
            </div>
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

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h2 className="text-h2 font-semibold text-offwhite">Your Tickets</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by title or city…"
              className="w-full sm:w-56 pl-9 rounded-full bg-white/5 border-white/10 text-[13px]"
            />
            <svg className="absolute left-3 top-2.5 text-graytext-mid" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" strokeLinecap="round" />
            </svg>
          </div>
          
          <div className="flex rounded-full border border-white/10 bg-onyx p-1">
            {(['all', 'upcoming', 'past'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setTimelineFilter(mode)}
                className={cx(
                  'px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors',
                  timelineFilter === mode 
                    ? 'bg-teal/15 text-teal shadow-glow-teal'
                    : 'text-graytext-mid hover:text-offwhite'
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex rounded-full border border-white/10 bg-onyx p-1">
            {(['all', 'confirmed', 'waitlisted'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setStatusFilter(mode)}
                className={cx(
                  'px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors',
                  statusFilter === mode 
                    ? 'bg-white/15 text-offwhite'
                    : 'text-graytext-mid hover:text-offwhite'
                )}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
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
                    <div className="text-[13px] font-medium text-offwhite line-clamp-1">{a.venue}</div>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex gap-2">
                    {a.status !== 'completed' && (
                      <Link to={`/events/${a.id}`} state={{ openChat: true }}>
                        <button className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center text-teal hover:bg-teal hover:text-onyx transition-colors" title="Event Chat">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                        </button>
                      </Link>
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
                  
                  <Button size="sm" variant={isPastEvent ? "secondary" : "primary"} onClick={() => setSelectedTicket(r)}>
                    View Pass
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Boarding Pass Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0" onClick={() => setSelectedTicket(null)} />
          
          <div className="relative w-full max-w-[340px] flex flex-col bg-offwhite rounded-3xl shadow-2xl overflow-hidden scale-100 animate-[fadeUp_0.4s_ease-out(1.2)]">
            
            {/* Modal Header */}
            <div 
              className="h-32 w-full p-5 text-offwhite relative"
              style={{ background: coverForScale(selectedTicket.activity?.scale || 'local_meetup') }}
            >
              <div className="absolute inset-0 bg-black/20" />
              <div className="grain absolute inset-0 mix-blend-overlay opacity-30" />
              
              <button 
                onClick={() => setSelectedTicket(null)}
                className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-black/30 backdrop-blur-md text-white/90 hover:bg-black/60 transition-colors z-10"
              >
                ✕
              </button>
              
              <div className="relative z-10">
                <div className="text-[10px] uppercase tracking-widest font-bold opacity-80 mb-1">
                  Ekatva Digital Pass
                </div>
                <div className="text-xl font-bold leading-tight line-clamp-2 drop-shadow-md">
                  {selectedTicket.activity?.title}
                </div>
              </div>
            </div>

            {/* Modal Perforation */}
            <div className="relative flex items-center justify-between -mt-4 z-20">
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
        </div>
      )}

    </div>
  )
}
