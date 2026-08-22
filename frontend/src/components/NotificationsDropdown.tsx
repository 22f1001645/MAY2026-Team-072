import { useState, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useNotifications, useMarkNotificationsRead, useClearNotifications, useDeleteNotification } from '../lib/queries'
import { Badge, Mandala } from './ui'
import InvitationCard from './InvitationCard'
import { cx } from '../lib/format'
import { useSession } from '../lib/session'

const TONE: Record<string, { tone: any; icon: ReactNode; label: string }> = {
  reminder: { 
    tone: 'teal', 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>, 
    label: 'Reminder' 
  },
  update: { 
    tone: 'gold', 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>, 
    label: 'Notice' 
  },
  approval: { 
    tone: 'success', 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>, 
    label: 'Confirmed' 
  },
  points: { 
    tone: 'gold', 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>, 
    label: 'Points' 
  },
  collaboration_invite: { 
    tone: 'gold', 
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, 
    label: 'Invite' 
  },
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
  const { role } = useSession()
  const { data: items = [], isLoading, isError } = useNotifications(role)
  const markReadMutation = useMarkNotificationsRead()
  const clearMutation = useClearNotifications()
  const deleteMutation = useDeleteNotification()
  const [filter, setFilter] = useState<string>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'auto' }
  }, [])

  const handleMarkAllRead = () => {
    markReadMutation.mutate()
  }

  const handleClearAll = () => {
    clearMutation.mutate()
  }

  const filteredItems = items.filter((n: any) => filter === 'all' || n.type === filter)

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Blurred Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="relative w-full max-w-[28rem] h-full bg-[#070C0A] border-l border-white/10 shadow-2xl flex flex-col animate-[slideInRight_0.3s_ease-out] will-change-transform">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0 bg-black/20">
          <h3 className="text-[18px] font-bold text-offwhite uppercase tracking-widest flex items-center gap-3">
            Notifications
            {items.filter((n: any) => !n.read).length > 0 && (
              <span className="bg-teal text-onyx text-[11px] px-2 py-0.5 rounded-full font-bold">
                {items.filter((n: any) => !n.read).length} NEW
              </span>
            )}
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-graytext-mid hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Actions & Filters */}
        <div className="p-6 pb-2 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <button 
                className="text-[12px] font-semibold text-teal hover:text-teal-300 transition-colors hover:drop-shadow-[0_0_8px_rgba(92,230,201,0.5)]" 
                onClick={handleMarkAllRead}
                disabled={markReadMutation.isPending}
              >
                {markReadMutation.isPending ? 'Marking...' : 'Mark all read'}
              </button>
            </div>
            <button 
              className="p-1.5 rounded-lg text-graytext-mid hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-50" 
              onClick={handleClearAll}
              disabled={clearMutation.isPending || items.length === 0}
              title="Clear all notifications"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2 pb-2 border-b border-white/10">
            {(role === 'admin' ? ['all', 'approval'] : ['all', 'reminder', 'update']).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cx(
                  "px-3 py-1.5 rounded-full text-[10px] font-bold transition-all uppercase tracking-widest border",
                  filter === f 
                    ? "bg-teal/15 text-teal border-teal/20 shadow-[0_0_15px_rgba(92,230,201,0.15)]" 
                    : "bg-transparent text-graytext-mid border-transparent hover:text-offwhite hover:bg-white/5"
                )}
              >
                {f === 'update' ? 'Broadcasts' : f === 'approval' ? 'Approvals' : f + (f === 'all' ? '' : 's')}
              </button>
            ))}
          </div>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 pt-2 space-y-3">
        {isLoading ? (
          <div className="p-4 text-center text-[12px] text-graytext-mid">Loading...</div>
        ) : isError ? (
          <div className="p-4 text-center text-[12px] text-red-400">Failed to load</div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[350px] animate-[fadeIn_0.5s_ease-out]">
            {/* Zen Orb */}
            <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-teal/10 blur-3xl animate-[spin-slow_8s_linear_infinite]" />
              <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-teal/20 to-teal/5 blur-2xl animate-[spin-slow_5s_linear_infinite_reverse]" />
              <div className="absolute inset-8 rounded-full bg-teal/10 blur-xl animate-pulse" />
              <div className="relative z-10 text-teal/80">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            {/* Elegant Typography */}
            <div className="text-[32px] font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/30 tracking-tight leading-none mb-3">
              Zen Mode
            </div>
            <div className="text-[14px] text-graytext-mid font-medium tracking-wide">
              You're completely caught up.
            </div>
          </div>
        ) : (
          filteredItems.map((n: any) => {
            if (n.type === 'collaboration_invite' && n.activity_id) {
              return (
                <div key={n.id} className="relative group">
                  <InvitationCard
                    activityId={n.activity_id}
                    activityTitle={n.activity_title ?? n.title}
                    onNavigate={onClose}
                  />
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id) }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-graytext-mid opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all backdrop-blur-md border border-white/5"
                    title="Dismiss"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              )
            }
            const t = TONE[n.type] ?? TONE.update
            const isExpanded = expandedId === n.id
            
            // Map tone to specific colors for the icon background to avoid tailwind dynamic string issues
            const toneColorClass = t.tone === 'teal' ? 'bg-teal/10 text-teal shadow-[inset_0_0_12px_rgba(92,230,201,0.1)]' 
              : t.tone === 'gold' ? 'bg-gold/10 text-gold shadow-[inset_0_0_12px_rgba(250,208,44,0.1)]'
              : t.tone === 'success' ? 'bg-green-500/10 text-green-400 shadow-[inset_0_0_12px_rgba(34,197,94,0.1)]'
              : 'bg-white/10 text-offwhite'

            return (
              <div
                key={n.id}
                onClick={() => setExpandedId(isExpanded ? null : n.id)}
                className={cx(
                  'cursor-pointer rounded-2xl p-4 transition-all duration-300 flex gap-4 relative overflow-hidden group',
                  !n.read 
                    ? 'bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 shadow-sm' 
                    : 'bg-transparent border border-transparent hover:bg-white/[0.03]'
                )}
              >
                {!n.read && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-teal shadow-[0_0_10px_rgba(92,230,201,0.8)]" />
                )}
                
                <div
                  className={cx(
                    'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[16px] transition-colors',
                    n.read ? 'bg-white/5 text-graytext-mid group-hover:bg-white/10' : toneColorClass
                  )}
                >
                  {t.icon}
                </div>
                <div className="flex-1 min-w-0 pr-6">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={t.tone}>{t.label}</Badge>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-graytext-mid group-hover:text-graytext-light transition-colors">{ago(n.at)}</span>
                  </div>
                  <div className={cx("mt-2 text-[14px] font-semibold text-offwhite flex items-center gap-2", !isExpanded && "truncate")}>
                    {n.title}
                  </div>
                  {n.type === 'update' && n.activity_title && (
                    <div className="mt-1 text-[11px] font-medium text-teal/80 uppercase tracking-wide">
                      From: {n.activity_title}
                    </div>
                  )}
                  <div className={cx("text-[13px] leading-relaxed text-graytext-light mt-1.5", !isExpanded && "line-clamp-2")}>
                    {n.body}
                  </div>
                </div>

                {/* Hover Dismiss Button */}
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id) }}
                  className="absolute top-4 right-3 p-1.5 rounded-full bg-black/40 text-graytext-mid opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition-all backdrop-blur-md border border-white/5"
                  title="Delete"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>
              </div>
            )
          })
        )}
      </div>
      </div>
    </div>,
    document.body
  )
}
