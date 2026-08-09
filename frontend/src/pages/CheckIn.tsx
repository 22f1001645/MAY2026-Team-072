import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useCheckIn, useEvent, useRoster } from '../lib/queries'
import { Badge, Button, Card, Progress, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx } from '../lib/format'

// FR-D6: organiser marks registered students as attended (check-in) →
// the attendance record that powers points & fee utilisation
export default function CheckIn() {
  const { id } = useParams()
  const { data: e, isLoading, isError, error } = useEvent(id)
  const { data: roster = [] } = useRoster(id)
  const checkInMut = useCheckIn()
  const [q, setQ] = useState('')

  if (isLoading) return <Loading label="Loading attendees…" />
  if (isError) return <ErrorState error={error} />
  if (!e) return <div>Event not found</div>

  const checkedIn = roster.filter((a: any) => a.attended).length
  const filtered = roster.filter((a: any) =>
    (a.student ?? '').toLowerCase().includes(q.toLowerCase()),
  )

  const toggle = (reg: any) => {
    if (reg.attended || checkInMut.isPending) return // check-in is one-way
    checkInMut.mutate({ id: e.id, ids: [reg.id] })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/events/${e.id}/manage`} className="mb-4 inline-block text-[13px] text-graytext-light hover:text-teal">
        ← Manage event
      </Link>
      <SectionTitle
        eyebrow={e.city + ' · Live check-in'}
        title="Attendance"
        sub="Tap a name as people arrive. Each check-in awards points and marks their ₹200 fee as used."
      />

      {/* Live counter */}
      <Card className="mb-6 p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-caption uppercase tracking-wider text-graytext-mid">Checked in</div>
            <div className="text-[44px] font-bold leading-none text-teal">
              {checkedIn}
              <span className="text-[20px] text-graytext-mid">/{roster.length}</span>
            </div>
          </div>
          <Badge tone="teal">
            {roster.length ? Math.round((checkedIn / roster.length) * 100) : 0}% arrived
          </Badge>
        </div>
        <div className="mt-4">
          <Progress value={checkedIn} max={roster.length || 1} />
        </div>
      </Card>

      <div className="relative mb-4">
        <input
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          placeholder="Search name…"
          className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/40 focus:outline-none"
        />
        <svg className="absolute left-4 top-3.5 text-graytext-mid" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" strokeLinecap="round" />
        </svg>
      </div>

      {roster.length === 0 ? (
        <Card className="p-10 text-center text-graytext-light">No registrations to check in.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a: any) => (
            <button
              key={a.id}
              onClick={() => toggle(a)}
              disabled={a.attended}
              className={cx(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-300 ease-material',
                a.attended
                  ? 'border-teal/40 bg-teal/10'
                  : 'border-white/8 bg-white/[0.02] hover:border-teal/30',
              )}
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-teal/12 text-[13px] font-bold text-teal">
                {(a.student ?? '?').split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-medium text-offwhite">{a.student}</div>
                <div className="font-mono text-caption text-graytext-mid">
                  {a.id.slice(0, 8).toUpperCase()}
                </div>
              </div>
              <div
                className={cx(
                  'grid h-8 w-8 place-items-center rounded-full transition-colors',
                  a.attended ? 'bg-teal text-onyx' : 'border border-white/20 text-graytext-mid',
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-caption text-graytext-mid">
        Check-in is one-way — each tap writes an attendance record and awards points.
      </p>
    </div>
  )
}
