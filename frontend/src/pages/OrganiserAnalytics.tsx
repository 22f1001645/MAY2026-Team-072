import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { Badge, Card, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx } from '../lib/format'

export default function OrganiserAnalytics() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['organiser-analytics'],
    queryFn: () => api.organiserAnalytics(),
  })

  if (isLoading) return <Loading />
  if (error) return <ErrorState error={error} />

  const activeCount = data.filter((o: any) => o.is_active).length
  const dormantCount = data.length - activeCount

  return (
    <div>
      <SectionTitle
        eyebrow="Community Analytics"
        title="Organiser Activity"
        sub="Track the activity of users holding active PORs. Active organisers have submitted at least one proposal or joined at least one event team."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-light">Total Organisers</div>
          <div className="mt-1 text-[32px] font-bold text-offwhite">{data.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-light">Active</div>
          <div className="mt-1 text-32px font-bold text-offwhite">{activeCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-light">Dormant</div>
          <div className="mt-1 text-[32px] font-bold text-amber-500">{dormantCount}</div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[14px]">
            <thead className="border-b border-white/5 bg-onyx/20 text-caption font-semibold uppercase tracking-wider text-graytext-mid">
              <tr>
                <th className="px-5 py-4">Organiser</th>
                <th className="px-5 py-4">Active PORs</th>
                <th className="px-5 py-4 text-center">Proposals</th>
                <th className="px-5 py-4 text-center">Team Roles</th>
                <th className="px-5 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {data.map((org: any) => (
                <tr key={org.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-offwhite">{org.name}</div>
                    <div className="text-[12px] text-graytext-mid">{org.email} · {org.city || 'No city'}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {org.pors.map((por: string, i: number) => (
                        <Badge key={i} tone="neutral">{por}</Badge>
                      ))}
                      {org.pors.length === 0 && <span className="text-graytext-mid italic">None</span>}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center text-graytext-light font-medium">
                    {org.proposals_count}
                  </td>
                  <td className="px-5 py-3.5 text-center text-graytext-light font-medium">
                    {org.team_count}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {org.is_active ? (
                      <Badge tone="success">Active</Badge>
                    ) : (
                      <Badge tone="warn">Dormant</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-graytext-mid">
                    No organisers found with active PORs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
