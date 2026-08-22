import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDashboard, useNotifications } from '../lib/queries'
import { inr } from '../lib/mock'
import { Badge, Button, Card, Progress, SectionTitle, StatCard } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { daysUntil, formatDate, cover, coverForScale, cx } from '../lib/format'
import InvitationCard from '../components/InvitationCard'
import WelcomeBanner from '../components/WelcomeBanner'

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
  const { data: notifications = [] } = useNotifications()
  const [activeBroadcastEventId, setActiveBroadcastEventId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'All' | 'Live' | 'Pending' | 'Completed'>('All')

  const events: any[] = data?.my_events ?? []
  
  const filteredEvents = useMemo(() => {
    if (filter === 'All') return events
    if (filter === 'Live') return events.filter((e) => e.proposal_status === 'approved' && e.status !== 'completed')
    if (filter === 'Completed') return events.filter((e) => e.status === 'completed')
    if (filter === 'Pending') return events.filter((e) => e.proposal_status !== 'approved' && e.proposal_status !== 'rejected')
    return events
  }, [events, filter])

  const live = events.filter((e) => e.proposal_status === 'approved' && e.status !== 'completed')
  const pendingInvites = (notifications as any[]).filter(
    (n) => n.type === 'collaboration_invite' && !n.read && n.activity_id,
  )

  if (isLoading) return <Loading label="Loading your dashboard…" />
  if (isError) return <ErrorState error={error} />

  return (
    <div>
      <WelcomeBanner />
      <SectionTitle
        eyebrow="Organiser · RC"
        title="Organiser Dashboard"
        titleColor="text-white"
        sub="Every proposal, headcount and to-do in one place — status-forward, no chasing across apps."
        right={
          <Link to="/proposals/new">
            <Button>+ New proposal</Button>
          </Link>
        }
      />

      {/* Collaboration invitations (PROPOSAL-06, S6) */}
      {pendingInvites.length > 0 && (
        <div id="invitations" className="mb-8">
          <h2 className="mb-3 text-h3 font-semibold text-white">Invitations</h2>
          <div className="space-y-2">
            {pendingInvites.map((n) => (
              <InvitationCard key={n.id} activityId={n.activity_id} activityTitle={n.activity_title ?? n.title} />
            ))}
          </div>
        </div>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Live events" value={live.length} hint="published & taking registrations" />
        <StatCard label="Total registered" value={data?.total_registered ?? 0} hint="across your events" />
        <StatCard label="My events" value={events.length} hint="proposed this term" />
        <StatCard label="Completed" value={events.filter((e) => e.status === 'completed').length} hint="ready to reimburse & close" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
        <h2 className="text-h3 font-semibold text-white">My proposals & events</h2>
        <div className="flex items-center gap-1 rounded-xl bg-black/40 p-1 shrink-0">
          {(['All', 'Live', 'Pending', 'Completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cx(
                'whitespace-nowrap rounded-lg px-5 py-2 text-[13px] font-semibold transition-all duration-300 text-center',
                filter === f
                  ? 'bg-white/10 text-offwhite shadow-sm'
                  : 'text-graytext-mid hover:text-offwhite hover:bg-white/5',
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      
      <div>
        {filteredEvents.length === 0 ? (
          <Card className="p-10 text-center text-graytext-light">
            No events found for this filter.
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 items-start">
            {filteredEvents.map((e) => (
              <Card key={e.id} className="overflow-hidden flex flex-col group border-white/5 bg-onyx transition-all duration-300 hover:border-teal/40 hover:shadow-glow-teal hover:-translate-y-1">
                <div 
                  className="relative flex items-start justify-between p-4 h-32 transition-transform duration-500 ease-out group-hover:scale-105"
                  style={{ background: e.cover ? cover(e.cover) : coverForScale(e.scale || '') }}
                >
                  <div className="grain absolute inset-0" />
                  
                  {/* Status Badge */}
                  <div className="relative z-10">
                    <Badge 
                      tone={e.status === 'completed' ? 'neutral' : e.status === 'cancelled' ? 'danger' : (STATUS_TONE[e.proposal_status] ?? 'neutral')} 
                      className="shadow-lg backdrop-blur-md bg-onyx/40 border-white/10"
                    >
                      {e.status === 'completed' ? 'Completed' : e.status === 'cancelled' ? 'Cancelled' : (STATUS_LABEL[e.proposal_status] ?? e.proposal_status)}
                    </Badge>
                  </div>
                </div>
                
                <div className="relative p-4 bg-onyx z-10 flex-1 flex flex-col">
                  <div className="text-caption uppercase tracking-wider text-teal">
                    {e.city}
                  </div>
                  <Link to={`/events/${e.id}`} className="mt-1 block group/title">
                    <div className="line-clamp-2 text-h3 font-semibold text-offwhite transition-colors group-hover/title:text-teal">
                      {e.title}
                    </div>
                  </Link>

                  <div className="mt-2 flex flex-col gap-1.5 text-[13px] text-graytext-light">
                    <div className="flex items-center gap-2">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="3" y="5" width="18" height="16" rx="2" />
                        <path d="M16 3v4M8 3v4M3 10h18" />
                      </svg>
                      {formatDate(e.starts_at || e.startsAt || new Date().toISOString())}
                    </div>
                    {e.venue && (
                      <div className="flex items-start gap-2">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="mt-[2px] shrink-0">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span className="line-clamp-2 leading-tight">{e.venue}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-auto pt-4 border-white/5">
                    {e.proposal_status === 'approved' && e.status !== 'completed' && (
                      <div className="mb-4 border-t border-white/5 pt-3">
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-[11px] font-semibold tracking-wider text-graytext-mid uppercase">Registered</span>
                          <div className="text-[14px] font-bold text-teal">
                            {e.registered} <span className="text-[12px] text-graytext-mid font-medium">/ {e.capacity}</span>
                          </div>
                        </div>
                        <Progress value={e.registered} max={e.capacity} tone="teal" />
                      </div>
                    )}

                    {(e.proposal_status === 'approved' && e.status !== 'completed') || e.status === 'completed' ? (
                      <div className={cx("flex flex-col gap-2 pt-2", (e.proposal_status === 'approved' && e.status !== 'completed') ? "" : "border-t border-white/5")}>
                        {e.proposal_status === 'approved' && e.status !== 'completed' && (
                          <>
                            <Link to={`/events/${e.id}/manage`} className="w-full">
                              <Button variant="secondary" size="sm" className="w-full justify-center text-[12px] py-1.5 h-auto">Manage registrations</Button>
                            </Link>
                            <Link to={`?chat=${e.id}`} className="w-full">
                              <Button variant="ghost" size="sm" className="w-full justify-center text-[12px] py-1.5 h-auto">Broadcast</Button>
                            </Link>
                          </>
                        )}
                        {e.status === 'completed' && (
                          <Link to={`/events/${e.id}/expenses`} className="w-full">
                            <Button variant="secondary" size="sm" className="w-full justify-center text-[12px] py-1.5 h-auto">Reimbursement</Button>
                          </Link>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
