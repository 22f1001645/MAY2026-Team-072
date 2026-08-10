import { useState, useEffect } from 'react'
import { useAnalytics, useHeatmap, useTopOrganisers, usePointsConfig, useUpdatePointsConfig } from '../lib/queries'
import { Card, SectionTitle, StatCard, Button, Input, useToast } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx } from '../lib/format'

// FR-H: descriptive community analytics + the ₹100 activity-fee utilisation wedge
export default function Analytics() {
  const { data, isLoading, isError, error } = useAnalytics()
  const { data: heatmap = [] } = useHeatmap()
  const { data: topOrganisers = [] } = useTopOrganisers()

  if (isLoading) return <Loading label="Crunching community analytics…" />
  if (isError) return <ErrorState error={error} />

  const totals = data?.totals ?? {}
  const byCity: any[] = data?.by_city ?? []
  const maxAtt = Math.max(1, ...byCity.map((c) => c.attendance))
  const feeUtil = totals.fee_util_pct ?? 0
  const repeatRate = totals.repeat_rate_pct ?? 0
  const maxHeatAtt = Math.max(1, ...(heatmap as any[]).map((h: any) => h.attendance))

  return (
    <div>
      <SectionTitle
        eyebrow="Admin · Intelligence"
        title="Community Analytics"
        sub="Who's showing up, who's coming back, and whether the ₹100 activity fee is doing its job — by city, this term."
      />

      {/* KPI row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Meetups run" value={totals.meetups ?? 0} hint={`across ${byCity.length} cities`} />
        <StatCard label="Total attendance" value={totals.attendance ?? 0} tone="gold" hint={`${totals.unique ?? 0} unique students`} />
        <StatCard label="Repeat rate" value={`${repeatRate}%`} hint="attended more than once" />
        <StatCard label="Fee utilisation" value={`${feeUtil}%`} tone="gold" hint="used their ₹100 this term" />
      </div>

      {byCity.length === 0 ? (
        <Card className="p-12 text-center text-graytext-light">
          No activity data yet — analytics fill in as meetups run and students check in.
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Attendance by city */}
          <Card className="p-6">
            <h3 className="mb-1 text-h3 font-semibold text-gold">Attendance by city</h3>
            <p className="mb-5 text-caption text-graytext-mid">City participation ranking</p>
            <div className="space-y-4">
              {byCity
                .slice()
                .sort((a, b) => b.attendance - a.attendance)
                .map((c) => (
                  <div key={c.city}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span className="text-offwhite">{c.city}</span>
                      <span className="text-graytext-light">
                        {c.attendance} <span className="text-graytext-mid">· {c.meetups} events</span>
                      </span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-teal-deep to-teal"
                        style={{ width: `${(c.attendance / maxAtt) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </Card>

          {/* Unique vs repeat */}
          <Card className="p-6">
            <h3 className="mb-1 text-h3 font-semibold text-gold">Unique vs repeat attendees</h3>
            <p className="mb-5 text-caption text-graytext-mid">Retention signal per city</p>
            <div className="space-y-4">
              {byCity.map((c) => {
                const total = c.unique + c.repeat || 1
                return (
                  <div key={c.city}>
                    <div className="mb-1 flex justify-between text-[13px]">
                      <span className="text-offwhite">{c.city}</span>
                      <span className="text-graytext-mid">
                        {Math.round((c.repeat / total) * 100)}% repeat
                      </span>
                    </div>
                    <div className="flex h-2.5 overflow-hidden rounded-full bg-white/8">
                      <div className="h-full bg-teal" style={{ width: `${(c.unique / total) * 100}%` }} />
                      <div className="h-full bg-gold" style={{ width: `${(c.repeat / total) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 flex gap-5 text-caption">
              <Legend color="bg-teal" label="Unique (first-timers)" />
              <Legend color="bg-gold" label="Repeat attendees" />
            </div>
          </Card>

          {/* Fee utilisation donut */}
          <Card className="p-6">
            <h3 className="mb-1 text-h3 font-semibold text-gold">₹100 activity-fee utilisation</h3>
            <p className="mb-5 text-caption text-graytext-mid">
              % of fee-paying students who attended ≥1 activity
            </p>
            <div className="flex items-center gap-6">
              <Donut pct={feeUtil} />
              <div className="space-y-3 text-[14px]">
                <div>
                  <div className="text-[28px] font-bold leading-none text-teal">
                    {(totals.fee_used ?? 0).toLocaleString('en-IN')}
                  </div>
                  <div className="text-caption text-graytext-light">students used their fee</div>
                </div>
                <div>
                  <div className="text-[28px] font-bold leading-none text-graytext-mid">
                    {((totals.fee_paid ?? 0) - (totals.fee_used ?? 0)).toLocaleString('en-IN')}
                  </div>
                  <div className="text-caption text-graytext-light">
                    paid but haven't attended yet
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* City heatmap */}
          <Card className="p-6">
            <h3 className="mb-1 text-h3 font-semibold text-gold">Active vs dormant</h3>
            <p className="mb-5 text-caption text-graytext-mid">Fee utilisation intensity by city</p>
            <div className="grid grid-cols-3 gap-3">
              {byCity.map((c) => {
                const util = c.fee_paid ? c.fee_used / c.fee_paid : 0
                return (
                  <div
                    key={c.city}
                    className={cx(
                      'rounded-xl border p-4 text-center',
                      util > 0.5
                        ? 'border-teal/50 bg-teal/15'
                        : util > 0.25
                          ? 'border-teal/30 bg-teal/8'
                          : 'border-white/10 bg-white/[0.03]',
                    )}
                  >
                    <div className="text-[13px] font-semibold text-offwhite">{c.city}</div>
                    <div className="mt-1 text-[22px] font-bold text-teal">
                      {Math.round(util * 100)}%
                    </div>
                    <div className="text-caption text-graytext-mid">
                      {c.fee_used}/{c.fee_paid}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ANLY-01: City Participation Heatmap */}
      {(heatmap as any[]).length > 0 && (
        <Card className="mt-6 p-6">
          <h3 className="mb-1 text-h3 font-semibold text-gold">City Participation Heatmap</h3>
          <p className="mb-5 text-caption text-graytext-mid">Ranked by total attendance — higher bars = more active city</p>
          <div className="space-y-3">
            {(heatmap as any[]).map((h: any) => (
              <div key={h.city} className="flex items-center gap-3">
                <span className="w-6 text-right text-caption text-graytext-mid">#{h.rank}</span>
                <div className="flex-1">
                  <div className="mb-1 flex items-baseline justify-between">
                    <span className="text-sm font-medium text-offwhite">{h.city}</span>
                    <span className="text-caption text-graytext-mid">
                      {h.attendance} attended · {h.meetups} meetup{h.meetups !== 1 ? 's' : ''} · {h.fee_util_pct}% fee util
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-teal transition-all"
                      style={{ width: `${Math.round((h.attendance / maxHeatAtt) * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ANLY-02: Top Organisers */}
      {(topOrganisers as any[]).length > 0 && (
        <Card className="mt-6 overflow-hidden">
          <div className="border-b border-white/5 px-6 py-4">
            <h3 className="text-h3 font-semibold text-gold">Top Organisers</h3>
            <p className="text-caption text-graytext-mid">Ranked by number of approved activities run</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-white/5 text-caption uppercase tracking-wider text-graytext-mid">
                  <th className="px-5 py-3 text-left">Rank</th>
                  <th className="px-5 py-3 text-left">Organiser</th>
                  <th className="px-5 py-3 text-left">Organisation</th>
                  <th className="px-5 py-3 text-center">Events Run</th>
                  <th className="px-5 py-3 text-center">Total Attendance</th>
                </tr>
              </thead>
              <tbody>
                {(topOrganisers as any[]).map((o: any) => (
                  <tr key={o.organiser_id} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-3 font-mono text-graytext-mid">#{o.rank}</td>
                    <td className="px-5 py-3 font-medium text-offwhite">{o.organiser}</td>
                    <td className="px-5 py-3 text-graytext-light">{o.org}</td>
                    <td className="px-5 py-3 text-center font-semibold text-teal">{o.activities_run}</td>
                    <td className="px-5 py-3 text-center text-graytext-light">{o.total_attendance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Points Configuration (Admin Only) */}
      <PointsConfigCard />
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-graytext-light">
      <span className={cx('h-2.5 w-2.5 rounded-full', color)} />
      {label}
    </span>
  )
}

function Donut({ pct }: { pct: number }) {
  const r = 42
  const c = 2 * Math.PI * r
  const dash = (pct / 100) * c
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle cx="50" cy="50" r={r} fill="none" stroke="#5CE6C9" strokeWidth="10"
                strokeLinecap="round" strokeDasharray={`${dash} ${c}`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-[26px] font-bold leading-none text-teal">{pct}%</div>
          <div className="text-caption text-graytext-mid">utilised</div>
        </div>
      </div>
    </div>
  )
}

function PointsConfigCard() {
  const { data: config, isLoading } = usePointsConfig()
  const updateConfig = useUpdatePointsConfig()
  const { addToast } = useToast()

  const [attended, setAttended] = useState('')
  const [organised, setOrganised] = useState('')
  const [volunteered, setVolunteered] = useState('')

  useEffect(() => {
    if (config) {
      setAttended(String(config.attended ?? ''))
      setOrganised(String(config.organised ?? ''))
      setVolunteered(String(config.volunteered ?? ''))
    }
  }, [config])

  const handleSave = () => {
    updateConfig.mutate({
      attended: Number(attended),
      organised: Number(organised),
      volunteered: Number(volunteered)
    }, {
      onSuccess: () => addToast('Points configuration saved', 'success'),
      onError: (err: any) => addToast(err.message || 'Save failed', 'error')
    })
  }

  if (isLoading) return null

  return (
    <Card className="mt-6 p-6">
      <h3 className="mb-1 text-h3 font-semibold text-gold">Point Configuration</h3>
      <p className="mb-5 text-caption text-graytext-mid">Configure points awarded for various activities.</p>
      
      <div className="grid gap-4 sm:grid-cols-3 mb-5">
        <div>
          <label className="block text-caption text-graytext-mid mb-1">Points for Attending</label>
          <Input type="number" value={attended} onChange={e => setAttended(e.target.value)} />
        </div>
        <div>
          <label className="block text-caption text-graytext-mid mb-1">Points for Organising</label>
          <Input type="number" value={organised} onChange={e => setOrganised(e.target.value)} />
        </div>
        <div>
          <label className="block text-caption text-graytext-mid mb-1">Points for Volunteering</label>
          <Input type="number" value={volunteered} onChange={e => setVolunteered(e.target.value)} />
        </div>
      </div>
      
      <div className="flex justify-end">
        <Button variant="primary" onClick={handleSave} disabled={updateConfig.isPending}>
          {updateConfig.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </Card>
  )
}

