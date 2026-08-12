import { useState } from 'react'
import { useNotifications, useMarkNotificationsRead } from '../lib/queries'
import { Badge } from './ui'
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

export default function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const { data: items = [], isLoading, isError } = useNotifications()
  const markReadMutation = useMarkNotificationsRead()
  const [filter, setFilter] = useState<'all' | 'reminder' | 'update'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleMarkAllRead = () => {
    markReadMutation.mutate()
  }

  const filteredItems = items.filter((n: any) => filter === 'all' || n.type === filter)

  return (
    <div className="absolute right-0 top-full mt-2 w-80 md:w-96 rounded-2xl border border-white/10 bg-onyx p-3 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 animate-fade-up">
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
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-white/20 mb-3">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              <path d="M4 4l16 16" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            </svg>
            <div className="text-[13px] font-medium text-offwhite mb-1">No new notifications</div>
            <div className="text-[12px] text-graytext-mid">You're all caught up.</div>
          </div>
        ) : (
          filteredItems.map((n: any) => {
            const t = TONE[n.type] ?? TONE.update
            const isExpanded = expandedId === n.id
            return (
              <div
                key={n.id}
                onClick={() => setExpandedId(isExpanded ? null : n.id)}
                className={cx(
                  'cursor-pointer rounded-xl p-3 transition-all duration-200 flex gap-3 relative overflow-hidden',
                  !n.read 
                    ? 'bg-black/60 border-l-[3px] border-l-teal ring-1 ring-teal/30 shadow-[0_0_15px_rgba(92,230,201,0.15)] hover:bg-black' 
                    : 'bg-transparent border border-transparent hover:bg-white/5 hover:border-white/10'
                )}
              >
                {!n.read && (
                  <div className="absolute top-0 right-0 h-16 w-16 bg-teal/10 blur-xl rounded-full translate-x-8 -translate-y-8" />
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
                  <div className={cx("mt-1.5 text-[13px] font-semibold text-offwhite", !isExpanded && "truncate")}>
                    {n.title}
                  </div>
                  {n.type === 'update' && n.activity_title && (
                    <div className="mt-0.5 text-[11px] font-medium text-teal">
                      From: {n.activity_title}
                    </div>
                  )}
                  <div className={cx("text-[12px] leading-relaxed text-graytext-light mt-1", !isExpanded && "line-clamp-2")}>
                    {n.body}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
