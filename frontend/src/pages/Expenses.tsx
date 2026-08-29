import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { inr } from '../lib/mock'
import { useEvent, useExpensesFor, useSubmitExpense, useUploadExpenseBill } from '../lib/queries'
import { Button, Card, Badge, Progress, Select } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx } from '../lib/format'

const STAGES = ['submitted', 'verified', 'approved', 'paid']
const STAGE_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  verified: 'Verified',
  approved: 'Approved',
  paid: 'Paid',
}
const STATUS_TONE: Record<string, any> = {
  submitted: 'neutral',
  verified: 'gold',
  approved: 'teal',
  paid: 'success',
}

export default function Expenses() {
  const { id } = useParams()
  const { data: e, isLoading, isError, error } = useEvent(id)
  const { data: expenses = [] } = useExpensesFor(id)
  const submitMut = useSubmitExpense()

  const [adding, setAdding] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  
  const [amt, setAmt] = useState('')
  const [desc, setDesc] = useState('')
  const [lineId, setLineId] = useState('')
  // The server-chosen filename, and the original one purely so the organiser can
  // see which receipt they picked.
  const [billName, setBillName] = useState('')
  const [billLabel, setBillLabel] = useState('')
  const uploadMut = useUploadExpenseBill()

  if (isLoading) return <Loading label="Loading reimbursements..." />
  if (isError) return <ErrorState error={error} />
  if (!e) return <div>Event not found</div>

  const planned = e.budget.reduce((s: number, b: any) => s + b.planned, 0)
  const spent = expenses.reduce((s: number, x: any) => s + x.amount, 0)
  const current = expenses.find((x: any) => x.id === selectedId)

  const submit = () => {
    submitMut.mutate(
      {
        activity_id: e.id,
        budget_line_id: lineId || e.budget[0]?.id,
        label: desc || 'Expense',
        amount: parseInt(amt) || 0,
        bill_name: billName || 'bill.pdf',
      },
      {
        onSuccess: () => {
          setAdding(false)
          setAmt('')
          setDesc('')
          setBillName('')
          setBillLabel('')
        },
      },
    )
  }

  return (
    <div className="min-h-[calc(100vh-64px)] pb-12 px-4 max-w-5xl mx-auto">
      <Link 
        to="/organiser" 
        className="mb-6 mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[12px] font-bold tracking-widest uppercase text-graytext-mid backdrop-blur-md transition-all duration-300 hover:border-teal/30 hover:bg-teal/10 hover:text-teal hover:shadow-[0_0_15px_rgba(92,230,201,0.15)] group"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="transition-transform duration-300 group-hover:-translate-x-1">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
        Back to Dashboard
      </Link>
      
      {/* Financial Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-teal mb-2">{e.city} &bull; Reimbursement</div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">{e.title}</h1>
          <p className="text-[15px] text-graytext-mid">
            Submit your bills and track payouts in real-time.
          </p>
        </div>
        <Button onClick={() => setAdding(true)}>+ Submit Expense</Button>
      </div>

      {/* Unified Metrics Bar */}
      <div className="mb-8 grid sm:grid-cols-3 rounded-xl border border-white/10 bg-onyx/40 overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-white/10">
        <div className="p-6 pb-8">
          <div className="text-[11px] uppercase tracking-widest text-graytext-mid font-semibold mb-2">Total Budget</div>
          <div className="font-mono text-3xl font-bold text-offwhite">{inr(planned)}</div>
        </div>
        <div className="p-6 relative bg-white/[0.02]">
          <div className="text-[11px] uppercase tracking-widest text-graytext-mid font-semibold mb-2">Claimed</div>
          <div className="font-mono text-3xl font-bold text-offwhite">{inr(spent)}</div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5">
            <div className="h-full bg-teal transition-all duration-500" style={{ width: `${Math.min(100, (spent / (planned || 1)) * 100)}%` }} />
          </div>
        </div>
        <div className="p-6 pb-8">
          <div className="text-[11px] uppercase tracking-widest text-graytext-mid font-semibold mb-2">Remaining</div>
          <div className="font-mono text-3xl font-bold text-offwhite">{inr(planned - spent)}</div>
        </div>
      </div>

      {/* Ledger Table */}
      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-24">
          <p className="text-graytext-mid font-mono text-[14px]">NO_EXPENSES_SUBMITTED</p>
        </div>
      ) : (
        <Card className="overflow-hidden border border-white/10 rounded-xl bg-onyx/20">
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-white/10 bg-onyx/20 text-[11px] uppercase tracking-widest text-graytext-mid font-semibold">
                  <th className="px-6 py-4 text-left font-semibold">Expense Label</th>
                  <th className="px-6 py-4 text-left font-semibold">Receipt</th>
                  <th className="px-6 py-4 text-right font-semibold">Amount</th>
                  <th className="px-6 py-4 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {expenses.map((x: any) => (
                  <tr 
                    key={x.id} 
                    onClick={() => setSelectedId(x.id)}
                    className="group cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-offwhite group-hover:text-teal transition-colors">{x.label}</div>
                      <div className="text-[12px] text-graytext-mid font-mono mt-1">ID: {x.id.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-2 text-[13px] text-graytext-light font-mono group-hover:text-teal transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        {x.bill_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-offwhite">
                      {inr(x.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge tone={STATUS_TONE[x.status]}>
                        {STAGE_LABEL[x.status]}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Side-Sheet: Submit Expense */}
      {adding && (
        <div className="relative z-50">
          <div className="fixed inset-0 bg-scrim/60 backdrop-blur-sm" onClick={() => setAdding(false)} />
          <div className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col bg-[#111111] shadow-2xl border-l border-white/10 animate-fade-in-right">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-8 py-5 bg-onyx-raised">
              <h2 className="text-[13px] font-bold text-graytext-mid uppercase tracking-widest">Submit Expense</h2>
              <button onClick={() => setAdding(false)} className="rounded-full p-2 text-graytext-mid hover:bg-white/10 hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
              <div>
                <FieldLabel>Budget Line</FieldLabel>
                <Select
                  value={lineId}
                  onChange={(ev) => setLineId(ev.target.value)}
                  options={e.budget.map((b: any) => ({ label: `${b.label} - ${inr(b.planned)}`, value: b.id }))}
                />
              </div>
              <div>
                <FieldLabel>Amount (&#8377;)</FieldLabel>
                <input value={amt} onChange={(ev) => setAmt(ev.target.value.replace(/\D/g, ''))}
                       placeholder="8600"
                       className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite font-mono focus:border-teal/50 focus:outline-none" />
              </div>
              <div>
                <FieldLabel>Description</FieldLabel>
                <input value={desc} onChange={(ev) => setDesc(ev.target.value)}
                       placeholder="Roastery bill - 38 covers"
                       className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite focus:border-teal/50 focus:outline-none" />
              </div>
              <div>
                <FieldLabel>Attach Bill</FieldLabel>
                <label className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-graytext-mid hover:bg-white/[0.04] transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,application/pdf"
                    className="hidden"
                    onChange={(ev) => {
                      const file = ev.target.files?.[0]
                      if (!file) return
                      uploadMut.mutate(
                        { activityId: e.id, file },
                        { onSuccess: (r) => { setBillName(r.billName); setBillLabel(r.originalName) } },
                      )
                      // Clear it so re-picking the same file still fires a change.
                      ev.target.value = ''
                    }}
                  />
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 16V4M6 10l6-6 6 6M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[13px] font-mono">
                    {uploadMut.isPending ? 'Uploading…' : billLabel || 'Upload Photo or PDF'}
                  </span>
                </label>
                {uploadMut.isError && (
                  <p className="mt-2 text-caption text-red-400">{(uploadMut.error as Error).message}</p>
                )}
              </div>
              {submitMut.isError && (
                <p className="text-caption text-red-400">{(submitMut.error as Error).message}</p>
              )}
            </div>
            <div className="shrink-0 border-t border-white/10 bg-onyx-raised p-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
              <Button onClick={submit} disabled={submitMut.isPending || !amt}>
                {submitMut.isPending ? 'Submitting...' : 'Submit for Verification'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Side-Sheet: Expense Pipeline & Details */}
      {selectedId && current && (
        <div className="relative z-50">
          <div className="fixed inset-0 bg-scrim/60 backdrop-blur-sm" onClick={() => setSelectedId(null)} />
          <div className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col bg-[#111111] shadow-2xl border-l border-white/10 animate-fade-in-right">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-8 py-5 bg-onyx-raised">
              <h2 className="text-[13px] font-bold text-graytext-mid uppercase tracking-widest">Expense Status</h2>
              <button onClick={() => setSelectedId(null)} className="rounded-full p-2 text-graytext-mid hover:bg-white/10 hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-graytext-mid mb-2">Claim Amount</div>
                  <div className="font-mono text-4xl font-bold text-offwhite">{inr(current.amount)}</div>
                </div>
                <Badge tone={STATUS_TONE[current.status]}>{STAGE_LABEL[current.status]}</Badge>
              </div>

              {/* Status Pipeline */}
              <div className="mb-10">
                <div className="text-[11px] uppercase tracking-widest text-graytext-mid mb-6">Approval Pipeline</div>
                <div className="flex items-center">
                  {STAGES.map((s, i) => {
                    const stageIdx = STAGES.indexOf(current.status)
                    const isActive = i <= stageIdx
                    return (
                      <div key={s} className="flex flex-1 items-center last:flex-none">
                        <div className="flex flex-col items-center">
                          <div className={cx('grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold transition-colors', isActive ? 'bg-teal text-onyx shadow-[0_0_15px_rgba(92,230,201,0.3)]' : 'border border-white/15 text-graytext-mid bg-onyx-raised')}>
                            {isActive ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            ) : i + 1}
                          </div>
                          <span className={cx('mt-3 absolute translate-y-8 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest', isActive ? 'text-teal' : 'text-graytext-mid')}>
                            {STAGE_LABEL[s]}
                          </span>
                        </div>
                        {i < STAGES.length - 1 && (
                          <div className={cx('mx-2 h-0.5 flex-1 transition-colors', i < stageIdx ? 'bg-teal' : 'bg-white/10')} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 mt-16 mb-8 pb-8 border-b border-white/10 border-t pt-8">
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-graytext-mid mb-2">Expense Label</div>
                  <div className="text-[15px] font-semibold text-offwhite">{current.label}</div>
                  <div className="font-mono text-[12px] text-graytext-mid mt-1">ID: {current.id}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-widest text-graytext-mid mb-2">Receipt File</div>
                  <div className="text-[13px] text-teal font-mono">{current.bill_name}</div>
                </div>
              </div>
            </div>


          </div>
        </div>
      )}
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-[11px] font-bold uppercase tracking-widest text-graytext-mid">
      {children}
    </label>
  )
}

