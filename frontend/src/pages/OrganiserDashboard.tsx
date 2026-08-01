import { Link } from 'react-router-dom'
import { useDashboard } from '../lib/queries'
import { inr } from '../lib/mock'
import { Badge, Button, Card, Progress, SectionTitle, StatCard } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { daysUntil, formatDate } from '../lib/format'

const STATUS_TONE: Record<string, any> = {
  approved: 'success',
  submitted: 'warn',
  changes_requested: 'warn',
  rejected: 'danger',
  draft: 'neutral',
}
const STATUS_LABEL: Record<string, string> = {
  approved: 'Approved · Live',
  submitted: 'Pending approval',
  changes_requested: 'Changes requested',
  rejected: 'Rejected',
  draft: 'Draft',
}

export default function OrganiserDashboard() {
  const { data, isLoading, isError, error } = useDashboard()

  if (isLoading) return <Loading label="Loading your dashboard…" />
  if (isError) return <ErrorState error={error} />

  const events: any[] = data?.my_events ?? []
  const live = events.filter((e) => e.proposal_status === 'approved' && e.status !== 'completed')

  return (
    <div>
      <SectionTitle
        eyebrow="Organiser · RC"
        title="Organiser Dashboard"
        sub="Every proposal, headcount and to-do in one place — status-forward, no chasing across apps."
        right={
          <Link to="/proposals/new">
            <Button>+ New proposal</Button>
          </Link>
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Live events" value={live.length} hint="published & taking registrations" />
        <StatCard label="Total registered" value={data?.total_registered ?? 0} tone="gold" hint="across your events" />
        <StatCard label="My events" value={events.length} hint="proposed this term" />
        <StatCard label="Completed" value={events.filter((e) => e.status === 'completed').length} tone="gold" hint="ready to reimburse & close" />
      </div>

      <div>
        <h2 className="mb-3 text-h3 font-semibold text-gold">My proposals & events</h2>
        {events.length === 0 ? (
          <Card className="p-10 text-center text-graytext-light">
            No events yet.{' '}
            <Link to="/proposals/new" className="font-semibold text-teal">
              Propose your first meetup →
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((e) => (
              <Card key={e.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[e.proposal_status] ?? 'neutral'}>
                        {STATUS_LABEL[e.proposal_status] ?? e.proposal_status}
                      </Badge>
                      <span className="text-caption text-graytext-mid">{e.city}</span>
                    </div>
                    <div className="mt-1.5 text-h3 font-semibold text-offwhite">{e.title}</div>
                    <div className="text-caption text-graytext-light">
                      {formatDate(e.starts_at)} · {e.venue}
                    </div>
                  </div>
                  {e.proposal_status === 'approved' && e.status !== 'completed' && (
                    <div className="text-right">
                      <div className="text-caption text-graytext-mid">Headcount</div>
                      <div className="text-h3 font-bold text-teal">
                        {e.registered}
                        <span className="text-[13px] text-graytext-mid">/{e.capacity}</span>
                      </div>
                    </div>
                  )}
                </div>
                {e.proposal_status === 'approved' && (
                  <div className="mt-3">
                    <Progress value={e.registered} max={e.capacity} />
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/events/${e.id}`}>
                    <Button variant="ghost" size="sm">View event</Button>
                  </Link>
                  {e.proposal_status === 'approved' && e.status !== 'completed' && (
                    <>
                      <Link to={`/events/${e.id}/manage`}>
                        <Button variant="secondary" size="sm">Registrations & tasks</Button>
                      </Link>
                      <Link to={`/events/${e.id}/checkin`}>
                        <Button variant="secondary" size="sm">Check-in</Button>
                      </Link>
                    </>
                  )}
                  {e.status === 'completed' && (
                    <Link to={`/events/${e.id}/expenses`}>
                      <Button variant="secondary" size="sm">Reimbursement</Button>
                    </Link>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
