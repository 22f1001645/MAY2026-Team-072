import { Link } from 'react-router-dom'
import { useMyPoints, useMyRegistrations, useNotifications } from '../lib/queries'
import { Badge, Card, SectionTitle, StatCard } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { coverForScale, daysUntil, formatDate, formatTime } from '../lib/format'

// A student's home for commitments — registrations + a glance at points/updates
export default function MyRegistrations() {
  const { data: regs = [], isLoading, isError, error } = useMyRegistrations()
  const { data: points } = useMyPoints()
  const { data: notifications = [] } = useNotifications()

  if (isLoading) return <Loading label="Loading your registrations…" />
  if (isError) return <ErrorState error={error} />

  const upcoming = regs.filter((r: any) => r.activity?.status === 'upcoming')
  const attended = regs.filter((r: any) => r.attended).length

  return (
    <div>
      <SectionTitle
        eyebrow="Student"
        title="My Registrations"
        sub="Everything you've committed to, and the reminders that keep you from missing it."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Upcoming" value={upcoming.length} hint="events you're registered for" />
        <StatCard label="Attended this term" value={attended} tone="gold" hint="counts toward fee utilisation" />
        <StatCard label="My points" value={points?.total ?? 0} hint="see the leaderboard" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {regs.length === 0 && (
            <Card className="p-10 text-center text-graytext-light">
              You haven't registered for anything yet.{' '}
              <Link to="/discover" className="font-semibold text-teal">
                Find something in your city →
              </Link>
            </Card>
          )}
          {regs.map((r: any) => {
            const a = r.activity
            if (!a) return null
            return (
              <Link key={r.id} to={`/events/${a.id}`}>
                <Card hover className="flex items-stretch gap-0 overflow-hidden">
                  <div className="w-28 shrink-0" style={{ background: coverForScale(a.scale) }} />
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-caption uppercase tracking-wider text-teal">
                          {a.city}
                        </div>
                        <div className="text-h3 font-semibold text-offwhite">{a.title}</div>
                      </div>
                      {r.attended ? (
                        <Badge tone="success">Attended</Badge>
                      ) : a.status === 'completed' ? (
                        <Badge tone="neutral">Missed</Badge>
                      ) : (
                        <Badge tone="teal">{daysUntil(a.starts_at)}</Badge>
                      )}
                    </div>
                    <div className="mt-2 text-[13px] text-graytext-light">
                      {formatDate(a.starts_at)} · {formatTime(a.starts_at)} · {a.venue}
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>

        {/* Recent notifications digest */}
        <Card className="h-fit p-5">
          <h3 className="mb-4 text-h3 font-semibold text-gold">Latest updates</h3>
          {notifications.length === 0 ? (
            <p className="text-caption text-graytext-mid">No notifications yet.</p>
          ) : (
            <div className="space-y-4">
              {notifications.slice(0, 3).map((n: any) => (
                <div key={n.id} className="border-l-2 border-teal/40 pl-3">
                  <div className="text-[13px] font-semibold text-offwhite">{n.title}</div>
                  <div className="text-caption text-graytext-light">{n.body}</div>
                </div>
              ))}
            </div>
          )}
          <Link
            to="/notifications"
            className="mt-4 inline-block text-caption font-semibold text-teal"
          >
            View all notifications →
          </Link>
        </Card>
      </div>
    </div>
  )
}
