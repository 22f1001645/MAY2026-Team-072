import { Link, useParams } from 'react-router-dom'
import { inr } from '../lib/mock'
import { useEvent, useMyRegistrations, useRegister, useUnregister } from '../lib/queries'
import { useSession } from '../lib/session'
import { Badge, Button, Card, Progress } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cover, daysUntil, formatDate, formatTime, scaleLabel } from '../lib/format'

export default function EventDetail() {
  const { id } = useParams()
  const { role } = useSession()
  const { data: e, isLoading, isError, error } = useEvent(id)
  const { data: myRegs = [] } = useMyRegistrations()
  const registerMut = useRegister()
  const unregisterMut = useUnregister()

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

  const registered = myRegs.some((r: any) => r.activity_id === e.id)
  const count = e.registered
  const spotsLeft = e.capacity - count
  const plannedTotal = e.budget.reduce((s, b) => s + b.planned, 0)

  return (
    <div>
      <Link
        to="/discover"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-graytext-light hover:text-teal"
      >
        ← Discovery feed
      </Link>

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
          </Card>

          {/* Updates — broadcasts to registrants (FR-D3) */}
          <Card className="p-6">
            <h2 className="mb-4 text-h3 font-semibold text-gold">Updates from the organiser</h2>
            <div className="space-y-4">
              <Update
                at="2 days ago"
                text="Registration is open! Bus pickup points will be shared with confirmed registrants closer to the date."
              />
              <Update
                at="5 days ago"
                text="We crossed 150 registrations — thank you. Meals confirmed for everyone who signs up."
              />
            </div>
          </Card>

          {/* Organiser-only face of the same object (PRD §16 — one object, two faces) */}
          {role !== 'student' && (
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
            </Card>
          )}
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

            {role === 'student' ? (
              registered ? (
                <div className="mt-5">
                  <div className="rounded-xl border border-teal/30 bg-teal/10 p-4 text-center">
                    <div className="text-h3 font-semibold text-teal">You're in! 🎉</div>
                    <p className="mt-1 text-caption text-graytext-light">
                      A confirmation and reminders will reach you. See you there.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="mt-3 w-full"
                    disabled={unregisterMut.isPending}
                    onClick={() => unregisterMut.mutate(e.id)}
                  >
                    {unregisterMut.isPending ? 'Cancelling…' : 'Cancel registration'}
                  </Button>
                </div>
              ) : (
                <div className="mt-5">
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={registerMut.isPending || spotsLeft <= 0}
                    onClick={() => registerMut.mutate(e.id)}
                  >
                    {registerMut.isPending
                      ? 'Registering…'
                      : spotsLeft <= 0
                        ? 'Event full'
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
          </Card>
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

function Update({ at, text }: { at: string; text: string }) {
  return (
    <div className="border-l-2 border-teal/40 pl-4">
      <div className="text-caption text-graytext-mid">{at}</div>
      <div className="text-[14px] text-graytext-light">{text}</div>
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
