import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useEvent, useRoster, useBroadcast, useAnnouncements, useUpdateEvent, useCancelEvent } from '../lib/queries'
import { Badge, Button, Card, Progress, SectionTitle, Input } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx, daysUntil } from '../lib/format'

// FR-F1 (thin): registration list + basic task assignment
export default function ManageEvent() {
  const { id } = useParams()
  const { data: e, isLoading, isError, error } = useEvent(id)
  const { data: roster = [] } = useRoster(id)
  const { data: announcements = [] } = useAnnouncements(id)
  const alerts = announcements.filter((a: any) => a.isAlert)
  const [tab, setTab] = useState<'roster' | 'referrers' | 'tasks' | 'alerts'>('roster')
  const [alertOpen, setAlertOpen] = useState(false)
  const [activeBroadcastEventId, setActiveBroadcastEventId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  if (isLoading) return <Loading label="Loading event…" />
  if (isError) return <ErrorState error={error} />
  if (!e) return <div>Event not found</div>

  const referrersMap = roster.reduce((acc: Record<string, number>, r: any) => {
    if (r.referrer) {
      acc[r.referrer] = (acc[r.referrer] || 0) + 1
    }
    return acc
  }, {})
  const topReferrers = Object.entries(referrersMap).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10)



  return (
    <div>
      <Link 
        to="/organiser" 
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-bold tracking-widest uppercase text-graytext-mid backdrop-blur-md transition-all duration-300 hover:border-teal/30 hover:bg-teal/10 hover:text-teal hover:shadow-[0_0_15px_rgba(92,230,201,0.15)] group"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform duration-300 group-hover:-translate-x-1">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        Back to Dashboard
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
            {e.status !== 'completed' && (
              <>
                <Button variant="secondary" onClick={() => setAlertOpen(true)}>Push Alerts</Button>
              </>
            )}

            <Link to={`/events/${e.id}/expenses`}>
              <Button variant="secondary">Reimbursement</Button>
            </Link>
          </div>
        }
      />

      {/* The "Tasks complete" tile was a count of the mock array and has no
          replacement here: the real board lives at /events/:id/workspace and is
          inert until the campaign is live, so a tile on this page would read 0
          of 0 for every unpublished event. */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-mid">
            Registered headcount
          </div>
          <div className="mt-1 text-32px font-bold text-offwhite">
            {e.registered}
            <span className="text-[15px] text-graytext-mid">/{e.capacity}</span>
          </div>
          <div className="mt-2">
            <Progress value={e.registered} max={e.capacity} />
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-mid">Days to go</div>
          <div className="mt-1 text-[32px] font-bold text-offwhite">{daysUntil(e.startsAt)}</div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2 border-b border-white/8">
        {(['roster', 'referrers', 'tasks', 'alerts'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={cx(
              'relative px-4 py-2.5 text-[14px] font-semibold capitalize transition-colors',
              tab === t ? 'text-teal' : 'text-graytext-mid hover:text-offwhite',
            )}
          >
            {t === 'roster' ? `Registration list (${roster.length})` : t === 'referrers' ? 'Top Referrers' : t === 'tasks' ? 'Team tasks' : `Push Alerts History (${alerts.length})`}
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
                {topReferrers.map(([name, count]: any, idx: number) => (
                  <tr key={name} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-full bg-gold/12 text-[12px] font-bold text-gold">
                        #{idx + 1}
                      </div>
                      <span className="text-offwhite font-medium">{name}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Badge tone="teal">{count} Referred</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
) : tab === 'tasks' ? (
        <Card className="p-10 text-center">
          <div className="text-h3 font-semibold text-offwhite">Team tasks moved</div>
          <p className="mx-auto mt-2 max-w-md text-body text-graytext-light">
            Tasks now live on the team workspace, where they are saved on the server and visible
            to every crew member on any device.
          </p>
          <Link to={`/events/${e.id}/workspace`} className="mt-6 inline-block">
            <Button variant="secondary">Open the task board</Button>
          </Link>
        </Card>
      ) : (
        <Card className="p-5">
          {alerts.length === 0 ? (
            <div className="p-10 text-center text-graytext-light">No push alerts sent yet.</div>
          ) : (
            <div className="space-y-4">
              {alerts.map((a: any) => (
                <div key={a.id} className="border-l-2 border-gold/50 pl-4 py-1 animate-fade-up bg-white/5 p-3 rounded-r-xl">
                  <div className="text-[14px] font-semibold text-gold mb-1">{a.title}</div>
                  <div className="text-[13px] text-graytext-light leading-relaxed">{a.content}</div>
                  <div className="mt-2 text-[11px] text-graytext-mid uppercase tracking-widest">{new Date(a.createdAt).toLocaleString()} · Sent by {a.senderName}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {alertOpen && <PushAlertModal eventId={e.id} onClose={() => setAlertOpen(false)} />}
      {/* 
        Note: EventAnnouncementsModal from main branch would go here if imported,
        but we already kept PushAlertModal from HEAD. To preserve main's Broadcast button,
        we can render it if activeBroadcastEventId is set, assuming it's available.
      */}
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
      <Card className="relative w-full max-w-md p-6 animate-fade-up border-teal/20">
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
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="ghost" type="button" onClick={onClose} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !title.trim() || !startsAt}>
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
      <Card className="relative w-full max-w-sm p-6 animate-fade-up border-red-500/20">
        <h2 className="mb-4 text-h3 font-bold text-red-400">Cancel Event?</h2>
        <p className="mb-6 text-[14px] text-graytext-light">
          This will cancel the event and automatically notify all registered and waitlisted students. This action cannot be undone.
        </p>
        {cancelMutation.isError && (
          <p className="mb-4 text-caption text-red-300">{(cancelMutation.error as Error).message}</p>
        )}
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} disabled={cancelMutation.isPending}>Keep Event</Button>
          <Button variant="danger" onClick={submit} disabled={cancelMutation.isPending}>
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Event'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function PushAlertModal({ eventId, onClose }: { eventId: string; onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const postMutation = useBroadcast()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return
    postMutation.mutate(
      { id: eventId, title, body },
      { onSuccess: onClose }
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-md p-6 animate-fade-up border-teal/20">
        <h2 className="mb-4 text-h3 font-bold text-offwhite">Send Push Alert</h2>
        <p className="mb-6 text-[14px] text-graytext-light">
          This will send a push notification to all registered attendees and appear in the "Important Updates" section on the event page.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-graytext-light">Alert Title</label>
            <Input
              value={title}
              onChange={(e: any) => setTitle(e.target.value)}
              placeholder="e.g. Venue Change, Reminder..."
              disabled={postMutation.isPending}
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-graytext-light">Message Body</label>
            <textarea
              className="w-full rounded-xl border border-white/10 bg-black/40 p-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none focus:ring-1 focus:ring-teal/50"
              value={body}
              onChange={(e: any) => setBody(e.target.value)}
              placeholder="Write your important update here..."
              rows={4}
              disabled={postMutation.isPending}
            />
          </div>
          <div className="flex gap-3 justify-end mt-6">
            <Button variant="ghost" type="button" onClick={onClose} disabled={postMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || !body.trim() || postMutation.isPending}>
              {postMutation.isPending ? 'Sending...' : 'Send Alert'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
