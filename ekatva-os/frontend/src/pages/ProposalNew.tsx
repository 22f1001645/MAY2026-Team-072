import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { inr } from '../lib/mock'
import { useCities, useOrgs, useSubmitProposal } from '../lib/queries'
import { Badge, Button, Card, SectionTitle } from '../components/ui'
import { scaleLabel } from '../lib/format'
import type { ActivityScale } from '../lib/types'

interface Line {
  id: number
  label: string
  amount: string
}

// FR-B1: submit a proposal with scale, date, venue, description, capacity + budget
export default function ProposalNew() {
  const nav = useNavigate()
  const { data: orgs = [] } = useOrgs()
  const { data: cities = [] } = useCities()
  const submitMut = useSubmitProposal()

  const [scale, setScale] = useState<ActivityScale>('local_meetup')
  const [form, setForm] = useState({
    title: '',
    org_id: '',
    city: '',
    starts_at: '',
    capacity: '',
    venue: '',
    description: '',
  })
  const [lines, setLines] = useState<Line[]>([
    { id: 1, label: 'Venue booking', amount: '' },
    { id: 2, label: 'Refreshments', amount: '' },
  ])
  const [done, setDone] = useState(false)

  const total = lines.reduce((s, l) => s + (parseInt(l.amount) || 0), 0)
  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v })

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      title: form.title,
      org_id: form.org_id || orgs[0]?.id,
      city: form.city || cities[0]?.name,
      scale,
      venue: form.venue,
      starts_at: form.starts_at,
      capacity: parseInt(form.capacity) || 1,
      description: form.description,
      budget: lines
        .filter((l) => l.label && l.amount)
        .map((l) => ({ label: l.label, planned: parseInt(l.amount) || 0 })),
    }
    submitMut.mutate(payload, { onSuccess: () => setDone(true) })
  }

  if (done)
    return (
      <div className="mx-auto max-w-xl py-12 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-teal/15 text-3xl">
          ✓
        </div>
        <h1 className="text-h1 font-bold text-gold">Proposal submitted</h1>
        <p className="mx-auto mt-2 max-w-md text-body text-graytext-light">
          It's in the admin's approval queue with a full audit trail. You'll be notified
          the moment it's approved — and it auto-publishes to your city feed.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => nav('/organiser')}>Back to dashboard</Button>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Submit another
          </Button>
        </div>
      </div>
    )

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle
        eyebrow="Organiser · RC"
        title="New Proposal"
        sub="One form, no re-keying. On approval this becomes a live event on the city feed."
      />

      <form onSubmit={submit} className="space-y-6">
        {/* Scale */}
        <Card className="p-6">
          <Label>Activity scale</Label>
          <div className="grid gap-3 sm:grid-cols-3">
            {(['local_meetup', 'regional_meetup', 'regional_fest'] as ActivityScale[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScale(s)}
                className={
                  'rounded-xl border p-4 text-left transition-all duration-300 ease-material ' +
                  (scale === s
                    ? 'border-teal bg-teal/10'
                    : 'border-white/10 bg-white/[0.02] hover:border-teal/40')
                }
              >
                <div className="text-[14px] font-semibold text-offwhite">{scaleLabel[s]}</div>
                <div className="text-caption text-graytext-mid">
                  {s === 'local_meetup'
                    ? '30–50 people'
                    : s === 'regional_meetup'
                      ? '75–100 · funded'
                      : '230+ · sponsors'}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* Core details */}
        <Card className="space-y-4 p-6">
          <div>
            <Label>Event title</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)}
                   placeholder="e.g. Hyderabad Coffee & Code" required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Organisation</Label>
              <select value={form.org_id} onChange={(e) => set('org_id', e.target.value)} className={selectCls}>
                <option value="" className="bg-onyx">Select an organisation…</option>
                {orgs.map((o: any) => (
                  <option key={o.id} value={o.id} className="bg-onyx">{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>City</Label>
              <select value={form.city} onChange={(e) => set('city', e.target.value)} className={selectCls}>
                <option value="" className="bg-onyx">Select a city…</option>
                {cities.map((c: any) => (
                  <option key={c.id} value={c.name} className="bg-onyx">{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Date & time</Label>
              <Input type="datetime-local" value={form.starts_at}
                     onChange={(e) => set('starts_at', e.target.value)} required />
            </div>
            <div>
              <Label>Capacity</Label>
              <Input type="number" value={form.capacity}
                     onChange={(e) => set('capacity', e.target.value)} placeholder="45" required />
            </div>
          </div>
          <div>
            <Label>Venue</Label>
            <Input value={form.venue} onChange={(e) => set('venue', e.target.value)}
                   placeholder="Roastery Coffee House, Banjara Hills" required />
          </div>
          <div>
            <Label>Description</Label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What is it, who's it for, and why should someone give up their evening for it?"
              className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none"
            />
          </div>
        </Card>

        {/* Line-item budget (FR-E1) */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <Label className="mb-0">Line-item budget</Label>
            <Badge tone="gold">Total {inr(total)}</Badge>
          </div>
          <div className="space-y-2">
            {lines.map((l) => (
              <div key={l.id} className="flex gap-2">
                <input
                  value={l.label}
                  onChange={(e) =>
                    setLines(lines.map((x) => (x.id === l.id ? { ...x, label: e.target.value } : x)))
                  }
                  placeholder="Budget line (e.g. Transport)"
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none"
                />
                <div className="relative w-36">
                  <span className="absolute left-3 top-2 text-graytext-mid">₹</span>
                  <input
                    value={l.amount}
                    onChange={(e) =>
                      setLines(lines.map((x) => (x.id === l.id ? { ...x, amount: e.target.value.replace(/\D/g, '') } : x)))
                    }
                    placeholder="0"
                    className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-7 pr-3 text-[13px] text-offwhite focus:border-teal/50 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setLines(lines.filter((x) => x.id !== l.id))}
                  className="grid w-9 place-items-center rounded-lg border border-white/10 text-graytext-mid hover:border-red-400/40 hover:text-red-300"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setLines([...lines, { id: Date.now(), label: '', amount: '' }])}
            className="mt-3 text-[13px] font-semibold text-teal hover:text-teal-accent"
          >
            + Add budget line
          </button>
        </Card>

        {/* Quota guardrail notice (FR-B2) */}
        <div className="flex items-start gap-3 rounded-xl border border-gold/20 bg-gold/[0.06] p-4">
          <span className="text-lg">🛈</span>
          <p className="text-[13px] text-graytext-light">
            <span className="font-semibold text-gold">Quota check:</span> one meetup per city
            per month. The server enforces this on submit — a duplicate for the month will be
            rejected.
          </p>
        </div>

        {submitMut.isError && (
          <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-[13px] text-red-300">
            {(submitMut.error as Error).message}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" type="button" onClick={() => nav('/organiser')}>
            Cancel
          </Button>
          <Button type="submit" size="lg" disabled={submitMut.isPending}>
            {submitMut.isPending ? 'Submitting…' : 'Submit for approval'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={'mb-2 block text-caption font-semibold uppercase tracking-wider text-graytext-light ' + className}>
      {children}
    </label>
  )
}
function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none"
    />
  )
}
const selectCls =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite focus:border-teal/50 focus:outline-none'
