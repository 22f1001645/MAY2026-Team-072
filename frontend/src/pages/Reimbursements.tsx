import { useState } from 'react'
import { inr } from '../lib/mock'
import { useReimbursements, useVerifyExpense, useUpdateExpenseAmount } from '../lib/queries'
import { Badge, Button, Card, SectionTitle, StatCard } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import ExportButton from '../components/ExportButton'
import type { ExpenseStatus } from '../lib/types'
import { cx, formatDate } from '../lib/format'

const NEXT_LABEL: Record<ExpenseStatus, string | null> = {
  submitted: 'Verify Expense',
  verified: 'Approve Reimbursement',
  approved: 'Mark as Paid',
  paid: null,
}

const STATUS_TONE: Record<string, any> = {
  submitted: 'neutral',
  verified: 'gold',
  approved: 'teal',
  paid: 'success',
}

export default function Reimbursements() {
  const { data: rows = [], isLoading, isError, error } = useReimbursements()
  const verifyMut = useVerifyExpense()
  const updateMut = useUpdateExpenseAmount()
  
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editAmt, setEditAmt] = useState('')
  const current = rows.find((r: any) => r.id === selectedId)

  const handleUpdateAmount = () => {
    if (!current) return
    const amt = parseInt(editAmt)
    if (!isNaN(amt)) {
      updateMut.mutate({ id: current.id, amount: amt }, {
        onSuccess: () => setIsEditing(false)
      })
    }
  }

  if (isLoading) return <Loading label="Loading financial records..." />
  if (isError) return <ErrorState error={error} />

  const totalPending = rows
    .filter((r: any) => r.status !== 'paid')
    .reduce((s: number, r: any) => s + r.amount, 0)

  const counts = (s: string) => rows.filter((r: any) => r.status === s).length
  const stages: ExpenseStatus[] = ['submitted', 'verified', 'approved', 'paid']

  const handleAction = () => {
    if (!current) return
    verifyMut.mutate(current.id, {
      onSuccess: () => setSelectedId(null)
    })
  }

  return (
    <div className="min-h-[calc(100vh-64px)] pb-12 px-4 max-w-7xl mx-auto">
      
      <SectionTitle
        eyebrow="ADMIN · FINANCE"
        title="Reimbursements"
        sub="Review and clear out-of-pocket expenses for organisers."
        right={
          <div className="flex items-center gap-3">
            {/* Finance reconciles these lines against receipts outside the app. */}
            <ExportButton
              kind="reimbursements"
              disabled={rows.length === 0}
              columns={['Event', 'City', 'Expense', 'Amount (INR)', 'Status', 'Bill', 'Expense ID']}
              rows={() =>
                rows.map((r: any) => ({
                  Event: r.activity ?? '',
                  City: r.city ?? '',
                  Expense: r.label ?? '',
                  'Amount (INR)': r.amount ?? 0,
                  Status: r.status ?? '',
                  Bill: r.bill_name ?? '',
                  'Expense ID': r.id ?? '',
                }))
              }
            />
            <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-onyx/40 px-4 py-2.5 shadow-inner">
              <span className="text-[12px] font-bold uppercase tracking-widest text-graytext-mid">Pipeline Value</span>
              <span className="font-mono text-lg font-bold text-teal">{inr(totalPending)}</span>
            </div>
          </div>
        }
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stages.map((s) => (
          <StatCard 
            key={s} 
            label={s === 'paid' ? 'Completed (Paid)' : s} 
            value={counts(s).toString()} 
            tone={s === 'approved' && counts(s) > 0 ? 'teal' : s === 'verified' && counts(s) > 0 ? 'gold' : undefined}
          />
        ))}
      </div>

      {/* Ledger Table */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-24">
          <p className="text-graytext-mid font-mono text-[14px]">NO_RECORDS_FOUND</p>
        </div>
      ) : (
        <Card className="overflow-hidden border border-white/10 rounded-xl bg-onyx/20">
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-white/5 text-caption uppercase tracking-wider text-graytext-mid bg-onyx/40">
                  <th className="px-6 py-4 text-left font-semibold">Expense Ref</th>
                  <th className="px-6 py-4 text-left font-semibold">Event Code</th>
                  <th className="px-6 py-4 text-left font-semibold">Receipt</th>
                  <th className="px-6 py-4 text-right font-semibold">Amount</th>
                  <th className="px-6 py-4 text-center font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r: any) => (
                  <tr 
                    key={r.id} 
                    onClick={() => setSelectedId(r.id)}
                    className="group cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="font-semibold text-offwhite group-hover:text-teal transition-colors">{r.label}</div>
                      <div className="text-[12px] text-graytext-mid font-mono mt-1">ID: {r.id.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-graytext-light">{r.activity}</div>
                      <div className="text-[12px] text-graytext-mid mt-1 uppercase tracking-wider">{r.city}</div>
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
                        {r.bill_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono font-semibold text-offwhite">
                      {inr(r.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge tone={STATUS_TONE[r.status]}>
                        {r.status === 'paid' ? 'Paid' : r.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Side-Sheet Drawer for Receipt Verification */}
      {selectedId && current && (
        <div className="relative z-50">
          <div 
            className="fixed inset-0 bg-scrim/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedId(null)}
          />
          
          <div className="fixed inset-y-0 right-0 flex w-full max-w-md flex-col bg-[#111111] shadow-2xl border-l border-white/10 animate-fade-in-right">
            
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-8 py-5 bg-onyx-raised">
              <h2 className="text-[13px] font-bold text-graytext-mid uppercase tracking-widest">Verify Expense</h2>
              <button 
                onClick={() => setSelectedId(null)}
                className="rounded-full p-2 text-graytext-mid hover:bg-white/10 hover:text-white transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              
              <div className="flex items-center justify-between mb-8 pb-8 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-[11px] uppercase tracking-widest text-graytext-mid">Claim Amount</div>
                    {!isEditing && (current.status === 'submitted' || current.status === 'verified') && (
                      <button onClick={() => { setIsEditing(true); setEditAmt(current.amount.toString()) }} className="text-teal hover:text-teal/80 text-[11px] uppercase tracking-widest font-semibold">
                        Edit
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <span className="text-2xl text-graytext-mid">&#8377;</span>
                      <input 
                        type="number" 
                        value={editAmt} 
                        onChange={e => setEditAmt(e.target.value)}
                        className="bg-transparent text-4xl font-mono font-bold text-offwhite border-b border-teal focus:outline-none w-32"
                      />
                      <Button size="sm" onClick={handleUpdateAmount} disabled={updateMut.isPending}>Save</Button>
                      <button onClick={() => setIsEditing(false)} className="text-graytext-mid hover:text-white ml-2 text-sm">Cancel</button>
                    </div>
                  ) : (
                    <div className="font-mono text-4xl font-bold text-offwhite">{inr(current.amount)}</div>
                  )}
                  {updateMut.isError && <div className="text-red-400 text-sm mt-2">Error updating amount</div>}
                </div>
                <Badge tone={STATUS_TONE[current.status]}>
                  {current.status === 'paid' ? 'Completed' : current.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-white/10">
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-widest text-graytext-mid mb-2">Expense Label</div>
                  <div className="text-[15px] font-semibold text-offwhite">{current.label}</div>
                  <div className="font-mono text-[12px] text-graytext-mid mt-1 truncate" title={current.id}>ID: {current.id}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] uppercase tracking-widest text-graytext-mid mb-2">Event & City</div>
                  <div className="text-[15px] font-semibold text-offwhite">{current.activity}</div>
                  <div className="text-[13px] text-graytext-mid mt-1">{current.city}</div>
                </div>
              </div>

              {/* Social Post Verification (REIMB-02) */}
              <div className="mb-8 pb-8 border-b border-white/10">
                <div className="text-[11px] uppercase tracking-widest text-graytext-mid mb-2">
                  Social Post Proof
                </div>
                {current.social_post_url ? (
                  <a
                    href={current.social_post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-teal text-[14px] font-medium hover:underline hover:text-teal/80 transition-colors break-all group"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                    {current.social_post_url}
                  </a>
                ) : (
                  <span className="text-graytext-mid text-[13px] italic">
                    No social post link submitted
                  </span>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-[11px] uppercase tracking-widest text-graytext-mid">Uploaded Receipt</div>
                  <div className="font-mono text-[12px] text-teal">{current.bill_name}</div>
                </div>
                
                {/* Simulated Receipt Preview */}
                <div className="relative aspect-[3/4] w-full rounded-lg border border-white/10 bg-onyx-raised overflow-hidden flex flex-col items-center justify-center p-8">
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-black to-black" />
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-graytext-mid mb-4">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                    <polyline points="10 9 9 9 8 9" />
                  </svg>
                  <div className="font-mono text-sm text-graytext-mid text-center">
                    [ Receipt Document Preview ]<br/>
                    <span className="text-[11px] opacity-50">Ekatva OS does not store real PII</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="shrink-0 border-t border-white/10 bg-onyx-raised p-6">
              <div className="flex justify-between items-center">
                <div className="text-[11px] font-mono text-graytext-mid">
                  FR-E6: System tracks status only
                </div>
                <div className="flex gap-3">
                  {NEXT_LABEL[current.status as ExpenseStatus] ? (
                    <>
                      <Button variant="ghost" onClick={() => setSelectedId(null)}>Cancel</Button>
                      <Button 
                        variant={current.status === 'approved' ? 'primary' : 'secondary'}
                        onClick={handleAction} 
                        disabled={verifyMut.isPending}
                        className={current.status === 'approved' ? 'shadow-glow-teal font-mono tracking-wide' : 'font-mono tracking-wide'}
                      >
                        {verifyMut.isPending ? 'Processing...' : NEXT_LABEL[current.status as ExpenseStatus]}
                      </Button>
                    </>
                  ) : (
                    <Button variant="ghost" onClick={() => setSelectedId(null)}>Close</Button>
                  )}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      <p className="mt-6 flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-graytext-mid text-center justify-center">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        Ekatva OS records and reports reimbursement status only &mdash; it never moves real money.
      </p>
    </div>
  )
}
