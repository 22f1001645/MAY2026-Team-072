import { useEffect, useState } from 'react'
import { inr } from '../lib/mock'
import { useAudit, useDecision, useProposals } from '../lib/queries'
import { Badge, Button, Card, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx, formatDate, scaleLabel } from '../lib/format'

// FR-B3/B4: admin approves / requests changes / rejects, with an audit trail
export default function ApprovalQueue() {
  const [statusTab, setStatusTab] = useState<'pending' | 'approved'>('pending')
  const { data: proposals = [], isLoading, isError, error } = useProposals(statusTab)
  const [selected, setSelected] = useState<string>('')
  const [note, setNote] = useState('')
  const decisionMut = useDecision()

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
                  <Field label="Organiser" value={current.organiser} />
                </div>

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
