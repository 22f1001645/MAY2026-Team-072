import { useNotifications } from '../lib/queries'
import { Badge, Card, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx } from '../lib/format'

const TONE: Record<string, { tone: any; icon: string; label: string }> = {
  reminder: { tone: 'teal', icon: '⏰', label: 'Reminder' },
  update: { tone: 'gold', icon: '📣', label: 'Update' },
  approval: { tone: 'success', icon: '✓', label: 'Confirmed' },
  points: { tone: 'gold', icon: '★', label: 'Points' },
}

function ago(iso?: string) {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

export default function Notifications() {
  const { data: items = [], isLoading, isError, error } = useNotifications()

  if (isLoading) return <Loading label="Loading notifications…" />
  if (isError) return <ErrorState error={error} />

  return (
    <div>
      <SectionTitle
        eyebrow="Student"
        title="Notifications"
        sub="Per-user reminders and time-critical broadcasts — so the announcement never gets lost across five apps."
      />

      {items.length === 0 ? (
        <Card className="p-12 text-center text-graytext-light">
          You're all caught up — nothing new right now.
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((n: any) => {
            const t = TONE[n.type] ?? TONE.update
            return (
              <Card key={n.id} className={cx('flex gap-4 p-4', !n.read && 'border-teal/25')}>
                <div
                  className={cx(
                    'grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg',
                    n.read ? 'bg-white/5' : 'bg-teal/12',
                  )}
                >
                  {t.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge tone={t.tone}>{t.label}</Badge>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-teal" />}
                    <span className="ml-auto text-caption text-graytext-mid">{ago(n.at)}</span>
                  </div>
                  <div className="mt-1.5 text-[15px] font-semibold text-offwhite">{n.title}</div>
                  <div className="text-[14px] text-graytext-light">{n.body}</div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
