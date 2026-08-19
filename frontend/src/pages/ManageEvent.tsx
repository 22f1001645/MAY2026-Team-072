import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  useCancelEvent,
  useEvent,
  useRoster,
  useUpdateEvent,
  useTimeline,
  usePatchReportMutation,
  useDraftExpensesMutation,
} from '../lib/queries'
import { useAuth } from '../lib/auth'
import { Badge, Button, Card, Input, Progress, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import EventAnnouncementsModal from '../components/EventAnnouncementsModal'
import { cx, daysUntil } from '../lib/format'

// FR-F1 (thin): registration list + basic task assignment
export default function ManageEvent() {
  const { id } = useParams()
  const { currentUser } = useAuth()
  const { data: e, isLoading, isError, error } = useEvent(id)
  const { data: roster = [] } = useRoster(id)
  const [tab, setTab] = useState<'roster' | 'referrers' | 'tasks'>('roster')
  const [activeBroadcastEventId, setActiveBroadcastEventId] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)

  if (isLoading) return <Loading label="Loading event…" />
  if (isError) return <ErrorState error={error} />
  if (!e) return <div>Event not found</div>

  const isMeetupHead = !!(
    e.teamMembers?.some(
      (m: any) =>
        (m.userId === currentUser?.id || m.user_id === currentUser?.id) &&
        m.role === 'Meetup Head',
    ) ||
    e.organiser === currentUser?.name ||
    currentUser?.role === 'admin'
  )

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

      {/* The "Tasks complete" tile was a count of the mock array and has no
          replacement here: the real board lives at /events/:id/workspace and is
          inert until the campaign is live, so a tile on this page would read 0
          of 0 for every unpublished event. */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
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
      )}

      {activeBroadcastEventId && (
        <EventAnnouncementsModal
          eventId={activeBroadcastEventId}
          onClose={() => setActiveBroadcastEventId(null)}
        />
      )}
      {editOpen && <EditEventModal event={e} onClose={() => setEditOpen(false)} />}
      {cancelOpen && <CancelEventModal event={e} onClose={() => setCancelOpen(false)} />}

      {/* Phase 6 close-out panels — only visible after event date has passed */}
      {new Date(e.startsAt) < new Date() && (
        <div className="mt-8 space-y-4">
          <ReflectionPanel activityId={e.id} isMeetupHead={isMeetupHead} />
          <ReimbursementPanel activityId={e.id} isMeetupHead={isMeetupHead} />
          <EventTimeline activityId={e.id} />
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Phase 6 inline components
// ---------------------------------------------------------------------------

function Accordion({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-[15px] font-semibold text-offwhite">{title}</span>
        <span
          className={cx(
            'text-graytext-mid transition-transform duration-200',
            open ? 'rotate-90' : 'rotate-0',
          )}
        >
          ›
        </span>
      </button>
      {open && <div className="border-t border-white/5 px-5 pb-5 pt-4">{children}</div>}
    </Card>
  )
}

function ReflectionPanel({ activityId, isMeetupHead }: { activityId: string; isMeetupHead: boolean }) {
  const [challenges, setChallenges] = useState('')
  const [learnings, setLearnings] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const patchMut = usePatchReportMutation()

  const autoSave = (field: 'challenges' | 'learnings', value: string) => {
    setSaving(true)
    patchMut.mutate(
      { activityId, patch: { [field]: value } },
      { onSettled: () => setSaving(false) },
    )
  }

  const handleSubmit = () => {
    patchMut.mutate(
      { activityId, patch: { challenges, learnings, status: 'submitted' } },
      { onSuccess: () => setSubmitted(true) },
    )
  }

  return (
    <Accordion title="Post-Event Reflection">
      {submitted ? (
        <Badge tone="success">Reflection submitted ✓</Badge>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-graytext-light">
              Challenges faced
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-white/10 bg-black/40 p-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal focus:outline-none"
              rows={3}
              placeholder="What didn't go as planned?"
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              onBlur={(e) => autoSave('challenges', e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-semibold text-graytext-light">
              Key learnings
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-white/10 bg-black/40 p-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal focus:outline-none"
              rows={3}
              placeholder="What would you do differently next time?"
              value={learnings}
              onChange={(e) => setLearnings(e.target.value)}
              onBlur={(e) => autoSave('learnings', e.target.value)}
            />
          </div>
          {saving && (
            <p className="animate-pulse text-[12px] text-graytext-mid">Saving…</p>
          )}
          <div className="flex justify-end">
            <Button
              disabled={!isMeetupHead || (!challenges.trim() && !learnings.trim()) || patchMut.isPending}
              onClick={handleSubmit}
              title={
                !isMeetupHead
                  ? 'Only the Meetup Head can submit the reflection'
                  : !challenges.trim() && !learnings.trim()
                  ? 'Please write your reflection before submitting'
                  : undefined
              }
            >
              {patchMut.isPending ? 'Submitting…' : 'Submit Reflection'}
            </Button>
          </div>
        </div>
      )}
    </Accordion>
  )
}

function ReimbursementPanel({ activityId, isMeetupHead }: { activityId: string; isMeetupHead: boolean }) {
  const [rows, setRows] = useState<{ label: string; amount: string; bill_name: string }[]>([
    { label: '', amount: '', bill_name: '' },
  ])
  const [socialUrl, setSocialUrl] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const draftMut = useDraftExpensesMutation()

  const validExpenses = rows.filter((r) => r.label.trim() && (parseFloat(r.amount) || 0) > 0)
  const canSubmit =
    isMeetupHead &&
    validExpenses.length > 0 &&
    socialUrl.trim().length > 0 &&
    !draftMut.isPending

  const addRow = () => setRows((r) => [...r, { label: '', amount: '', bill_name: '' }])
  const removeRow = (i: number) => setRows((r) => r.filter((_, idx) => idx !== i))
  const updateRow = (i: number, k: keyof (typeof rows)[0], v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)))

  const autoSave = () => {
    draftMut.mutate({
      activityId,
      body: {
        expenses: rows
          .filter((r) => r.label)
          .map((r) => ({ label: r.label, amount: parseFloat(r.amount) || 0, bill_name: r.bill_name })),
      },
    })
  }

  const handleSubmit = () => {
    draftMut.mutate(
      {
        activityId,
        body: {
          expenses: rows
            .filter((r) => r.label)
            .map((r) => ({ label: r.label, amount: parseFloat(r.amount) || 0, bill_name: r.bill_name })),
          submit: true,
          social_post_url: socialUrl,
        },
      },
      { onSuccess: () => { setSubmitted(true); setConfirmOpen(false) } },
    )
  }

  return (
    <Accordion title="Reimbursement">
      {submitted ? (
        <Badge tone="success">Reimbursement request submitted ✓</Badge>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Expense label"
                value={row.label}
                onChange={(e: any) => updateRow(i, 'label', e.target.value)}
                onBlur={autoSave}
              />
              <Input
                type="number"
                placeholder="₹ Amount"
                value={row.amount}
                onChange={(e: any) => updateRow(i, 'amount', e.target.value)}
                onBlur={autoSave}
                className="w-28"
              />
              <Input
                placeholder="Bill / reference"
                value={row.bill_name}
                onChange={(e: any) => updateRow(i, 'bill_name', e.target.value)}
                onBlur={autoSave}
              />
              <button
                onClick={() => removeRow(i)}
                className="text-graytext-mid hover:text-red-400"
                aria-label="Remove row"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={addRow}
            className="text-[13px] text-teal hover:underline"
          >
            + Add expense
          </button>
          {isMeetupHead && (
            <div className="mt-4">
              <label className="mb-1 block text-[13px] font-semibold text-graytext-light">
                Social post URL (required to submit)
              </label>
              <Input
                placeholder="https://instagram.com/p/…"
                value={socialUrl}
                onChange={(e: any) => setSocialUrl(e.target.value)}
              />
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button
              disabled={!canSubmit}
              onClick={() => setConfirmOpen(true)}
              title={
                !isMeetupHead
                  ? 'Only the Meetup Head can submit a reimbursement request'
                  : validExpenses.length === 0
                  ? 'Add at least one expense with label and amount'
                  : !socialUrl.trim()
                  ? 'Social post URL is required to submit'
                  : undefined
              }
            >
              Submit Reimbursement
            </Button>
          </div>
          {confirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/60" onClick={() => setConfirmOpen(false)} />
              <Card className="relative w-full max-w-sm p-6">
                <h3 className="mb-3 text-h3 font-bold text-offwhite">Confirm submission?</h3>
                <p className="mb-4 text-[14px] text-graytext-light">
                  This will send the reimbursement request to admin for review. It cannot be edited after submission.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
                  <Button onClick={handleSubmit} disabled={draftMut.isPending}>
                    {draftMut.isPending ? 'Submitting…' : 'Confirm'}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </Accordion>
  )
}

const TIMELINE_ICONS: Record<string, string> = {
  proposal: '📋',
  registration: '✍️',
  attendance: '✅',
  report: '📝',
  expense: '💰',
  default: '📌',
}

function EventTimeline({ activityId }: { activityId: string }) {
  const { data: events = [], isLoading } = useTimeline(activityId)

  return (
    <Accordion title="Event Timeline">
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-white/5" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-[14px] text-graytext-mid">No activity yet.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-white/10 pl-6">
          {events.map((ev: any, i: number) => (
            <li
              key={i}
              className="animate-fade-up"
              style={{ animationDelay: `${Math.min(i * 60, 400)}ms` }}
            >
              <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-surface-1 text-sm">
                {TIMELINE_ICONS[ev.type] ?? TIMELINE_ICONS.default}
              </span>
              <p className="text-[14px] text-offwhite">{ev.description ?? ev.action}</p>
              <p className="mt-0.5 text-[12px] text-graytext-mid">
                {ev.actor ?? ev.actor_name} ·{' '}
                {new Date(ev.at ?? ev.created_at).toLocaleString()}
                {ev.method && (
                  <span className="ml-2">
                    <Badge tone="teal">{ev.method}</Badge>
                  </span>
                )}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Accordion>
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
