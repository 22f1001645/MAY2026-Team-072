import { useState } from 'react'
import { useNotifications, useMarkNotificationsRead } from '../lib/queries'
import { Badge } from './ui'
import InvitationCard from './InvitationCard'
import { cx } from '../lib/format'

const TONE: Record<string, { tone: any; icon: string; label: string }> = {
  reminder: { tone: 'teal', icon: '⏰', label: 'Reminder' },
  update: { tone: 'gold', icon: '📣', label: 'Update' },
  approval: { tone: 'success', icon: '✓', label: 'Confirmed' },
  points: { tone: 'gold', icon: '★', label: 'Points' },
  collaboration_invite: { tone: 'gold', icon: '🤝', label: 'Invite' },
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

export default function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const { data: items = [], isLoading, isError } = useNotifications()
  const markReadMutation = useMarkNotificationsRead()
  const [filter, setFilter] = useState<'all' | 'reminder' | 'update'>('all')

  const handleMarkAllRead = () => {
    markReadMutation.mutate()
  }

  const filteredItems = items.filter((n: any) => filter === 'all' || n.type === filter)

  return (
    <div className="absolute right-0 top-full mt-2 w-80 md:w-96 rounded-2xl border border-white/10 bg-onyx/95 p-3 shadow-2xl backdrop-blur-xl z-50 animate-[fadeIn_0.2s_ease-out]">
      <div className="flex items-center justify-between px-2 pb-2 mb-2 border-b border-white/5">
        <h3 className="text-[13px] font-bold text-offwhite uppercase tracking-wider">Notifications</h3>
        <button 
          className="text-[12px] font-medium text-teal hover:text-offwhite transition-colors" 
          onClick={handleMarkAllRead}
          disabled={markReadMutation.isPending}
        >
          {markReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
        </button>
      </div>

      <div className="flex gap-2 px-2 pb-3 mb-2 border-b border-white/5">
        {(['all', 'reminder', 'update'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cx(
              "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors uppercase tracking-widest",
              filter === f ? "bg-teal/20 text-teal" : "bg-white/5 text-graytext-mid hover:text-offwhite"
            )}
          >
            {f === 'update' ? 'Broadcasts' : f + (f === 'all' ? '' : 's')}
          </button>
        ))}
      </div>

      <div className="max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {isLoading ? (
          <div className="p-4 text-center text-[12px] text-graytext-mid">Loading...</div>
        ) : isError ? (
          <div className="p-4 text-center text-[12px] text-red-400">Failed to load</div>
        ) : filteredItems.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-graytext-mid">
            You're all caught up.
          </div>
        ) : (
          filteredItems.map((n: any) => {
            if (n.type === 'collaboration_invite' && n.activity_id) {
              return (
                <InvitationCard
                  key={n.id}
                  activityId={n.activity_id}
                  activityTitle={n.activity_title ?? n.title}
                  onNavigate={onClose}
                />
              )
            }
            const t = TONE[n.type] ?? TONE.update
            return (
              <div
                key={n.id}
                onClick={onClose}
                className={cx(
                  'cursor-pointer rounded-xl p-3 hover:bg-white/10 transition-colors flex gap-3 relative',
                  !n.read ? 'bg-white/5 border border-teal/20' : 'hover:bg-white/5'
                )}
              >
                {!n.read && (
                  <span className="absolute top-3 left-3 h-2 w-2 rounded-full bg-teal shadow-[0_0_8px_rgba(20,184,166,0.8)]" />
                )}
                <div
                  className={cx(
                    'grid h-9 w-9 shrink-0 place-items-center rounded-full text-[15px]',
                    n.read ? 'bg-white/5' : 'bg-teal/12'
                  )}
                >
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={t.tone}>{t.label}</Badge>
                    <span className="shrink-0 text-[10px] text-graytext-mid">{ago(n.at)}</span>
                  </div>
                  <div className="mt-1.5 truncate text-[13px] font-semibold text-offwhite">
                    {n.title}
                  </div>
                  {n.type === 'update' && n.activity_title && (
                    <div className="mt-0.5 text-[11px] font-medium text-teal">
                      From: {n.activity_title}
                    </div>
                  )}
                  <div className="line-clamp-2 text-[12px] leading-relaxed text-graytext-light mt-1">{n.body}</div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
