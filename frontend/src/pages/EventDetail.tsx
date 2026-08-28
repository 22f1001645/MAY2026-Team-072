import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { inr } from '../lib/mock'
import { useEvent, useMyRegistrations, useRegister, useUnregister, useAnnouncements, useRespondCollab, useReassignMeetupHead, useMyFeedback, useSubmitFeedbackMutation } from '../lib/queries'
import { useSession } from '../lib/session'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, Dialog, Progress, Select, useToast } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cover, daysUntil, formatDate, formatTime, scaleLabel, cx, googleCalendarLink, googleCalendarDayLink } from '../lib/format'
import EventChat from '../components/EventChat'
import EventChannelSection from '../components/EventChannelSection'
import CollabStatus from '../components/CollabStatus'
import { viewFromPathname } from '../components/ViewSwitcher'
import PublicEventLanding from './PublicEventLanding'
import InviteSearchBlock from '../components/InviteSearchBlock'
import { uploadUrl } from '../lib/api'

/**
 * EventDetail also serves the shared registration link, which a visitor opens
 * with no session at all (OD-3). Two rules follow from that:
 *
 *  - Nothing here may assume a payload key. The anonymous response carries no
 *    budget, no collaborators and no team roster (T-05-33), so every one of
 *    those sections renders on presence rather than on an assumption.
 *  - No session-only query may fire without a session. A 401 is read by the
 *    request pipeline as an expired session and redirects to /login, which
 *    would throw the visitor off the page the link was meant to open.
 */
export default function EventDetail() {
  const { id } = useParams()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const refId = searchParams.get('ref') ?? undefined
  const { id: currentUserId, role, capabilities } = useSession()
  const { currentUser } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const { data: e, isLoading, isError, error } = useEvent(id)
  const { data: myRegs = [] } = useMyRegistrations(!!currentUser)
  const { data: announcements = [] } = useAnnouncements(currentUser ? id : undefined)
  const registerMut = useRegister()
  const unregisterMut = useUnregister()
  const respondCollabMut = useRespondCollab()
  const reassignMut = useReassignMeetupHead()
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignUserId, setReassignUserId] = useState('')

  // The `currentUser` term is stated rather than inferred: without it an
  // anonymous visitor whose `role` is not 'student' would open the organiser
  // face of the page. It cannot happen today (role falls back to 'student'),
  // which is exactly why it is worth pinning here. We also enforce that they 
  // must be actively viewing the page from the /organiser path via the toggle.
  const isOrganiser = !!currentUser && (role !== 'student' || capabilities?.manageableActivityIds?.includes(id!))
  const canManage = viewFromPathname(location.pathname) === 'organiser' && isOrganiser

  const [addedToCalendar, setAddedToCalendar] = useState(() => !!id && localStorage.getItem('cal_' + id) === '1')

  if (isLoading) return <Loading label="Loading event…" />
  if (isError) return <ErrorState error={error} />
  if (!e)
    return (
      <Card className="p-12 text-center">
        <div className="text-h3 text-offwhite">Event not found</div>
        <Link to="/discover" className="mt-3 inline-block text-teal">
          â† Back to discovery
        </Link>
      </Card>
    )

  // RENDER CINEMATIC PUBLIC LANDING PAGE IF NOT LOGGED IN
  if (!currentUser) {
    return <PublicEventLanding e={e} refId={refId} />
  }

  const registration = myRegs.find((r: any) => r.activity_id === e.id)
  const registered = !!registration
  const isWaitlisted = registration?.status === 'waitlisted'
  const count = e.registered
  const spotsLeft = e.capacity - count
  const plannedTotal = e.budget.reduce((s: any, b: any) => s + b.planned, 0)
  const isPast = e.status === 'completed' || e.status === 'archived'
  const isWaitlistClosed = new Date(e.startsAt).getTime() - Date.now() < 24 * 60 * 60 * 1000

  return (
    <div>
      {/* Referral Banner */}
      {refId && !registered && !isPast && (
        <div className="mb-4 rounded-xl border border-teal/20 bg-teal/10 p-4 text-center backdrop-blur-xl shadow-lg">
          <div className="text-[14px] font-medium text-teal">
            🎉 A friend invited you to join them at this event!
          </div>
        </div>
      )}



      {currentUser && (
        <Link
          to={viewFromPathname(location.pathname) === 'organiser' ? '/organiser' : '/discover'}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-bold tracking-widest uppercase text-graytext-mid backdrop-blur-md transition-all duration-300 hover:border-teal/30 hover:bg-teal/10 hover:text-teal hover:shadow-[0_0_15px_rgba(92,230,201,0.15)] group"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform duration-300 group-hover:-translate-x-1">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          {viewFromPathname(location.pathname) === 'organiser' ? 'Back to Dashboard' : 'Back to Discover'}
        </Link>
      )}

      {refId && !registered && (
        <div className="mb-5 rounded-xl2 border border-teal/30 bg-teal/10 px-4 py-3 text-[13px] text-teal">
          You were invited by a friend — register to join them.
        </div>
      )}

      {/* Cover / Poster */}
      <div
        className="relative mb-6 flex min-h-[220px] items-end overflow-hidden rounded-xl2 border border-white/5 p-7 bg-200 animate-gradient-shift"
        style={!e.posterName ? { backgroundImage: cover(e.cover) } : {}}
      >
        {e.posterName && (
          <img 
            src={uploadUrl(e.posterName)} 
            alt={e.title} 
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        {/* Dark gradient overlay so the text remains readable over the poster */}
        {e.posterName && <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />}
        {!e.posterName && <div className="grain absolute inset-0" />}
        <div className="relative">
          <div className="mb-2 flex flex-wrap gap-2">
            {e.proposalStatus !== 'approved' && (
              <Badge tone="warn" className="shadow-lg shadow-warn/20 animate-pulse">
                Pending Approval
              </Badge>
            )}
            <Badge tone="gold">{scaleLabel[e.scale]}</Badge>
            <Badge tone="teal">{daysUntil(e.startsAt)}</Badge>
            {e.tags.map((t) => (
              <Badge key={t} tone="neutral">{t}</Badge>
            ))}
          </div>
          <div className="text-caption uppercase tracking-widest text-offwhite/70">
            {e.org} · {e.city}
          </div>
          <h1 className="mt-1 text-h1 font-bold text-offwhite">{e.title}</h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: details */}
        <div className="space-y-16 pb-12">
          <div>
            <h2 className="mb-6 text-[28px] font-extrabold text-white tracking-tight">About this event</h2>
            <p className="text-body leading-relaxed text-graytext-light text-[15px]">
              {e.description || 'Details coming soon.'}
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <InfoRow icon="cal" label="Date" value={formatDate(e.startsAt)} />
              <InfoRow icon="clock" label="Time" value={formatTime(e.startsAt)} />
              <InfoRow icon="pin" label="Venue" value={e.venue} />
              <InfoRow icon="user" label="Organiser" value={e.organiser} />
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 shadow-inner">
              <iframe
                width="100%"
                height="200"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(e.venue + ', ' + e.city)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
          </div>

          {/* FEEDBACK-02: attended students can rate after the event */}
          <FeedbackForm activityId={id!} myRegs={myRegs} eventStartsAt={e.startsAt} />

          {/* Collaborating Orgs (PROPOSAL-06 Respond UI) */}
          {e.collaborators && e.collaborators.length > 0 && (
            <div>
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-[24px] font-extrabold text-white tracking-tight">Collaborating organisations</h2>
                {e.isMegaMeetup && <Badge tone="gold" className="shadow-lg shadow-gold/10">â­ Mega Meetup</Badge>}
              </div>
              <div className="space-y-2">
                {e.collaborators.map((c: any) => {
                  const canRespond = c.status === 'pending' && capabilities?.manageableOrgIds?.includes(c.orgId)
                  return (
                    <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-offwhite truncate">{c.org || c.orgId}</span>
                          {c.isPrimary && <Badge tone="gold">Primary</Badge>}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <CollabStatus status={c.status} />
                        </div>
                      </div>
                      
                      {canRespond && (
                        <div className="flex items-center gap-2 sm:ml-auto">
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={respondCollabMut.isPending}
                            onClick={() => respondCollabMut.mutate({ activityId: e.id, collabId: c.id, status: 'declined' })}
                          >
                            Decline
                          </Button>
                          <Button
                            size="sm"
                            disabled={respondCollabMut.isPending}
                            onClick={() => respondCollabMut.mutate({ activityId: e.id, collabId: c.id, status: 'accepted' })}
                          >
                            Accept Invite
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Team Roster (PROPOSAL-04) */}
          {e.teamMembers && e.teamMembers.length > 0 && (
            <div>
              <h2 className="mb-6 text-[24px] font-extrabold text-white tracking-tight">Event team</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {e.teamMembers.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[12px] font-medium text-graytext-light">
                      {(t.member || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-offwhite truncate">{t.member || t.userId}</div>
                      <div className={`text-[11px] font-semibold ${t.role === 'Meetup Head' ? 'text-gold' : 'text-graytext-mid'}`}>
                        {t.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Organiser-only face of the same object (PRD A 16 — one object, two faces) */}

          {canManage && (
            <div className="relative p-8 rounded-3xl border border-teal/20 bg-teal/5 shadow-[0_8px_30px_rgba(92,230,201,0.08)] backdrop-blur-3xl">
              <div className="mb-4 flex items-center gap-3">
                <Badge tone="teal" className="shadow-lg shadow-teal/10">Organiser view</Badge>
                <span className="text-caption text-graytext-mid">
                  Only visible to your POR
                </span>
              </div>
              {/* Only rendered when the payload actually carried budget lines —
                  the anonymous preview omits the key entirely (T-05-33). */}
              {e.budget.length > 0 && (
                <>
                  <h2 className="mb-3 text-h3 font-semibold text-offwhite">
                    Line-item budget · {inr(plannedTotal)}
                  </h2>
                  <div className="space-y-2">
                    {e.budget.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2 text-[13px]"
                      >
                        <span className="text-graytext-light">{b.label}</span>
                        <span className="font-semibold text-offwhite">{inr(b.planned)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              {e.proposalStatus === 'approved' && (
                <div className="mt-4 flex gap-2">
                  <Link to={`/events/${e.id}/manage`}>
                    <Button variant="secondary" size="sm">
                      Manage Event
                    </Button>
                  </Link>
                </div>
              )}

              {/* Reassign Meetup Head (PROPOSAL-05) */}
              <div className="mt-6 border-t border-white/5 pt-4">
                <h3 className="mb-2 text-[14px] font-semibold text-offwhite">Reassign Meetup Head</h3>
                <p className="mb-3 text-caption text-graytext-light leading-relaxed">
                  Transfer the Meetup Head role to someone else on the team roster.
                </p>
                <Button size="sm" onClick={() => { setReassignUserId(''); setReassignOpen(true) }}>
                  Reassign
                </Button>
              </div>
            </div>
          )}

          <Dialog open={reassignOpen} onClose={() => setReassignOpen(false)} title="Reassign Meetup Head">
            {(() => {
              const roster = e.teamMembers ?? []
              const currentHead = roster.find((t: any) => t.role === 'Meetup Head')
              const candidates = roster.filter((t: any) => t.role !== 'Meetup Head')
              const newHead = roster.find((t: any) => t.userId === reassignUserId)
              return (
                <div className="space-y-4">
                  <p className="text-[14px] text-graytext-light">
                    Currently {currentHead ? (currentHead.member ?? currentHead.userId) : 'unassigned'}.
                  </p>
                  {candidates.length === 0 ? (
                    <p className="text-caption text-graytext-mid">No other team members on the roster to reassign to.</p>
                  ) : (
                    <Select
                      value={reassignUserId}
                      onChange={(evt) => setReassignUserId(evt.target.value)}
                      options={[
                        { label: 'Select a team member…', value: '' },
                        ...candidates.map((t: any) => ({ label: t.member ?? t.userId, value: t.userId })),
                      ]}
                    />
                  )}
                  {newHead && (
                    <p role="alert" className="text-caption text-gold">
                      {newHead.member ?? newHead.userId} will immediately become the sole accountable person for this event's budget and execution.
                    </p>
                  )}
                  {reassignMut.isError && (
                    <p role="alert" className="text-caption text-red-300">
                      {(reassignMut.error as any).message || 'Failed to reassign'}
                    </p>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setReassignOpen(false)}>Cancel</Button>
                    <Button
                      size="sm"
                      disabled={!reassignUserId || reassignMut.isPending}
                      onClick={() => {
                        reassignMut.mutate(
                          { activityId: e.id, newUserId: reassignUserId },
                          { onSuccess: () => setReassignOpen(false) },
                        )
                      }}
                    >
                      {reassignMut.isPending ? 'Reassigning…' : 'Confirm reassignment'}
                    </Button>
                  </div>
                </div>
              )
            })()}
          </Dialog>

          {/* CHAT-01/02 — same audience as the chat button above, but
           *  deliberately NOT gated on `!isPast`. The team can still answer
           *  a question after the event ends (D-17), and this section is
           *  the only surface on which the person who asked it reads the
           *  answer. Past the event it renders closed: thread visible,
           *  composers gone. */}
          {currentUser &&
            e.status !== 'cancelled' &&
            ((registered && !isWaitlisted) || canManage) && (
              <div className="mt-6 border-t border-white/5 pt-10">
                <h2 className="mb-6 text-[24px] font-extrabold text-white tracking-tight">Event Polls & Q&A</h2>
                <EventChannelSection
                  activityId={e.id}
                  canManage={canManage}
                  isOrganiser={isOrganiser}
                  closed={isPast}
                />
              </div>
            )}
        </div>

        {/* Right: sticky register card */}
        <div>
          {e.proposalStatus !== 'approved' ? (
            <Card className="sticky top-32 p-6 md:p-8 bg-onyx/60 backdrop-blur-3xl border-warn/20 shadow-[0_8px_30px_rgba(251,191,36,0.08)]">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-warn/10 text-warn">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <h3 className="text-[16px] font-bold text-white">Pending Approval</h3>
              </div>
              <p className="text-[13px] leading-relaxed text-graytext-light">
                This event is currently being reviewed by the admin team. Once approved, it will automatically go live on the city feed and students will be able to register.
              </p>
            </Card>
          ) : (
            <div className="sticky top-32 p-8 rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-3xl shadow-[0_32px_64px_rgba(0,0,0,0.5)]">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="text-caption uppercase tracking-wider text-graytext-mid">
                  Attendance
                </span>
                <span className="text-caption text-teal">{spotsLeft} spots left</span>
              </div>
              <div className="mb-2 text-h2 font-bold text-offwhite">
                {count}
                <span className="text-graytext-mid">/{e.capacity}</span>
              </div>
              <Progress value={count} max={e.capacity} />

              {e.status === 'cancelled' ? (
                <div className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center">
                  <div className="text-h3 font-semibold text-red-400">🚨 Event Cancelled</div>
                  <p className="mt-1 text-caption text-red-200/70">
                    This event has been cancelled by the organiser.
                  </p>
                </div>
                ) : isPast ? (
                <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-center text-graytext-light">
                  <div className="text-h3 font-semibold text-offwhite">This event has ended</div>
                  <p className="mt-1 text-caption">Registration is no longer available.</p>
                </div>
              ) : !canManage ? (
                registered ? (
                  <div className="mt-5">
                    <div className="rounded-xl border border-teal/20 bg-teal/10 p-4 text-center">
                      <div className={`text-h3 font-semibold ${isWaitlisted ? 'text-warn' : 'text-teal'}`}>
                        {isWaitlisted ? "You're on the waitlist 🕒" : "You're in! 🎉"}
                      </div>
                      <p className="mt-1 text-caption text-graytext-light">
                        {isWaitlisted 
                          ? 'We will notify you if a spot opens up.' 
                          : 'A confirmation and reminders will reach you. See you there.'}
                      </p>
                    </div>
                    {/* Invite Friends Block */}
                    {!isWaitlisted && (
                      <div className="mt-4">
                        <InviteSearchBlock eventId={e.id} />
                      </div>
                    )}

                    <div className="mt-2 flex gap-2">
                        <Button
                          variant="ghost"
                          className="w-full"
                          disabled={unregisterMut.isPending || registration?.attended}
                          title={registration?.attended ? "You cannot cancel after you have checked in." : undefined}
                          onClick={() => {
                            localStorage.removeItem('cal_' + e.id)
                            setAddedToCalendar(false)
                            unregisterMut.mutate(e.id)
                          }}
                        >
                          {unregisterMut.isPending ? 'Cancelling…' : (registration?.attended ? 'Registration locked (Checked in)' : 'Cancel registration')}
                        </Button>
                      {!isWaitlisted && (
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            const url = addedToCalendar 
                              ? googleCalendarDayLink(e.startsAt) 
                              : googleCalendarLink({ title: e.title, startsAt: e.startsAt, venue: e.venue, description: e.description })
                            
                            window.open(url, '_blank')
                            
                            if (!addedToCalendar) {
                              localStorage.setItem('cal_' + e.id, '1')
                              setAddedToCalendar(true)
                            }
                          }}
                        >
                          {addedToCalendar ? 'View in calendar' : 'Add to calendar'}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="mt-5">
                    <Button
                      className="w-full"
                      size="lg"
                      disabled={registerMut.isPending || (spotsLeft <= 0 && isWaitlistClosed)}
                      onClick={() => {
                        // A visitor from a shared link signs in first and comes
                        // back here — the same router-state idiom the session
                        // expiry flow uses. The register endpoint stays behind
                        // @auth_required either way; this only saves them a
                        // failed request and a lost page (T-05-35).
                        if (!currentUser) {
                          navigate('/login', { state: { from: location.pathname } })
                          return
                        }
                        registerMut.mutate({ id: e.id, referredBy: refId })
                      }}
                    >
                      {registerMut.isPending
                        ? 'Processing…'
                        : spotsLeft <= 0
                          ? (isWaitlistClosed ? 'At Capacity' : 'Join Waitlist')
                          : "Register — it's free"}
                    </Button>
                    {registerMut.isError && (
                      <p className="mt-2 text-center text-caption text-red-300">
                        {(registerMut.error as Error).message}
                      </p>
                    )}
                    <p className="mt-3 text-center text-caption text-graytext-mid">
                      Headcount recorded · reminders sent · earn points on check-in
                    </p>
                  </div>
                )
              ) : (
                <div className="mt-5 rounded-xl border border-white/8 bg-white/[0.03] p-4 text-center text-caption text-graytext-light">
                  Organiser Mode Active. Attendee ticketing and registration features are hidden in this view.
                </div>
              )}

              <div className="mt-5 space-y-2 border-t border-white/5 pt-4 text-[13px]">
                <Perk text="Meals / refreshments included" />
                <Perk text="Meet people from your city IRL" />
                <Perk text="Contribution points on attendance" />
              </div>
              {currentUser && e.status !== 'cancelled' && (
                <div className="mt-6">
                  {((registered && !isWaitlisted) || canManage) && (
                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-[14px] font-medium text-offwhite transition-colors hover:bg-white/10"
                      onClick={() => setSearchParams(prev => { prev.set('chat', e.id); return prev; })}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      {isPast ? 'View chat history' : 'Event chat'}
                    </button>
                  )}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const paths: Record<string, string> = {
    cal: 'M3 5h18v16H3zM16 3v4M8 3v4M3 10h18',
    clock: 'M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z',
    pin: 'M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z',
    user: 'M4 21a8 8 0 0 1 16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  }
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal/10 text-teal">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d={paths[icon]} />
        </svg>
      </div>
      <div>
        <div className="text-caption uppercase tracking-wider text-graytext-mid">{label}</div>
        <div className="text-[14px] text-offwhite">{value}</div>
      </div>
    </div>
  )
}

function Perk({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 text-graytext-light">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5CE6C9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m5 12 4 4L19 6" />
      </svg>
      {text}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FEEDBACK-02: attendee feedback form
// ---------------------------------------------------------------------------

function FeedbackForm({
  activityId,
  myRegs,
  eventStartsAt,
}: {
  activityId: string
  myRegs: any[]
  eventStartsAt: string
}) {
  const myReg = myRegs.find((r: any) => r.activityId === activityId || r.activity_id === activityId)
  const attended = myReg?.attended === true
  const eventPast = new Date(eventStartsAt) < new Date()

  const { data: existing } = useMyFeedback(attended && eventPast ? activityId : undefined)
  const submitMut = useSubmitFeedbackMutation()
  const { addToast } = useToast()
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  if (!attended || !eventPast) return null

  if (existing?.submitted || submitMut.isSuccess) {
    return (
      <Card className="p-6 mb-4">
        <div className="flex items-center gap-3">
          <Badge tone="success">Feedback Submitted ✓</Badge>
          <span className="text-[14px] text-graytext-light">
            {'★'.repeat(existing?.rating ?? rating)}{'☆'.repeat(5 - (existing?.rating ?? rating))}
          </span>
        </div>
        <p className="mt-1 text-[13px] text-graytext-mid">
          Thank you for your feedback!
        </p>
      </Card>
    )
  }

  const handleSubmit = () => {
    submitMut.mutate(
      { activityId, body: { rating, comment: comment || undefined } },
      { onSuccess: () => addToast('Feedback submitted — thank you!') },
    )
  }

  return (
    <Card className="p-6 mb-4">
      <h3 className="text-h3 font-semibold text-gold mb-1">Rate This Event</h3>
      <p className="text-[13px] text-graytext-mid mb-4">
        How was your experience? Your feedback helps future attendees.
      </p>
      <div
        role="radiogroup"
        aria-label="Event rating"
        className="flex gap-2 mb-4"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            role="radio"
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            aria-checked={rating === n}
            onClick={() => setRating((r) => (r === n ? 0 : n))}
            className={`text-3xl cursor-pointer transition-colors select-none ${
              n <= rating ? 'text-[#FFD700]' : 'text-white/20 hover:text-white/50'
            }`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="w-full rounded-lg border border-white/10 bg-black/40 p-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal focus:outline-none resize-none"
        placeholder="Share your thoughts (optional)"
        rows={3}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="mt-4 flex justify-end">
        <Button
          disabled={rating === 0 || submitMut.isPending}
          onClick={handleSubmit}
        >
          {submitMut.isPending ? 'Submitting…' : 'Submit Feedback'}
        </Button>
      </div>
    </Card>
  )
}


