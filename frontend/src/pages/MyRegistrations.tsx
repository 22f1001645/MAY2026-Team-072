import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { useMyPoints, useMyRegistrations } from '../lib/queries'
import { Badge, Button, Card, SectionTitle, StatCard, Input, useToast } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { coverForScale, daysUntil, formatDate, formatTime, cx, googleCalendarLink, googleCalendarDayLink } from '../lib/format'
import { useSession } from '../lib/session'
import { useAuth } from '../lib/auth'
import EventAnnouncementsModal from '../components/EventAnnouncementsModal'

export default function MyRegistrations() {
  const { data: regs = [], isLoading, isError, error } = useMyRegistrations()
  const { data: points } = useMyPoints()
  const { name: userName } = useSession()
  const { currentUser } = useAuth()
  const { addToast } = useToast()

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'waitlisted'>('all')
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [activeChatEventId, setActiveChatEventId] = useState<string | null>(null)
  const [, forceCalendarRerender] = useState(0)

  const addToCalendar = (a: { id: string; title: string; starts_at: string; venue: string }) => {
    const isAdded = localStorage.getItem('cal_' + a.id) === '1'
    const url = isAdded
      ? googleCalendarDayLink(a.starts_at)
      : googleCalendarLink({ title: a.title, startsAt: a.starts_at, venue: a.venue })
    window.open(url, '_blank', 'noopener,noreferrer')
    if (!isAdded) {
      localStorage.setItem('cal_' + a.id, '1')
      forceCalendarRerender((t) => t + 1)
    }
  }

  const copyInviteLink = (activityId: string) => {
    const inviteUrl = `${window.location.origin}/events/${activityId}?ref=${currentUser?.id ?? ''}`
    navigator.clipboard.writeText(inviteUrl)
    addToast('Invite link copied! Earn points for every friend who registers.')
  }

  const upcoming = regs.filter((r: any) => r.activity?.status === 'upcoming')
  const attended = regs.filter((r: any) => r.attended).length

  const filteredRegs = useMemo(() => {
    return regs.filter((r: any) => {
      const a = r.activity
      if (!a) return false
      
      const searchMatch = a.title.toLowerCase().includes(q.toLowerCase()) || 
                          a.city.toLowerCase().includes(q.toLowerCase())
      
      const isPast = a.status === 'completed' || r.attended
      const isUpcoming = a.status === 'upcoming'
      
      let timelineMatch = true
      if (timelineFilter === 'upcoming') timelineMatch = isUpcoming
      if (timelineFilter === 'past') timelineMatch = isPast

      // Waitlist logic from backend
      const computedStatus = r.status === 'waitlisted' ? 'waitlisted' : 'confirmed'

      const statusMatch = statusFilter === 'all' || computedStatus === statusFilter

      return searchMatch && statusMatch && timelineMatch
    })
  }, [regs, q, statusFilter, timelineFilter])

  if (isLoading) return <Loading label="Loading your registrations…" />
  if (isError) return <ErrorState error={error} />

  return (
    <div>
      <SectionTitle
        eyebrow="Student"
        title="My Registrations"
        sub="Everything you've committed to, and the reminders that keep you from missing it."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Upcoming" value={upcoming.length} hint="events you're registered for" />
        <StatCard label="Attended this term" value={attended} tone="gold" hint="counts toward fee utilisation" />
        <StatCard label="My points" value={points?.total ?? 0} hint="see the leaderboard" />
      </div>

      <div className="w-full">
        <div className="space-y-4">
          
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <div className="relative w-full sm:w-auto">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by title or city…"
                className="w-full sm:w-64 pl-9"
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
            
            <div className="flex rounded-full border border-white/10 bg-onyx p-1">
              {(['all', 'upcoming', 'past'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setTimelineFilter(mode)}
                  className={cx(
                    'px-4 py-1.5 text-[13px] font-medium rounded-full transition-colors',
                    timelineFilter === mode 
                      ? 'bg-teal/15 text-teal border border-teal/25'
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
                      ? 'bg-teal/15 text-teal border border-teal/25'
                      : 'text-graytext-mid hover:text-offwhite'
                  )}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredRegs.length === 0 && (
            <Card className="p-10 text-center text-graytext-light mt-4">
              {q || statusFilter !== 'all' ? (
                "No registrations match your search."
              ) : (
                <>
                  You haven't registered for anything yet.{' '}
                  <Link to="/discover" className="font-semibold text-teal hover:text-teal-accent">
                    Find something in your city →
                  </Link>
                </>
              )}
            </Card>
          )}

          {filteredRegs.map((r: any) => {
            const a = r.activity
            if (!a) return null
            const isWaitlisted = r.status === 'waitlisted'
            return (
              <Card key={r.id} hover className="flex flex-col sm:flex-row items-stretch gap-0 overflow-hidden">
                <Link to={`/events/${a.id}`} className="sm:w-28 shrink-0 h-28 sm:h-auto block" style={{ background: coverForScale(a.scale) }} />
                <div className="flex-1 p-4 flex flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/events/${a.id}`}>
                      <div className="text-caption uppercase tracking-wider text-teal">
                        {a.city}
                      </div>
                      <div className="text-h3 font-semibold text-offwhite hover:text-teal transition-colors">{a.title}</div>
                    </Link>
                    <div className="flex items-center gap-2">
                      {isWaitlisted ? (
                        <Badge tone="warn">Waitlisted</Badge>
                      ) : r.attended ? (
                        <Badge tone="success">Attended</Badge>
                      ) : a.status === 'completed' ? (
                        <Badge tone="neutral">Missed</Badge>
                      ) : (
                        <Badge tone="teal">{daysUntil(a.starts_at)}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div className="text-[13px] text-graytext-light">
                      <div className="flex items-center gap-1.5 mb-1">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="3" y="5" width="18" height="16" rx="2" />
                          <path d="M16 3v4M8 3v4M3 10h18" />
                        </svg>
                        {formatDate(a.starts_at)} · {formatTime(a.starts_at)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" />
                          <circle cx="12" cy="10" r="2.5" />
                        </svg>
                        {a.venue}
                      </div>
                    </div>
                    {a.status === 'upcoming' && !isWaitlisted && (
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          title={localStorage.getItem('cal_' + a.id) === '1' ? 'Added to calendar' : 'Add to calendar'}
                          onClick={() => addToCalendar(a)}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                          </svg>
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setActiveChatEventId(a.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                          Announcements
                        </Button>
                        <Button variant="secondary" size="sm" onClick={() => setSelectedTicket(r)}>
                          View Ticket
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

      </div>

      {/* QR Ticket Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0" onClick={() => setSelectedTicket(null)} />
          
          <div className="relative w-full max-w-sm rounded-xl2 border border-white/10 bg-onyx shadow-2xl overflow-hidden scale-100 animate-[fadeUp_0.3s_ease-out]">
            <div className="h-24 w-full" style={{ background: coverForScale(selectedTicket.activity?.scale || 'local_meetup') }} />
            <button 
              onClick={() => setSelectedTicket(null)}
              className="absolute top-4 right-4 grid h-8 w-8 place-items-center rounded-full bg-black/30 text-white/70 hover:bg-black/50 hover:text-white transition-colors"
            >
              ✕
            </button>

            <div className="px-8 pb-8 pt-6 text-center">
              <div className="mb-2 text-caption uppercase tracking-wider text-gold">Digital Pass</div>
              <h2 className="mb-1 text-h2 font-bold text-offwhite">{selectedTicket.activity?.title}</h2>
              <p className="text-caption text-graytext-light">{userName} · Confirmed</p>

              <div className="mx-auto mt-6 inline-block rounded-xl bg-white p-3 shadow-glow-teal">
                <QRCodeCanvas 
                  value={selectedTicket.id}
                  size={160}
                  level="H"
                  fgColor="#0A0A0A" 
                />
              </div>

              <p className="mt-4 text-[11px] uppercase tracking-widest text-teal">
                Scan at entry
              </p>

              {selectedTicket.activity?.status === 'upcoming' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 w-full text-gold hover:text-gold border border-gold/20 hover:bg-gold/10"
                  onClick={() => copyInviteLink(selectedTicket.activity.id)}
                >
                  Share invite link
                </Button>
              )}

              <div className="mt-6 flex flex-col gap-2 rounded-xl bg-white/[0.03] p-4 text-[13px] text-graytext-light border border-white/5">
                <div className="flex justify-between">
                  <span className="text-graytext-mid">Date</span>
                  <span className="text-offwhite font-medium">{formatDate(selectedTicket.activity?.starts_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-graytext-mid">Time</span>
                  <span className="text-offwhite font-medium">{formatTime(selectedTicket.activity?.starts_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-graytext-mid">Venue</span>
                  <span className="text-offwhite font-medium truncate max-w-[150px]">{selectedTicket.activity?.venue}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Announcements Modal */}
      {activeChatEventId && (
        <EventAnnouncementsModal 
          eventId={activeChatEventId} 
          onClose={() => setActiveChatEventId(null)} 
        />
      )}
    </div>
  )
}
