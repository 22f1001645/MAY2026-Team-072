import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams, useLocation, useSearchParams } from 'react-router-dom'
import { inr } from '../lib/mock'
import { useEvent, useMyRegistrations, useRegister, useUnregister, useAnnouncements, useRespondCollab, useReassignMeetupHead } from '../lib/queries'
import { useSession } from '../lib/session'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, Dialog, Progress, Select, useToast } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cover, daysUntil, formatDate, formatTime, scaleLabel, cx, googleCalendarLink, googleCalendarDayLink } from '../lib/format'
import EventChat from '../components/EventChat'
import CollabStatus from '../components/CollabStatus'

export default function EventDetail() {
  const { id } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const refId = searchParams.get('ref') ?? undefined
  const { id: currentUserId, role, capabilities } = useSession()
  const { currentUser } = useAuth()
  const { addToast } = useToast()
  const { data: e, isLoading, isError, error } = useEvent(id)
  const { data: myRegs = [] } = useMyRegistrations()
  const { data: announcements = [] } = useAnnouncements(id)
  const registerMut = useRegister()
  const unregisterMut = useUnregister()
  const respondCollabMut = useRespondCollab()
  const reassignMut = useReassignMeetupHead()
  const [reassignOpen, setReassignOpen] = useState(false)
  const [reassignUserId, setReassignUserId] = useState('')

  const canManage = role !== 'student' || capabilities?.manageableActivityIds?.includes(id!)

  const [addedToCalendar, setAddedToCalendar] = useState(() => !!id && localStorage.getItem('cal_' + id) === '1')
  const [isChatOpen, setIsChatOpen] = useState(location.state?.openChat || false)

  useEffect(() => {
    if (isChatOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isChatOpen])

  if (isLoading) return <Loading label="Loading event…" />
  if (isError) return <ErrorState error={error} />
  if (!e)
    return (
      <Card className="p-12 text-center">
        <div className="text-h3 text-offwhite">Event not found</div>
        <Link to="/discover" className="mt-3 inline-block text-teal">
          ← Back to discovery
        </Link>
      </Card>
    )

  const registration = myRegs.find((r: any) => r.activity_id === e.id)
  const registered = !!registration
  const isWaitlisted = registration?.status === 'waitlisted'
  const count = e.registered
  const spotsLeft = e.capacity - count
  const plannedTotal = e.budget.reduce((s: any, b: any) => s + b.planned, 0)
  const isPast = e.status === 'completed' || e.status === 'archived'

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

      <Link
        to="/discover"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-graytext-light hover:text-teal"
      >
        ← Discovery feed
      </Link>

      {refId && !registered && (
        <div className="mb-5 rounded-xl2 border border-teal/30 bg-teal/10 px-4 py-3 text-[13px] text-teal">
          You were invited by a friend — register to join them.
        </div>
      )}

      {/* Cover */}
      <div
        className="relative mb-6 flex min-h-[220px] items-end overflow-hidden rounded-xl2 border border-white/5 p-7"
        style={{ background: cover(e.cover) }}
      >
        <div className="grain absolute inset-0" />
        <div className="relative">
          <div className="mb-2 flex flex-wrap gap-2">
            <Badge tone="gold">{scaleLabel[e.scale]}</Badge>
            <Badge tone="teal">{daysUntil(e.startsAt)}</Badge>
            {e.tags.map((t) => (
              <Badge key={t}>{t}</Badge>
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
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="mb-3 text-h3 font-semibold text-gold">About this event</h2>
            <p className="text-body leading-relaxed text-graytext-light">
              {e.description || 'Details coming soon.'}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <InfoRow icon="cal" label="Date" value={formatDate(e.startsAt)} />
              <InfoRow icon="clock" label="Time" value={formatTime(e.startsAt)} />
              <InfoRow icon="pin" label="Venue" value={e.venue} />
              <InfoRow icon="user" label="Organiser" value={e.organiser} />
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-white/10">
              <iframe
                width="100%"
                height="200"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                src={`https://maps.google.com/maps?q=${encodeURIComponent(e.venue + ', ' + e.city)}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
              />
            </div>
          </Card>

          {/* Collaborating Orgs (PROPOSAL-06 Respond UI) */}
          {e.collaborators && e.collaborators.length > 0 && (
            <Card className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-h3 font-semibold text-gold">Collaborating organisations</h2>
                {e.isMegaMeetup && <Badge tone="gold">⭐ Mega Meetup</Badge>}
              </div>
              <div className="space-y-2">
                {e.collaborators.map((c: any) => {
                  const canRespond = c.status === 'pending' && capabilities?.manageableOrgIds?.includes(c.org_id)
                  return (
                    <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-offwhite truncate">{c.org || c.org_id}</span>
                          {c.is_primary && <Badge tone="gold">Primary</Badge>}
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
            </Card>
          )}

          {/* Team Roster (PROPOSAL-04) */}
          {e.teamMembers && e.teamMembers.length > 0 && (
            <Card className="p-6">
              <h2 className="mb-3 text-h3 font-semibold text-gold">Event team</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {e.teamMembers.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-[12px] font-medium text-graytext-light">
                      {(t.member || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-offwhite truncate">{t.member || t.user_id}</div>
                      <div className={`text-[11px] font-semibold ${t.role === 'Meetup Head' ? 'text-gold' : 'text-graytext-mid'}`}>
                        {t.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Organiser-only face of the same object (PRD §16 — one object, two faces) */}

          {canManage && (
            <Card className="border-teal/20 p-6">
              <div className="mb-3 flex items-center gap-2">
                <Badge tone="teal">Organiser view</Badge>
                <span className="text-caption text-graytext-mid">
                  Only visible to your POR
                </span>
              </div>
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
              <div className="mt-4 flex gap-2">
                <Link to={`/events/${e.id}/manage`}>
                  <Button variant="secondary" size="sm">
                    Manage registrations
                  </Button>
                </Link>
                <Link to={`/events/${e.id}/checkin`}>
                  <Button variant="secondary" size="sm">
                    Check-in
                  </Button>
                </Link>
              </div>

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
            </Card>
          )}

          <Dialog open={reassignOpen} onClose={() => setReassignOpen(false)} title="Reassign Meetup Head">
            {(() => {
              const roster = e.teamMembers ?? []
              const currentHead = roster.find((t: any) => t.role === 'Meetup Head')
              const candidates = roster.filter((t: any) => t.role !== 'Meetup Head')
              const newHead = roster.find((t: any) => t.user_id === reassignUserId)
              return (
                <div className="space-y-4">
                  <p className="text-[14px] text-graytext-light">
                    Currently {currentHead ? (currentHead.member ?? currentHead.user_id) : 'unassigned'}.
                  </p>
                  {candidates.length === 0 ? (
                    <p className="text-caption text-graytext-mid">No other team members on the roster to reassign to.</p>
                  ) : (
                    <Select
                      value={reassignUserId}
                      onChange={(evt) => setReassignUserId(evt.target.value)}
                      options={[
                        { label: 'Select a team member…', value: '' },
                        ...candidates.map((t: any) => ({ label: t.member ?? t.user_id, value: t.user_id })),
                      ]}
                    />
                  )}
                  {newHead && (
                    <p role="alert" className="text-caption text-gold">
                      {newHead.member ?? newHead.user_id} will immediately become the sole accountable person for this event's budget and execution.
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
        </div>

        {/* Right: sticky register card */}
        <div>
          <Card className="sticky top-24 p-6">
            <div className="mb-1 flex items-baseline justify-between">
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
                <div className="text-h3 font-semibold text-red-400">❌ Event Cancelled</div>
                <p className="mt-1 text-caption text-red-200/70">
                  This event has been cancelled by the organiser.
                </p>
              </div>
            ) : isPast ? (
              <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-4 text-center text-graytext-light">
                <div className="text-h3 font-semibold text-offwhite">This event has ended</div>
                <p className="mt-1 text-caption">Registration and chat are no longer available.</p>
              </div>
            ) : role === 'student' ? (
              registered ? (
                <div className="mt-5">
                  <div className={`rounded-xl border p-4 text-center ${isWaitlisted ? 'border-warn/30 bg-warn/10' : 'border-teal/30 bg-teal/10'}`}>
                    <div className={`text-h3 font-semibold ${isWaitlisted ? 'text-warn' : 'text-teal'}`}>
                      {isWaitlisted ? "You're on the waitlist ⏳" : "You're in! 🎉"}
                    </div>
                    <p className="mt-1 text-caption text-graytext-light">
                      {isWaitlisted 
                        ? 'We will notify you if a spot opens up.' 
                        : 'A confirmation and reminders will reach you. See you there.'}
                    </p>
                  </div>
                  {/* Share Invite Link */}
                  {!isWaitlisted && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 w-full text-gold hover:text-gold border border-gold/20 hover:bg-gold/10"
                      onClick={() => {
                        const inviteUrl = `${window.location.origin}/events/${e.id}?ref=${currentUser?.id ?? currentUserId ?? ''}`
                        navigator.clipboard.writeText(inviteUrl)
                        addToast('Invite link copied! Earn points for every friend who registers.')
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-2 inline-block">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                      </svg>
                      Share invite link
                    </Button>
                  )}

                  <div className="mt-2 flex gap-2">
                    <Button
                      variant="ghost"
                      className="w-full"
                      disabled={unregisterMut.isPending}
                      onClick={() => {
                        localStorage.removeItem('cal_' + e.id)
                        unregisterMut.mutate(e.id)
                      }}
                    >
                      {unregisterMut.isPending ? 'Cancelling…' : 'Cancel registration'}
                    </Button>
                    {!isWaitlisted && (
                      <a
                        href={addedToCalendar ? googleCalendarDayLink(e.startsAt) : googleCalendarLink({ title: e.title, startsAt: e.startsAt, venue: e.venue, description: e.description })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full"
                        onClick={() => {
                          if (!addedToCalendar) {
                            localStorage.setItem('cal_' + e.id, '1')
                            setAddedToCalendar(true)
                          }
                        }}
                      >
                        <Button variant="ghost" className="w-full">
                          {addedToCalendar ? 'View in calendar' : 'Add to calendar'}
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <div className="mt-5">
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={registerMut.isPending}
                    onClick={() => registerMut.mutate({ id: e.id, referredBy: refId })}
                  >
                    {registerMut.isPending
                      ? 'Processing…'
                      : spotsLeft <= 0
                        ? 'Join Waitlist'
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
                You're viewing this as an organiser. Registration is the student's face
                of the same event.
              </div>
            )}

            <div className="mt-5 space-y-2 border-t border-white/5 pt-4 text-[13px]">
              <Perk text="Meals / refreshments included" />
              <Perk text="Meet people from your city IRL" />
              <Perk text="Contribution points on attendance" />
            </div>
            {!isPast && e.status !== 'cancelled' && (
              <div className="mt-6">
                <Button
                  variant="secondary"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => setIsChatOpen(true)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  Open Event Discussion
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Chat Drawer & Backdrop (rendered via Portal to escape stacking context) */}
      {createPortal(
        <>
          {isChatOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
              onClick={() => setIsChatOpen(false)}
            />
          )}

          <div
            className={cx(
              "fixed top-0 right-0 z-50 h-full w-[420px] max-w-[100vw] bg-onyx border-l border-white/10 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col",
              isChatOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
              <h2 className="text-h3 font-bold text-offwhite">Event Chat</h2>
              <button
                onClick={() => setIsChatOpen(false)}
                className="text-graytext-mid hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 w-10 h-10 flex items-center justify-center transition-colors shadow-lg"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-hidden p-6 pb-8">
              <EventChat eventId={e.id} isRegistered={registered} />
            </div>
          </div>
        </>,
        document.body
      )}
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
