import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { inr } from '../lib/mock'
import { useCities, useOrgs, useSubmitProposal } from '../lib/queries'
import { Badge, Button, Card, SectionTitle } from '../components/ui'
import { scaleLabel } from '../lib/format'
import type { ActivityScale } from '../lib/types'
import { api } from '../lib/api'

interface Line {
  id: number
  label: string
  amount: string
}

interface TeamRow {
  id: number
  user_id: string
  userName: string
  role: string
}

const TEAM_ROLES = [
  'Meetup Head',
  'Co-Head',
  'Designer',
  'Video/Content',
  'PR & Outreach',
  'Logistics',
  'Volunteer Coordinator',
  'Finance',
]

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
  // Phase 3: Team Roster (PROPOSAL-02)
  const [teamRows, setTeamRows] = useState<TeamRow[]>([])
  const [teamSearch, setTeamSearch] = useState('')
  const [teamSearchResults, setTeamSearchResults] = useState<any[]>([])
  const [searchingTeam, setSearchingTeam] = useState(false)
  // Phase 3: Collaborating Orgs (PROPOSAL-01)
  const [collabOrgIds, setCollabOrgIds] = useState<string[]>([])
  const [done, setDone] = useState(false)

  const total = lines.reduce((s, l) => s + (parseInt(l.amount) || 0), 0)
  const set = (k: keyof typeof form, v: string) => setForm({ ...form, [k]: v })

  const searchUsers = async (q: string) => {
    setTeamSearch(q)
    if (q.length < 2) { setTeamSearchResults([]); return }
    setSearchingTeam(true)
    try {
      const results = await api.users(q)
      setTeamSearchResults(results.slice(0, 8))
    } catch { setTeamSearchResults([]) } finally { setSearchingTeam(false) }
  }

  const addTeamMember = (user: any) => {
    if (teamRows.some(r => r.user_id === user.id)) return
    const role = teamRows.length === 0 ? 'Meetup Head' : 'Co-Head'
    setTeamRows([...teamRows, { id: Date.now(), user_id: user.id, userName: user.name, role }])
    setTeamSearch('')
    setTeamSearchResults([])
  }

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
      // Phase 3
      team: teamRows.map(r => ({ user_id: r.user_id, role: r.role })),
      collaborating_org_ids: collabOrgIds,
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

          {/* BUDGET-01: live cap indicator for meetup scales */}
          {(scale === 'local_meetup' || scale === 'regional_meetup') && (() => {
            const cap = Math.min((parseInt(form.capacity) || 0) * 200, 20_000)
            const over = total > cap
            return (
              <div className={`mt-4 rounded-xl px-4 py-2.5 text-[13px] font-medium ${
                over
                  ? 'border border-red-400/30 bg-red-500/10 text-red-300'
                  : cap > 0
                    ? 'border border-teal/20 bg-teal/[0.05] text-teal'
                    : 'border border-white/10 bg-white/[0.02] text-graytext-mid'
              }`}>
                {cap === 0 ? (
                  <>Set capacity above to see budget limit</>
                ) : over ? (
                  <>⚠ Over cap: ₹{total.toLocaleString('en-IN')} exceeds limit of ₹{cap.toLocaleString('en-IN')} (₹200/person, max ₹20,000)</>
                ) : (
                  <>✓ ₹{total.toLocaleString('en-IN')} / ₹{cap.toLocaleString('en-IN')} allowed</>
                )}
              </div>
            )
          })()}
        </Card>

        {/* Team Roster (PROPOSAL-02) */}
        <Card className="p-6">
          <Label>Team roster</Label>
          <p className="mb-3 text-[12px] text-graytext-mid">
            Name the people running this event. The <span className="text-gold font-semibold">first person added</span> becomes the Meetup Head — required.
          </p>

          {/* Search */}
          <div className="relative mb-3">
            <input
              value={teamSearch}
              onChange={(e) => searchUsers(e.target.value)}
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-[13px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none"
            />
            {searchingTeam && (
              <span className="absolute right-3 top-2.5 text-[12px] text-graytext-mid">Searching…</span>
            )}
            {teamSearchResults.length > 0 && (
              <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-white/10 bg-onyx shadow-xl">
                {teamSearchResults.map((u: any) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => addTeamMember(u)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] hover:bg-white/5"
                  >
                    <span className="font-medium text-offwhite">{u.name}</span>
                    <span className="ml-auto text-graytext-mid">{u.email}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Roster list */}
          {teamRows.length === 0 ? (
            <p className="text-[12px] text-red-300/70">⚠ At least one Meetup Head is required</p>
          ) : (
            <div className="space-y-2">
              {teamRows.map((row, idx) => (
                <div key={row.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
                  {idx === 0 && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-semibold text-gold">Head</span>
                  )}
                  <span className="flex-1 text-[13px] font-medium text-offwhite">{row.userName}</span>
                  <select
                    value={row.role}
                    onChange={(e) => setTeamRows(teamRows.map(r => r.id === row.id ? { ...r, role: e.target.value } : r))}
                    className="rounded-lg border border-white/10 bg-onyx px-2 py-1 text-[12px] text-offwhite"
                  >
                    {TEAM_ROLES.map(role => (
                      <option key={role} value={role} className="bg-onyx">{role}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const filtered = teamRows.filter(r => r.id !== row.id)
                      // If removing the head (idx 0), promote next to Head
                      if (idx === 0 && filtered.length > 0) {
                        filtered[0] = { ...filtered[0], role: 'Meetup Head' }
                      }
                      setTeamRows(filtered)
                    }}
                    className="text-graytext-mid hover:text-red-300"
                  >×</button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Collaborating Orgs (PROPOSAL-01) */}
        <Card className="p-6">
          <Label>Collaborating organisations</Label>
          <p className="mb-3 text-[12px] text-graytext-mid">
            Optional. Co-running orgs receive an invitation to accept. 3+ acceptances unlocks the{' '}
            <span className="text-teal font-semibold">Mega Meetup</span> label.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(orgs as any[])
              .filter((o: any) => o.id !== form.org_id)
              .map((o: any) => {
                const checked = collabOrgIds.includes(o.id)
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setCollabOrgIds(
                      checked ? collabOrgIds.filter(id => id !== o.id) : [...collabOrgIds, o.id]
                    )}
                    className={
                      'flex items-center gap-3 rounded-xl border px-4 py-2.5 text-left text-[13px] transition-all ' +
                      (checked
                        ? 'border-teal bg-teal/10 text-offwhite'
                        : 'border-white/10 bg-white/[0.02] text-graytext-light hover:border-teal/40')
                    }
                  >
                    <span className={`h-4 w-4 shrink-0 rounded border ${checked ? 'border-teal bg-teal' : 'border-white/30'} flex items-center justify-center text-[10px] text-onyx`}>
                      {checked ? '✓' : ''}
                    </span>
                    <span className="min-w-0 truncate">{o.name}</span>
                    <span className="ml-auto shrink-0 text-[11px] text-graytext-mid">{o.type}</span>
                  </button>
                )
              })}
          </div>
          {collabOrgIds.length > 0 && (
            <p className="mt-2 text-[12px] text-teal">
              {collabOrgIds.length} org{collabOrgIds.length > 1 ? 's' : ''} selected
              {collabOrgIds.length >= 2 && ' · invite accepted by all → Mega Meetup!'}
            </p>
          )}
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
          <Button type="submit" size="lg" disabled={submitMut.isPending || teamRows.length === 0 || (() => {
            if (scale === 'local_meetup' || scale === 'regional_meetup') {
              const cap = Math.min((parseInt(form.capacity) || 0) * 200, 20_000)
              return cap > 0 && total > cap
            }
            return false
          })()}>
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

