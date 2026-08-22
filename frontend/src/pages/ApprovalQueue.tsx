import { useEffect, useState } from 'react'
import { inr } from '../lib/mock'
import { useAudit, useDecision, useProposals } from '../lib/queries'
import { Badge, Button, SectionTitle, StatCard } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx, formatDate, scaleLabel } from '../lib/format'
import CollabStatus from '../components/CollabStatus'
import WelcomeBanner from '../components/WelcomeBanner'

export default function ApprovalQueue() {
  const [statusTab, setStatusTab] = useState<'pending' | 'approved' | 'completed'>('pending')
  
  // Fetch both sets of data so we can derive the three queues immediately
  const { data: pendingData = [], isLoading: pLoad, isError: pErr, error: pError } = useProposals('pending')
  const { data: approvedData = [], isLoading: aLoad, isError: aErr, error: aError } = useProposals('approved')
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const decisionMut = useDecision()

  const now = new Date()
  
  // Derive the 3 lists
  const pendingList = pendingData
  const approvedList = approvedData.filter(p => new Date(p.startsAt) > now)
  const completedList = approvedData.filter(p => new Date(p.startsAt) <= now)

  // Get active list based on tab
  const activeList = statusTab === 'pending' ? pendingList : statusTab === 'approved' ? approvedList : completedList
  const current = [...pendingData, ...approvedData].find((p) => p.id === selectedId)
  
  const { data: audit = [] } = useAudit(current?.id)

  if (pLoad || aLoad) return <Loading label="Loading the approval queue..." />
  if (pErr) return <ErrorState error={pError} />
  if (aErr) return <ErrorState error={aError} />

  const decide = (decision: string) => {
    if (!current) return
    decisionMut.mutate(
      { id: current.id, decision, note },
      { 
        onSuccess: () => {
          setNote('')
          setSelectedId(null) // Close the drawer on success
        } 
      },
    )
  }
  
  const totalEvents = pendingList.length + approvedList.length + completedList.length

  return (
    <div className="min-h-[calc(100vh-64px)] pb-12">
      <div className="px-4">
        <WelcomeBanner />
        <SectionTitle
          eyebrow="ADMIN · ACTIVITIES"
          title="Approval Queue"
          sub="Review, collaborate, and approve event proposals from organisers across the ecosystem."
        />

        <div className="mb-10 grid gap-4 sm:grid-cols-3">
          <StatCard label="Awaiting Decision" value={pendingList.length.toString()} tone={pendingList.length > 0 ? "teal" : undefined} />
          <StatCard label="Approved (Upcoming)" value={approvedList.length.toString()} />
          <StatCard label="Completed Events" value={completedList.length.toString()} />
        </div>
      </div>

      {totalEvents === 0 ? (
        <div className="mx-2 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-white/[0.01] py-32 text-center">
          <div className="mb-4 text-6xl opacity-50">✨</div>
          <h3 className="text-xl font-bold text-offwhite">All Clear</h3>
          <p className="mt-2 text-graytext-mid">No proposals have been submitted by organisers yet.</p>
        </div>
      ) : (
        <div className="px-4">
          {/* Tabs */}
          <div className="mb-8 flex flex-wrap gap-3 border-b border-white/10 pb-4">
            <TabButton 
              active={statusTab === 'pending'} 
              onClick={() => setStatusTab('pending')} 
              label="Pending" 
              count={pendingList.length} 
            />
            <TabButton 
              active={statusTab === 'approved'} 
              onClick={() => setStatusTab('approved')} 
              label="Approved" 
              count={approvedList.length} 
            />
            <TabButton 
              active={statusTab === 'completed'} 
              onClick={() => setStatusTab('completed')} 
              label="Completed" 
              count={completedList.length} 
            />
          </div>

          {/* Grid */}
          {activeList.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-white/5 bg-white/[0.02] py-20 text-center">
              <p className="text-[15px] font-medium text-graytext-mid">No events in this queue.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activeList.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className="group flex flex-col text-left overflow-hidden rounded-2xl border border-white/10 bg-onyx/40 transition-all hover:-translate-y-1 hover:border-teal/30 hover:shadow-glow-teal hover:bg-onyx/60"
                >
                  <div className="flex-1 p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-teal/80">{p.city}</span>
                      {statusTab === 'pending' ? (
                        p.proposalStatus === 'changes_requested' ? (
                          <Badge tone="warn">Returned</Badge>
                        ) : (
                          <Badge tone="teal">New</Badge>
                        )
                      ) : statusTab === 'approved' ? (
                        <Badge tone="neutral">Upcoming</Badge>
                      ) : (
                        <Badge tone="neutral">Completed</Badge>
                      )}
                    </div>
                    <h2 className="mb-1 text-lg font-bold leading-tight text-white line-clamp-2 transition-colors group-hover:text-teal">{p.title}</h2>
                    <p className="text-[13px] text-graytext-mid line-clamp-1">{scaleLabel[p.scale]}</p>
                  </div>
                  <div className="border-t border-white/5 bg-black/20 px-5 py-3 text-[13px] font-medium text-graytext-light">
                    By {p.organiser}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sliding Side-Sheet (Drawer) */}
      {selectedId && current && (
        <div className="relative z-50">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedId(null)}
          />
          
          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 flex w-full max-w-2xl flex-col bg-onyx/90 backdrop-blur-3xl shadow-2xl border-l border-white/10 animate-fade-in-right">
            
            {/* Drawer Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-8 py-5 bg-black/20">
              <h2 className="text-lg font-bold text-white tracking-wide">Proposal Details</h2>
              <button 
                onClick={() => setSelectedId(null)}
                className="rounded-full p-2 text-graytext-mid hover:bg-white/10 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
              <div className="space-y-10 pb-8">
                
                {/* Header info */}
                <div>
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge tone="gold">{scaleLabel[current.scale]}</Badge>
                    <Badge tone="neutral">{current.city}</Badge>
                    {current.proposalStatus === 'changes_requested' && (
                      <Badge tone="warn">Previously returned</Badge>
                    )}
                  </div>
                  <h2 className="text-[32px] font-bold leading-tight tracking-tight text-white">{current.title}</h2>
                  <p className="mt-3 text-[15px] leading-relaxed text-graytext-light">
                    {current.description || 'No description provided.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-y-6 gap-x-4 sm:grid-cols-4">
                  <Field label="Date" value={formatDate(current.startsAt)} />
                  <Field label="Venue" value={current.venue} />
                  <Field label="Capacity" value={String(current.capacity)} />
                  <Field label="Organiser" value={current.organiser} />
                </div>

                {/* Budget */}
                <div className="border-t border-white/5 pt-8">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-graytext-mid mb-4">
                    Requested budget
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-inner">
                    {current.budget.map((b, i) => (
                      <div
                        key={b.id}
                        className={cx(
                          'flex items-center justify-between px-5 py-3 text-[14px]',
                          i % 2 === 0 ? 'bg-white/[0.02]' : '',
                        )}
                      >
                        <span className="text-graytext-light">{b.label}</span>
                        <span className="font-mono text-offwhite">{inr(b.planned)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-white/10 bg-teal/10 px-5 py-4 text-[14px]">
                      <span className="font-semibold text-teal tracking-wide uppercase text-[12px]">Total Amount</span>
                      <span className="font-mono font-bold text-teal text-[16px]">
                        {inr(current.budget.reduce((s, b) => s + b.planned, 0))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Collaborating Orgs */}
                {current.collaborators && current.collaborators.length > 0 && (
                  <div className="border-t border-white/5 pt-8">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-graytext-mid">
                        Collaborating organisations
                      </h3>
                      {current.isMegaMeetup && (
                        <Badge tone="gold">Mega Meetup</Badge>
                      )}
                    </div>
                    <div className="grid gap-2">
                      {current.collaborators.map((c: any) => (
                        <div key={c.id} className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                          <span className="flex-1 text-[14px] font-medium text-offwhite">{c.org || c.org_id}</span>
                          {c.is_primary && <Badge tone="gold">Primary</Badge>}
                          <CollabStatus status={c.status} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Team Roster */}
                {current.teamMembers && current.teamMembers.length > 0 && (
                  <div className="border-t border-white/5 pt-8">
                    <h3 className="text-[11px] font-bold uppercase tracking-widest text-graytext-mid mb-4">
                      Event team
                    </h3>
                    <div className="grid gap-2">
                      {current.teamMembers.map((t: any) => (
                        <div key={t.id} className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                          <span className="flex-1 text-[14px] font-medium text-offwhite">{t.member || t.user_id}</span>
                          <span className={"text-[12px] font-bold uppercase tracking-wider " + (t.role === 'Meetup Head' ? 'text-gold' : 'text-graytext-mid')}>
                            {t.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Audit trail */}
                <div className="border-t border-white/5 pt-8">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest text-graytext-mid mb-6">
                    Audit trail
                  </h3>
                  <div className="space-y-0">
                    {audit.map((a, i) => (
                      <div key={i} className="flex gap-4 relative">
                        <div className="flex flex-col items-center">
                          <div className="h-3 w-3 rounded-full border-[2px] border-black bg-teal z-10" />
                          {i < audit.length - 1 && <div className="absolute top-3 bottom-[-12px] left-[5px] w-[2px] bg-white/10" />}
                        </div>
                        <div className="-mt-1 pb-6">
                          <div className="text-[14px] font-semibold text-offwhite mb-1">{a.action}</div>
                          <div className="text-[12px] text-graytext-mid tracking-wide">
                            {a.actor} | {new Date(a.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                          {a.note && (
                            <div className="mt-2 text-[13px] text-graytext-light italic border-l-2 border-white/10 pl-3">
                              "{a.note}"
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="shrink-0 border-t border-white/10 bg-onyx/90 p-6 backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                  <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-graytext-mid">
                    Decision comment
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Optional note to the organiser (required for changes)..."
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-4 py-2.5 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none focus:ring-1 focus:ring-teal/50 transition-all shadow-inner"
                  />
                  {decisionMut.isError && (
                    <p className="mt-2 text-[12px] text-red-400">
                      {(decisionMut.error as Error).message}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  {current.proposalStatus === 'submitted' || current.proposalStatus === 'changes_requested' ? (
                    <>
                      {note && <Button variant="ghost" onClick={() => setNote('')}>Clear</Button>}
                      <Button variant="secondary" onClick={() => decide('changes')} disabled={decisionMut.isPending}>
                        Request Changes
                      </Button>
                      <Button variant="danger" onClick={() => decide('reject')} disabled={decisionMut.isPending}>
                        Reject
                      </Button>
                      <Button onClick={() => decide('approve')} disabled={decisionMut.isPending} className="shadow-glow-teal">
                        Approve & Publish
                      </Button>
                    </>
                  ) : (
                    new Date(current.startsAt) > new Date() ? (
                      <Button variant="danger" onClick={() => decide('revoke')} disabled={decisionMut.isPending}>
                        Revoke Approval
                      </Button>
                    ) : (
                      <div className="text-[12px] font-semibold text-graytext-mid self-center px-4">
                        Cannot revoke past events
                      </div>
                    )
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TabButton({ active, onClick, label, count }: { active: boolean, onClick: () => void, label: string, count: number }) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold transition-all duration-300",
        active 
          ? "bg-teal/15 text-teal shadow-inner border border-teal/20" 
          : "bg-white/[0.03] text-graytext-mid border border-white/5 hover:bg-white/[0.06] hover:text-offwhite hover:border-white/10"
      )}
    >
      {label}
      <span className={cx(
        "flex items-center justify-center rounded-full px-2 py-0.5 text-[12px] min-w-[24px]",
        active ? "bg-teal/20 text-teal font-bold" : "bg-black/30 text-graytext-mid"
      )}>
        {count}
      </span>
    </button>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-bold uppercase tracking-widest text-graytext-mid mb-1">{label}</div>
      <div className="text-[15px] font-medium text-offwhite truncate">{value}</div>
    </div>
  )
}
