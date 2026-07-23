import { useState } from 'react'
import { useCities, useOrgs, usePors } from '../lib/queries'
import { Badge, Button, Card, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx } from '../lib/format'

// FR-A1/A2: admin seeds orgs, cities, and assigns PORs (permissions follow PORs)
const ORG_TONE: Record<string, any> = {
  house: 'gold',
  society: 'teal',
  region: 'teal',
  council: 'warn',
}

export default function Orgs() {
  const [tab, setTab] = useState<'orgs' | 'pors' | 'cities'>('orgs')
  const { data: orgs = [], isLoading: lo, isError: eo, error: erro } = useOrgs()
  const { data: cities = [] } = useCities()
  const { data: pors = [] } = usePors()

  if (lo) return <Loading label="Loading organisations…" />
  if (eo) return <ErrorState error={erro} />

  return (
    <div>
      <SectionTitle
        eyebrow="Admin"
        title="Orgs, PORs & Cities"
        sub="Seed the structure every activity lives in. Permissions follow PORs, not logins — so what a person can do maps to the position their org gave them."
      />

      <div className="mb-6 flex gap-2 border-b border-white/8">
        {([
          ['orgs', `Organisations (${orgs.length})`],
          ['pors', `POR Assignments (${pors.length})`],
          ['cities', `Cities (${cities.length})`],
        ] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k as any)}
            className={cx(
              'relative px-4 py-2.5 text-[14px] font-semibold transition-colors',
              tab === k ? 'text-teal' : 'text-graytext-mid hover:text-offwhite',
            )}
          >
            {label}
            {tab === k && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-teal" />}
          </button>
        ))}
      </div>

      {tab === 'orgs' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button size="sm">+ Seed organisation</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orgs.map((o: any) => (
              <Card key={o.id} hover className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal/10 text-teal">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <Badge tone={ORG_TONE[o.type]}>{o.type}</Badge>
                </div>
                <div className="text-h3 font-semibold text-offwhite">{o.name}</div>
                <div className="mt-1 text-caption text-graytext-light">{o.city}</div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'pors' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button size="sm">+ Assign POR</Button>
          </div>
          {pors.length === 0 ? (
            <Card className="p-10 text-center text-graytext-light">No PORs assigned yet.</Card>
          ) : (
            <Card className="overflow-hidden">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-white/5 text-caption uppercase tracking-wider text-graytext-mid">
                    <th className="px-5 py-3 text-left">Member</th>
                    <th className="px-5 py-3 text-left">Organisation</th>
                    <th className="px-5 py-3 text-left">Position</th>
                    <th className="px-5 py-3 text-left">Term</th>
                    <th className="px-5 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pors.map((p: any) => (
                    <tr key={p.id} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="grid h-8 w-8 place-items-center rounded-full bg-gold/12 text-[12px] font-bold text-gold">
                            {(p.member ?? '?').split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <span className="text-offwhite">{p.member ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-graytext-light">{p.org}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone="teal">{p.por_type}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-graytext-light">{p.term}</td>
                      <td className="px-5 py-3.5 text-right">
                        {p.active ? (
                          <Badge tone="success">Active</Badge>
                        ) : (
                          <Badge tone="neutral">Past (archived)</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
          <p className="mt-3 text-caption text-graytext-mid">
            Past PORs are preserved for the historical record — nothing dies when a term ends (P4).
          </p>
        </div>
      )}

      {tab === 'cities' && (
        <div>
          <div className="mb-4 flex justify-end">
            <Button size="sm">+ Add city</Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.map((c: any) => (
              <Card key={c.id} className="flex items-center justify-between p-5">
                <div>
                  <div className="text-h3 font-semibold text-offwhite">{c.name}</div>
                  <div className="mt-1 text-caption text-graytext-light">Quota: 1 meetup / month</div>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-full bg-teal/10 text-teal">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 21s-7-6.3-7-11a7 7 0 0 1 14 0c0 4.7-7 11-7 11Z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
