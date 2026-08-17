import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import { useMyPoints, useMyRegistrations, useUpdateProfile, useCities } from '../lib/queries'
import { Badge, Button, Card, Input, SectionTitle, StatCard, useToast } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { coverForScale, daysUntil, formatDate, formatTime, cx, googleCalendarLink, googleCalendarDayLink } from '../lib/format'
import { useSession } from '../lib/session'
import { useAuth } from '../lib/auth'

export default function MyRegistrations() {
  const { data: regs = [], isLoading, isError, error } = useMyRegistrations()
  const { data: points } = useMyPoints()
  const { id: currentUserId, name: userName, city: userCity, role } = useSession()
  const { updateCurrentUser, currentUser } = useAuth()
  const { data: allCities = [] } = useCities()
  const { addToast } = useToast()

  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'waitlisted'>('all')
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')
  const [selectedTicket, setSelectedTicket] = useState<any>(null)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const [editCity, setEditCity] = useState(userCity)
  const [, forceCalendarRerender] = useState(0)
  const updateProfile = useUpdateProfile()


  useEffect(() => {
    setEditCity(userCity)
  }, [userCity])

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
    const inviteUrl = `${window.location.origin}/events/${activityId}?ref=${currentUser?.id ?? currentUserId ?? ''}`
    navigator.clipboard.writeText(inviteUrl)
    addToast('Invite link copied! Earn points for every friend who registers.', 'success')
  }

  const upcoming = regs.filter((r: any) => r.activity?.status === 'upcoming')
  const attended = regs.filter((r: any) => r.attended).length

  const handleSavePrefs = async () => {
    try {
      await updateProfile.mutateAsync({ city: editCity })
      updateCurrentUser({ city: editCity })
      setPrefsOpen(false)
    } catch (e) {
      alert("Failed to update profile")
    }
  }

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

  const initials = userName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'ST'

  return (
    <div className="pb-12">
      {/* Unified Profile Banner */}
      <section className="relative mb-10 overflow-hidden rounded-xl2 border border-white/5 bg-onyx/80">
        <div className="grain absolute inset-0 rounded-xl2 mix-blend-overlay opacity-30" />
        <div className="relative p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8 justify-between">
          <div className="flex items-center gap-6 text-left">
            <div className="h-24 w-24 shrink-0 rounded-full bg-gradient-to-br from-teal to-emerald p-[3px] shadow-glow-teal">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-onyx text-h1 font-bold text-offwhite">
                {initials}
              </div>
            </div>
            <div>
              <div className="mb-1 text-caption uppercase tracking-wider text-teal font-semibold">
                {role === 'organiser' ? 'Organiser Profile' : 'Student Profile'}
              </div>
              <h1 className="text-h1 font-bold text-offwhite leading-tight">{userName}</h1>
              <div className="mt-2 flex items-center gap-3 text-graytext-light">
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>
                  {userCity}
                </span>
                <span className="text-white/20">•</span>
                <button onClick={() => setPrefsOpen(true)} className="text-teal hover:text-teal-accent hover:underline transition-colors flex items-center gap-1">
                  Edit Profile
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                </button>
              </div>
            </div>
          </div>

          
          <div className="flex gap-4 sm:gap-8 bg-black/30 p-6 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto">
            <div className="text-center min-w-[80px]">
              <div className="text-h2 font-bold text-offwhite">{upcoming.length}</div>
              <div className="text-caption text-graytext-mid uppercase tracking-wider mt-1">Upcoming</div>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center min-w-[80px]">
              <div className="text-h2 font-bold text-gold">{attended}</div>
              <div className="text-caption text-graytext-mid uppercase tracking-wider mt-1">Attended</div>
            </div>
            <div className="w-px bg-white/10" />
            <div className="text-center min-w-[80px]">
              <div className="text-h2 font-bold text-teal">{points?.total ?? 0}</div>
              <div className="text-caption text-graytext-mid uppercase tracking-wider mt-1">Points</div>
            </div>
          </div>
        </div>
      </section>

      {/* Edit Profile Modal */}
      {prefsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
          <div className="absolute inset-0" onClick={() => setPrefsOpen(false)} />
          <div className="relative w-full max-w-sm rounded-xl2 border border-white/10 bg-onyx shadow-2xl p-6 overflow-hidden scale-100 animate-[fadeUp_0.3s_ease-out]">
            <h2 className="text-h3 font-bold text-offwhite mb-4">Edit Profile</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-caption font-medium text-graytext-mid">Home City</label>
                <select
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-[14px] text-offwhite focus:border-teal focus:outline-none appearance-none"
                  style={{ background: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23a1a1aa\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E") no-repeat right 0.75rem center/12px 12px, rgba(0, 0, 0, 0.4)' }}
                >
                  <option value="" disabled className="bg-onyx">Select your city</option>
                  {allCities.map((c) => (
                    <option key={c.id} value={c.name} className="bg-onyx">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button variant="ghost" onClick={() => setPrefsOpen(false)}>Cancel</Button>
                <Button disabled={updateProfile.isPending} onClick={handleSavePrefs}>Save Changes</Button>
              </div>
            </div>
          </div>
        </div>
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
                    <Badge tone="teal">{daysUntil(a.starts_at)}</Badge>
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
                    <div className="text-[13px] font-medium text-offwhite">{formatDate(a.starts_at)}</div>
                    <div className="text-[12px] text-graytext-light">{formatTime(a.starts_at)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-graytext-mid mb-0.5">Location</div>
                    <div className="text-[13px] font-medium text-offwhite line-clamp-1">{a.venue}</div>
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex gap-2">
                    <Link to={`/events/${a.id}`} state={{ openChat: true }}>
                      <button className="h-9 w-9 rounded-full bg-white/5 flex items-center justify-center text-teal hover:bg-teal hover:text-onyx transition-colors" title="Event Chat">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                      </button>
                    </Link>
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
                  <div className="text-[14px] font-bold text-teal flex items-center gap-1">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    Confirmed
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Date</div>
                  <div className="text-[14px] font-bold text-gray-900">{formatDate(selectedTicket.activity?.starts_at)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Time</div>
                  <div className="text-[14px] font-bold text-gray-900">{formatTime(selectedTicket.activity?.starts_at)}</div>
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
