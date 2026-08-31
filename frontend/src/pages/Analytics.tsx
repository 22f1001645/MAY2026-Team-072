import { useAnalytics } from '../lib/queries'
import { Card, SectionTitle, StatCard } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import ExportButton from '../components/ExportButton'
import { cx } from '../lib/format'

// FR-H: descriptive community analytics + the ₹200 activity-fee utilisation wedge
export default function Analytics() {
  const { data, isLoading, isError, error } = useAnalytics()

  if (isLoading) return <Loading label="Crunching community analytics…" />
  if (isError) return <ErrorState error={error} />

  const totals = data?.totals ?? {}
  const byCity: any[] = data?.by_city ?? []
  const maxAtt = Math.max(1, ...byCity.map((c) => c.attendance))
  const feeUtil = totals.fee_util_pct ?? 0
  const repeatRate = totals.repeat_rate_pct ?? 0
  // by_city carries every city in the system, including those that have never
  // hosted. Counting the whole array turned "2 meetups" into "across 10 cities",
  // which overstates reach on the one screen meant to measure it.
  const hostingCities = byCity.filter((c) => (c.meetups ?? 0) > 0).length

  return (
    <div>
      <SectionTitle
        eyebrow="Admin · Intelligence"
        title="Community Analytics"
        sub="Who's showing up, who's coming back, and whether the ₹200 activity fee is doing its job — by city, this term."
        right={
          /* The term report is written outside Ekatva OS; this is the table it needs. */
          <ExportButton
            kind="community-analytics"
            disabled={byCity.length === 0}
            columns={['City', 'Meetups', 'Attendance', 'Unique students', 'Repeat students', 'Fee paid', 'Fee used', 'Fee utilisation %']}
            rows={() =>
              byCity.map((c: any) => ({
                City: c.city ?? '',
                Meetups: c.meetups ?? 0,
                Attendance: c.attendance ?? 0,
                'Unique students': c.unique ?? 0,
                'Repeat students': c.repeat ?? 0,
                'Fee paid': c.fee_paid ?? 0,
                'Fee used': c.fee_used ?? 0,
                'Fee utilisation %': c.fee_util_pct ?? 0,
              }))
            }
          />
        }
      />

      {/* KPI row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Meetups run" value={totals.meetups ?? 0} hint={hostingCities === 1 ? 'in 1 city' : `across ${hostingCities} cities`} />
        <StatCard label="Total attendance" value={totals.attendance ?? 0} tone="gold" hint={`${totals.unique ?? 0} unique students`} />
        <StatCard label="Repeat rate" value={`${repeatRate}%`} hint="attended more than once" />
        <StatCard label="Fee utilisation" value={`${feeUtil}%`} tone="gold" hint="used their ₹200 this term" />
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
            <h3 className="mb-1 text-h3 font-semibold text-gold">₹200 activity-fee utilisation</h3>
            <p className="mb-5 text-caption text-graytext-mid">
              % of fee-paying students who attended ≥1 activity
            </p>
            <div className="flex items-center gap-6">
              <Donut pct={feeUtil} />
              <div className="space-y-3 text-[14px]">
                <div>
                  <div className="text-28px font-bold leading-none text-offwhite">
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
                    <div className="mt-1 text-22px font-bold text-offwhite">
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
          <div className="text-26px font-bold leading-none text-offwhite">{pct}%</div>
          <div className="text-caption text-graytext-mid">utilised</div>
        </div>
      </div>
    </div>
  )
}
