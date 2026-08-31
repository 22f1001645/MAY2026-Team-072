import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { Badge, Card, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { formatDate } from '../lib/format'

/* Admin: Phase 5 audit surface — see all campaigns pushed live by Meetup Heads. */
export default function CampaignMonitor() {
  const { data: campaigns = [], isLoading, isError, error } = useQuery({
    queryKey: ['admin-live-campaigns'],
    queryFn: () => api.liveCampaigns(),
  })

  if (isLoading) return <Loading label="Loading live campaigns…" />
  if (isError) return <ErrorState error={error} />

  const posterCount = campaigns.filter((c: any) => c.has_poster).length
  const mailCount = campaigns.filter((c: any) => c.has_mail).length

  return (
    <div>
      <SectionTitle
        eyebrow="ADMIN · CAMPAIGNS"
        title="Live Campaigns"
        sub="All campaigns pushed live by Meetup Heads. These are publicly visible on the discover feed."
        right={<Badge tone="teal">{campaigns.length} live</Badge>}
      />

      {/* KPI row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-light">Total Live</div>
          <div className="mt-1 text-[32px] font-bold text-teal">{campaigns.length}</div>
        </Card>
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-light">With Poster</div>
          <div className="mt-1 text-[32px] font-bold text-gold">{posterCount}</div>
        </Card>
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-light">With Campaign Mail</div>
          <div className="mt-1 text-[32px] font-bold text-offwhite">{mailCount}</div>
        </Card>
      </div>

      {campaigns.length === 0 ? (
        <Card className="p-12 text-center text-graytext-light">
          No campaigns are live yet — they'll appear here once a Meetup Head pushes one live.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-white/5 text-caption uppercase tracking-wider text-graytext-mid">
                <th className="px-5 py-3 text-left">Event</th>
                <th className="px-5 py-3 text-left">House</th>
                <th className="px-5 py-3 text-left">City</th>
                <th className="px-5 py-3 text-left">Date</th>
                <th className="px-5 py-3 text-left">Pushed Live</th>
                <th className="px-5 py-3 text-center">Assets</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c: any) => (
                <tr key={c.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-offwhite">{c.title}</div>
                    {c.registration_slug && (
                      <div className="text-caption text-graytext-mid font-mono">{c.registration_slug}</div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-offwhite">{c.org || '—'}</div>
                    {c.org_type && (
                      <Badge tone={c.org_type === 'house' ? 'gold' : 'teal'}>
                        {c.org_type}
                      </Badge>
                    )}
                  </td>
                  <td className="px-5 py-4 text-graytext-light">{c.city || '—'}</td>
                  <td className="px-5 py-4 text-graytext-light">
                    {c.starts_at ? formatDate(c.starts_at) : '—'}
                  </td>
                  <td className="px-5 py-4 text-graytext-light">
                    {c.pushed_live_at ? new Date(c.pushed_live_at).toLocaleString('en-IN') : '—'}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <span className={`text-caption font-semibold ${c.has_poster ? 'text-teal' : 'text-graytext-mid line-through'}`}>
                        Poster
                      </span>
                      <span className={`text-caption font-semibold ${c.has_mail ? 'text-teal' : 'text-graytext-mid line-through'}`}>
                        Mail
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      to={`/events/${c.registration_slug || c.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal text-caption font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      View ↗
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <p className="mt-4 flex items-center gap-2 text-caption text-graytext-mid">
        <span className="h-1.5 w-1.5 rounded-full bg-teal" />
        Campaigns are pushed live by the designated Meetup Head. Admins can intervene by revoking the proposal from the Approval Queue.
      </p>
    </div>
  )
}
