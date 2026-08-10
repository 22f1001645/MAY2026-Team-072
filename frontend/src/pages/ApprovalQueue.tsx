import { useEffect, useState } from 'react'
import { inr } from '../lib/mock'
import { createPortal } from 'react-dom'
import { useAudit, useDecision, useProposals, useReassignHead, useUsers } from '../lib/queries'
import { Badge, Button, Card, SectionTitle, Input, useToast } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx, formatDate, scaleLabel } from '../lib/format'

// FR-B3/B4: admin approves / requests changes / rejects, with an audit trail
export default function ApprovalQueue() {
  const [statusTab, setStatusTab] = useState<'pending' | 'approved'>('pending')
  const { data: proposals = [], isLoading, isError, error } = useProposals(statusTab)
  const [selected, setSelected] = useState<string>('')
  const [note, setNote] = useState('')
  const decisionMut = useDecision()
  const reassignMut = useReassignHead()
  const { addToast } = useToast()

  const [showReassignModal, setShowReassignModal] = useState(false)
  const [reassignSearch, setReassignSearch] = useState('')
  const [newHeadId, setNewHeadId] = useState('')
  const { data: users = [] } = useUsers(reassignSearch.trim())

  // Keep a valid selection as the list changes
  useEffect(() => {
    if (proposals.length && !proposals.some((p) => p.id === selected)) {
      setSelected(proposals[0].id)
    }
  }, [proposals, selected])

  const current = proposals.find((p) => p.id === selected)
  const { data: audit = [] } = useAudit(current?.id)

  if (isLoading) return <Loading label="Loading the approval queue…" />
  if (isError) return <ErrorState error={error} />

  const decide = (decision: string) => {
    if (!current) return
    decisionMut.mutate(
      { id: current.id, decision, note },
      { onSuccess: () => setNote('') },
    )
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Admin"
        title="Approval Queue"
        sub="Approve, request changes, or reject — with a comment and an immutable audit trail on every decision."
        right={<Badge tone="warn">{proposals.length} {statusTab === 'pending' ? 'awaiting decision' : 'approved'}</Badge>}
      />

      <div className="mb-6 flex gap-2 border-b border-white/5 pb-2">
        <button
          className={cx("px-4 py-2 text-[14px] font-semibold transition-colors rounded-t-lg", statusTab === 'pending' ? "text-teal bg-teal/10" : "text-graytext-mid hover:text-offwhite")}
          onClick={() => { setStatusTab('pending'); setSelected(''); setNote(''); }}
        >
          Pending Queue
        </button>
        <button
          className={cx("px-4 py-2 text-[14px] font-semibold transition-colors rounded-t-lg", statusTab === 'approved' ? "text-teal bg-teal/10" : "text-graytext-mid hover:text-offwhite")}
          onClick={() => { setStatusTab('approved'); setSelected(''); setNote(''); }}
        >
          Past Approvals
        </button>
      </div>

      {proposals.length === 0 ? (
        <Card className="p-12 text-center text-graytext-light">
          🎉 The queue is clear — no proposals waiting on you.
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          {/* Queue list */}
          <div className="space-y-3">
            {proposals.map((p) => (
              <Card
                key={p.id}
                hover
                onClick={() => setSelected(p.id)}
                className={cx('p-4', selected === p.id && 'border-teal/50 shadow-glow-teal')}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-caption text-graytext-mid">{p.city}</span>
                  {p.proposalStatus === 'changes_requested' ? (
                    <Badge tone="warn">Re-submitted</Badge>
                  ) : (
                    <Badge tone="teal">New</Badge>
                  )}
                </div>
                <div className="mt-1.5 text-[15px] font-semibold text-offwhite">{p.title}</div>
                <div className="mt-1 text-caption text-graytext-light">
                  {scaleLabel[p.scale]} · {p.organiser}
                </div>
              </Card>
            ))}
          </div>

          {/* Detail + decision */}
          {current && (
            <div className="space-y-5">
              <Card className="p-6">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone="gold">{scaleLabel[current.scale]}</Badge>
                  <Badge tone="neutral">{current.city}</Badge>
                  {current.proposalStatus === 'changes_requested' && (
                    <Badge tone="warn">Previously returned</Badge>
                  )}
                </div>
                <h2 className="text-h2 font-bold text-gold">{current.title}</h2>
                <p className="mt-2 text-body text-graytext-light">
                  {current.description || 'No description provided.'}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-4 text-[14px] sm:grid-cols-4">
                  <Field label="Date" value={formatDate(current.startsAt)} />
                  <Field label="Venue" value={current.venue} />
                  <Field label="Capacity" value={String(current.capacity)} />
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-caption uppercase tracking-wider text-graytext-mid">Organiser</div>
                      {statusTab === 'pending' && (
                        <button
                          onClick={() => {
                            setReassignSearch('')
                            setNewHeadId('')
                            setShowReassignModal(true)
                          }}
                          className="rounded border border-teal/30 bg-teal/10 px-1.5 py-0.5 text-[10px] font-semibold text-teal hover:bg-teal/20"
                        >
                          Reassign
                        </button>
                      )}
                    </div>
                    <div className="text-offwhite">{current.organiser}</div>
                  </div>
                </div>

                {/* Team Roster & Collaborating Orgs */}
                {(current.teamRoster?.length > 0 || current.collaboratingOrgs?.length > 0) && (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    {current.teamRoster?.length > 0 && (
                      <div>
                        <div className="mb-2 text-caption font-semibold uppercase tracking-wider text-graytext-light">Team Roster</div>
                        <div className="space-y-1.5">
                          {current.teamRoster.map((member: any, i: number) => (
                            <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-[13px]">
                              <span className="text-offwhite">{member.name}</span>
                              <Badge tone="neutral">{member.role}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {current.collaboratingOrgs?.length > 0 && (
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-caption font-semibold uppercase tracking-wider text-graytext-light">Collaborating Orgs</span>
                          {(current as any).is_mega_meetup && <Badge tone="gold">Mega Meetup 🤝</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {current.collaboratingOrgs.map((org: any, i: number) => {
                            // Support both string array and object array forms in case of partial transition
                            const name = typeof org === 'string' ? org : org.org_name || org.name
                            const status = typeof org === 'string' ? 'accepted' : org.status
                            const tone = status === 'accepted' ? 'teal' : status === 'declined' ? 'danger' : 'warn'
                            return (
                              <Badge key={i} tone={tone}>
                                {name} {status !== 'accepted' ? `(${status})` : ''}
                              </Badge>
                            )
                          })}
                        </div>
                        {current.collaboratingOrgs.some((o: any) => typeof o === 'object' && o.status === 'pending') && (
                          <div className="mt-2 text-[12px] text-amber-400">
                            Advisory: Some collaborations are still pending.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Budget */}
                <div className="mt-6">
                  <div className="mb-2 text-caption font-semibold uppercase tracking-wider text-graytext-light">
                    Requested budget
                  </div>
                  <div className="overflow-hidden rounded-xl border border-white/8">
                    {current.budget.map((b, i) => (
                      <div
                        key={b.id}
                        className={cx(
                          'flex items-center justify-between px-4 py-2.5 text-[14px]',
                          i % 2 === 0 ? 'bg-white/[0.02]' : '',
                        )}
                      >
                        <span className="text-graytext-light">{b.label}</span>
                        <span className="font-semibold text-offwhite">{inr(b.planned)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between border-t border-white/8 bg-teal/[0.06] px-4 py-2.5 text-[14px]">
                      <span className="font-semibold text-teal">Total</span>
                      <span className="font-bold text-teal">
                        {inr(current.budget.reduce((s, b) => s + b.planned, 0))}
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Decision panel */}
              <Card className="p-6">
                <label className="mb-2 block text-caption font-semibold uppercase tracking-wider text-graytext-light">
                  Decision comment
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note to the organiser (required for changes)…"
                  className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none"
                />
                {decisionMut.isError && (
                  <p className="mt-2 text-caption text-red-300">
                    {(decisionMut.error as Error).message}
                  </p>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  {statusTab === 'pending' ? (
                    <>
                      <Button variant="ghost" onClick={() => setNote('')}>Clear</Button>
                      <Button onClick={() => decide('approve')} disabled={decisionMut.isPending}>
                        Approve & Publish
                      </Button>
                      <Button variant="secondary" onClick={() => decide('changes')} disabled={decisionMut.isPending}>
                        Request Changes
                      </Button>
                      <Button variant="danger" onClick={() => decide('reject')} disabled={decisionMut.isPending}>
                        Reject
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="danger" onClick={() => decide('revoke')} disabled={decisionMut.isPending}>
                        Revoke Approval
                      </Button>
                    </>
                  )}
                </div>
              </Card>

              {/* Audit trail (FR-B4) */}
              <Card className="p-6">
                <h3 className="mb-4 text-h3 font-semibold text-gold">Audit trail</h3>
                <div className="space-y-4">
                  {audit.map((a, i) => (
                    <div key={i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2.5 w-2.5 rounded-full bg-teal" />
                        {i < audit.length - 1 && <div className="w-px flex-1 bg-white/10" />}
                      </div>
                      <div className="-mt-1 pb-2">
                        <div className="text-[14px] text-offwhite">{a.action}</div>
                        <div className="text-caption text-graytext-mid">
                          {a.actor} · {new Date(a.at).toLocaleString('en-IN')}
                        </div>
                        {a.note && (
                          <div className="mt-1 text-caption text-graytext-light">“{a.note}”</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}

      {/* ---- REASSIGN HEAD MODAL ---- */}
      {showReassignModal && current && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6">
            <h3 className="mb-1 text-[18px] font-bold text-offwhite">Reassign Meetup Head</h3>
            <p className="mb-4 text-caption text-graytext-light">
              Current Head: <strong className="text-offwhite">{current.organiser}</strong>. 
              Search for a new user to transfer ownership.
            </p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-caption font-semibold text-graytext-mid">
                  Search Member by Email or Name
                </label>
                <Input
                  placeholder="Type email or name..."
                  value={reassignSearch}
                  onChange={(e) => {
                    setReassignSearch(e.target.value)
                    setNewHeadId('')
                  }}
                />
                
                {reassignSearch.trim() !== '' && !newHeadId && (
                  <div className="mt-2 max-h-[160px] overflow-y-auto rounded-xl border border-white/10 bg-onyx custom-scrollbar">
                    {users.length === 0 ? (
                      <div className="px-3.5 py-3 text-[13px] text-graytext-mid">No members found matching "{reassignSearch}"</div>
                    ) : (
                      users.map((u: any) => (
                        <button
                          key={u.id}
                          type="button"
                          className="w-full border-b border-white/5 px-3.5 py-2.5 text-left text-[13px] last:border-0 hover:bg-white/5 focus:bg-white/5 focus:outline-none"
                          onClick={() => setNewHeadId(u.id)}
                        >
                          <div className="font-semibold text-offwhite">{u.name}</div>
                          <div className="text-graytext-mid">{u.email} <span className="mx-1">•</span> {u.city}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {newHeadId && (
                <div className="rounded-lg border border-teal/30 bg-teal/5 px-3.5 py-2 text-[12px] text-teal">
                  ✓ Selected: <strong>{users.find((u: any) => u.id === newHeadId)?.name}</strong>
                </div>
              )}

              {reassignMut.isError && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-[12px] text-red-300">
                  ⚠️ {(reassignMut.error as Error).message}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowReassignModal(false)}>Cancel</Button>
                <Button 
                  type="button" 
                  disabled={!newHeadId || reassignMut.isPending}
                  onClick={() => {
                    reassignMut.mutate(
                      { id: current.id, new_head_user_id: newHeadId },
                      {
                        onSuccess: () => {
                          setShowReassignModal(false)
                          addToast('Meetup Head reassigned successfully!')
                        }
                      }
                    )
                  }}
                >
                  {reassignMut.isPending ? 'Reassigning…' : 'Confirm Reassign'}
                </Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-caption uppercase tracking-wider text-graytext-mid">{label}</div>
      <div className="text-offwhite">{value}</div>
    </div>
  )
}
