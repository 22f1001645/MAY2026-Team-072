import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { TASKS } from '../lib/mock'
import { useCancelEvent, useEvent, useRoster, useUpdateEvent } from '../lib/queries'
import { Badge, Button, Card, Input, Progress, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import EventAnnouncementsModal from '../components/EventAnnouncementsModal'
import { cx, daysUntil } from '../lib/format'

// FR-F1 (thin): registration list + basic task assignment
export default function ManageEvent() {
  const { id } = useParams()
  const { data: e, isLoading, isError, error } = useEvent(id)
  const { data: roster = [] } = useRoster(id)
  const [tasks, setTasks] = useState(TASKS) // v1 tasks are thin — local, not persisted
  const [tab, setTab] = useState<'roster' | 'referrers' | 'tasks'>('roster')
  const [activeBroadcastEventId, setActiveBroadcastEventId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  if (isLoading) return <Loading label="Loading event…" />
  if (isError) return <ErrorState error={error} />
  if (!e) return <div>Event not found</div>

  const toggle = (tid: string) =>
    setTasks(tasks.map((t) => (t.id === tid ? { ...t, done: !t.done } : t)))

  const referrersMap = roster.reduce((acc: Record<string, number>, r: any) => {
    if (r.referrer) acc[r.referrer] = (acc[r.referrer] || 0) + 1
    return acc
  }, {})
  const topReferrers = Object.entries(referrersMap).sort((a: any, b: any) => b[1] - a[1])

  return (
    <div>
      <Link to="/organiser" className="mb-4 inline-block text-[13px] text-graytext-light hover:text-teal">
        ← Dashboard
      </Link>
      <SectionTitle
        eyebrow={e.city + ' · Organiser'}
        title={e.title}
        sub="Your control panel for the same event students see as an invitation."
        right={
          <div className="flex gap-2">
            {e.status !== 'cancelled' && (
              <>
                <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit</Button>
                <Button variant="danger" onClick={() => setCancelOpen(true)}>Cancel</Button>
              </>
            )}
            <Button variant="secondary" onClick={() => setActiveBroadcastEventId(e.id)}>Broadcast</Button>
            <Link to={`/events/${e.id}/checkin`}>
              <Button variant="secondary">Check-in</Button>
            </Link>
            <Link to={`/events/${e.id}/expenses`}>
              <Button variant="secondary">Reimbursement</Button>
            </Link>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-mid">
            Registered headcount
          </div>
          <div className="mt-1 text-[32px] font-bold text-teal">
            {e.registered}
            <span className="text-[15px] text-graytext-mid">/{e.capacity}</span>
          </div>
          <div className="mt-2">
            <Progress value={e.registered} max={e.capacity} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-mid">
            Tasks complete
          </div>
          <div className="mt-1 text-[32px] font-bold text-gold">
            {tasks.filter((t) => t.done).length}
            <span className="text-[15px] text-graytext-mid">/{tasks.length}</span>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-mid">Days to go</div>
          <div className="mt-1 text-[32px] font-bold text-offwhite">{daysUntil(e.startsAt)}</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2 border-b border-white/8">
        {(['roster', 'referrers', 'tasks'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cx(
              'relative px-4 py-2.5 text-[14px] font-semibold capitalize transition-colors',
              tab === t ? 'text-teal' : 'text-graytext-mid hover:text-offwhite',
            )}
          >
            {t === 'roster'
              ? `Registration list (${roster.length})`
              : t === 'referrers'
                ? 'Top Referrers'
                : 'Team tasks'}
            {tab === t && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-teal" />
            )}
          </button>
        ))}
      </div>

      {tab === 'roster' ? (
        <Card className="overflow-hidden">
          {roster.length === 0 ? (
            <div className="p-10 text-center text-graytext-light">No registrations yet.</div>
          ) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-white/5 text-caption uppercase tracking-wider text-graytext-mid">
                  <th className="px-5 py-3 text-left">Student</th>
                  <th className="px-5 py-3 text-left">Reg ID</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((r: any) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-8 w-8 place-items-center rounded-full bg-teal/12 text-[12px] font-bold text-teal">
                          {(r.student ?? '?').split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <span className="text-offwhite">{r.student}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-graytext-light">
                      {r.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {r.attended ? (
                        <Badge tone="success">Checked in</Badge>
                      ) : (
                        <Badge tone="neutral">Registered</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : tab === 'referrers' ? (
        <Card className="overflow-hidden">
          {topReferrers.length === 0 ? (
            <div className="p-10 text-center text-graytext-light">
              No referrals yet. Share invite links to get started!
            </div>
          ) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-white/5 text-caption uppercase tracking-wider text-graytext-mid">
                  <th className="px-5 py-3 text-left">Referrer</th>
                  <th className="px-5 py-3 text-right">Referrals</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map(([name, count]: any) => (
                  <tr key={name} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 text-offwhite">{name}</td>
                    <td className="px-5 py-3 text-right">
                      <Badge tone="teal">{count} Referred</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      ) : (
        <Card className="p-5">
          <div className="space-y-2">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3"
              >
                <button
                  onClick={() => toggle(t.id)}
                  className={cx(
                    'grid h-6 w-6 shrink-0 place-items-center rounded-md border transition-colors',
                    t.done ? 'border-teal bg-teal/20 text-teal' : 'border-white/20 hover:border-teal',
                  )}
                >
                  {t.done && (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  )}
                </button>
                <div className="flex-1">
                  <div className={cx('text-[14px]', t.done ? 'text-graytext-mid line-through' : 'text-offwhite')}>
                    {t.label}
                  </div>
                </div>
                <Badge tone="teal">{t.assignee}</Badge>
              </div>
            ))}
          </div>
          <p className="mt-4 text-caption text-graytext-mid">
            Task assignment is a thin v1 slice — deepened in Phase 2 (PRD §10).
          </p>
        </Card>
      )}

      {activeBroadcastEventId && (
        <EventAnnouncementsModal
          eventId={activeBroadcastEventId}
          onClose={() => setActiveBroadcastEventId(null)}
        />
      )}
      {editOpen && <EditEventModal event={e} onClose={() => setEditOpen(false)} />}
      {cancelOpen && <CancelEventModal event={e} onClose={() => setCancelOpen(false)} />}
    </div>
  )
}

function toLocalInput(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function EditEventModal({ event, onClose }: { event: any; onClose: () => void }) {
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description || '')
  const [startsAt, setStartsAt] = useState(toLocalInput(event.startsAt))
  const [venue, setVenue] = useState(event.venue)
  const [updateMessage, setUpdateMessage] = useState('')
  const updateMutation = useUpdateEvent()

  const submit = (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!title.trim() || !startsAt) return
    const payload = {
      title,
      description,
      starts_at: new Date(startsAt).toISOString(),
      venue,
      update_message: updateMessage,
    }
    updateMutation.mutate({ id: event.id, payload }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-md p-6 border-teal/20">
        <h2 className="mb-2 text-h3 font-bold text-offwhite">Edit Event</h2>
        <p className="mb-4 text-[13px] text-teal">
          Changing the time or venue will automatically notify all registered students.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-graytext-light">Title</label>
            <Input value={title} onChange={(e: any) => setTitle(e.target.value)} disabled={updateMutation.isPending} />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-graytext-light">Description</label>
            <textarea
              className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-[14px] text-offwhite focus:border-teal"
              value={description}
              onChange={(e: any) => setDescription(e.target.value)}
              rows={3}
              disabled={updateMutation.isPending}
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-graytext-light">Start time</label>
            <Input
              type="datetime-local"
              value={startsAt}
              onChange={(e: any) => setStartsAt(e.target.value)}
              disabled={updateMutation.isPending}
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-graytext-light">Venue</label>
            <Input value={venue} onChange={(e: any) => setVenue(e.target.value)} disabled={updateMutation.isPending} />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-graytext-light">
              Update message (optional)
            </label>
            <textarea
              className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal"
              value={updateMessage}
              onChange={(e: any) => setUpdateMessage(e.target.value)}
              rows={2}
              disabled={updateMutation.isPending}
              placeholder="Explain the change to attendees (e.g. 'We pushed the time back 1 hr due to traffic')"
            />
          </div>
          {updateMutation.isError && (
            <p className="text-caption text-red-300">{(updateMutation.error as Error).message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

function CancelEventModal({ event, onClose }: { event: any; onClose: () => void }) {
  const cancelMutation = useCancelEvent()

  const submit = () => {
    cancelMutation.mutate(event.id, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-md p-6 border-red-400/20">
        <h2 className="mb-4 text-h3 font-bold text-red-400">Cancel event?</h2>
        <p className="mb-6 text-[14px] text-graytext-light">
          This will cancel the event and automatically notify all registered and waitlisted students. This action
          cannot be undone.
        </p>
        {cancelMutation.isError && (
          <p className="mb-4 text-caption text-red-300">{(cancelMutation.error as Error).message}</p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={cancelMutation.isPending}>
            Keep event
          </Button>
          <Button variant="danger" onClick={submit} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? 'Cancelling…' : 'Cancel event'}
          </Button>
        </div>
      </Card>
    </div>
  )
}
