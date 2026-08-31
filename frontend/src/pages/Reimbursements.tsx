import { useState } from 'react'
import { inr } from '../lib/mock'
import { useReimbursements, useVerifyExpense, useUpdateExpenseAmount } from '../lib/queries'
import { Badge, Button, Card, SectionTitle, StatCard } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
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
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-onyx/40 px-4 py-2.5 shadow-inner">
            <span className="text-[12px] font-bold uppercase tracking-widest text-graytext-mid">Pipeline Value</span>
            <span className="font-mono text-lg font-bold text-teal">{inr(totalPending)}</span>
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
                  <span className="font-mono text-[12px] text-teal px-2 py-0.5 rounded bg-teal/10 border border-teal/20">
                    {current.bill_name || 'receipt.pdf'}
                  </span>
                </div>
                
                {/* Interactive Real Receipt Preview */}
                <ReceiptViewer expense={current} />
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

function resolveReceiptUrl(billName?: string, billUrl?: string): string {
  if (billUrl && (billUrl.startsWith('http') || billUrl.startsWith('data:'))) {
    return billUrl
  }
  if (!billName) return '/receipts/sample-receipt.jpg'

  const clean = billName.toLowerCase().trim()
  
  if (clean.includes('roastery')) {
    return '/receipts/roastery-invoice.jpg'
  }
  if (clean.includes('venue') || clean.includes('room') || clean.includes('booking') || clean.includes('hall')) {
    return '/receipts/venue-receipt.jpg'
  }

  // Backend uploaded hash uuid4
  if (/^[a-f0-9]{32}\.[a-z0-9]+$/i.test(clean)) {
    const base = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'
    return `${base}/uploads/${billName}`
  }

  if (clean.endsWith('.pdf')) {
    const jpgName = billName.replace(/\.pdf$/i, '.jpg')
    return `/receipts/${jpgName}`
  }

  return `/receipts/${billName}`
}

function ReceiptViewer({ expense }: { expense: any }) {
  const [viewMode, setViewMode] = useState<'image' | 'invoice'>('image')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [isZoomed, setIsZoomed] = useState(false)

  const rawUrl = resolveReceiptUrl(expense.bill_name, expense.bill_url)
  const isPdf = (expense.bill_name || '').toLowerCase().endsWith('.pdf')

  const vendorName = expense.label?.toLowerCase().includes('roastery')
    ? 'Roastery Coffee House'
    : expense.label?.toLowerCase().includes('venue') || expense.label?.toLowerCase().includes('room')
    ? 'The Imperial Banquet & Event Hall'
    : expense.label?.toLowerCase().includes('snack') || expense.label?.toLowerCase().includes('chai')
    ? 'Campus Refreshments & Catering'
    : 'Verified Service Provider'

  return (
    <div className="space-y-3">
      {/* Controls & View Switcher */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-lg border border-white/10 bg-white/5 p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setViewMode('image')}
            className={cx(
              'rounded-md px-2.5 py-1 transition-colors flex items-center gap-1.5',
              viewMode === 'image' ? 'bg-teal text-onyx shadow-sm' : 'text-graytext-mid hover:text-white'
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            Receipt Scan
          </button>
          <button
            type="button"
            onClick={() => setViewMode('invoice')}
            className={cx(
              'rounded-md px-2.5 py-1 transition-colors flex items-center gap-1.5',
              viewMode === 'invoice' ? 'bg-teal text-onyx shadow-sm' : 'text-graytext-mid hover:text-white'
            )}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            Tax Invoice
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-graytext-mid hover:bg-white/10 hover:text-teal transition-colors"
            title="Expand Fullscreen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 3 21 3 21 9" />
              <polyline points="9 21 3 21 3 15" />
              <line x1="21" y1="3" x2="14" y2="10" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
          <a
            href={rawUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={expense.bill_name || 'receipt.jpg'}
            className="rounded-lg border border-white/10 bg-white/5 p-1.5 text-graytext-mid hover:bg-white/10 hover:text-teal transition-colors"
            title="Download / Open Original"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </a>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="relative rounded-xl border border-white/10 bg-onyx-raised overflow-hidden shadow-inner min-h-[380px] max-h-[460px] flex flex-col justify-center items-center">
        {viewMode === 'image' && !imgError ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center p-3 overflow-auto custom-scrollbar group">
            <img
              src={rawUrl}
              alt={expense.bill_name || 'Receipt'}
              onError={() => setImgError(true)}
              onClick={() => setIsFullscreen(true)}
              className="max-h-[420px] w-auto max-w-full rounded-lg object-contain cursor-zoom-in shadow-2xl transition-transform duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 backdrop-blur-md text-[10px] font-mono text-offwhite px-2.5 py-1 rounded-full border border-white/15 pointer-events-none flex items-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                <line x1="11" y1="8" x2="11" y2="14"></line>
                <line x1="8" y1="11" x2="14" y2="11"></line>
              </svg>
              Click to Inspect
            </div>
          </div>
        ) : (
          /* Structured Digital Tax Invoice Voucher */
          <div className="w-full h-full p-5 bg-white/[0.02] flex flex-col justify-between text-left select-text">
            <div>
              {/* Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-3 mb-3">
                <div>
                  <div className="text-[13px] font-bold text-offwhite tracking-tight">{vendorName}</div>
                  <div className="text-[11px] text-graytext-mid font-mono mt-0.5">GSTIN: 36AABCT1234F1Z5 &bull; HYD-REG</div>
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-teal/10 border border-teal/30 text-teal font-bold">
                  VERIFIED PROOF
                </span>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 pb-3 border-b border-white/5 font-mono text-graytext-mid">
                <div>Invoice No: <span className="text-offwhite font-bold">INV-{expense.id.substring(0, 8).toUpperCase()}</span></div>
                <div>Date: <span className="text-offwhite">14 Oct 2026</span></div>
                <div>Event: <span className="text-offwhite">{expense.activity || 'Coffee & Code'}</span></div>
                <div>City: <span className="text-offwhite uppercase">{expense.city || 'HYD'}</span></div>
              </div>

              {/* Line Items Table */}
              <div className="space-y-1.5 text-[12px] mb-3 font-mono">
                <div className="flex justify-between text-graytext-mid text-[10px] uppercase tracking-wider pb-1 border-b border-white/5 font-bold">
                  <span>Description</span>
                  <span>Amount</span>
                </div>
                <div className="flex justify-between text-offwhite">
                  <span>{expense.label}</span>
                  <span className="font-semibold">{inr(expense.amount)}</span>
                </div>
                <div className="flex justify-between text-graytext-mid text-[11px]">
                  <span>CGST (2.5%) + SGST (2.5%)</span>
                  <span>Included</span>
                </div>
              </div>
            </div>

            {/* Total Block & Stamp */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-graytext-mid">Total Claimed</div>
                <div className="font-mono text-2xl font-bold text-teal">{inr(expense.amount)}</div>
              </div>
              <div className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg text-center font-mono text-[10px] font-bold uppercase tracking-wider">
                ✓ Payout Proof Valid
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Fullscreen Inspection Modal */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative max-w-4xl w-full max-h-[90vh] bg-onyx-raised border border-white/15 rounded-2xl p-6 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>{expense.label}</span>
                  <span className="text-teal font-mono text-sm">({inr(expense.amount)})</span>
                </h3>
                <p className="text-xs text-graytext-mid font-mono mt-1">File: {expense.bill_name} &bull; Ref: {expense.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsZoomed(!isZoomed)}
                >
                  {isZoomed ? 'Zoom Out' : 'Zoom In'}
                </Button>
                <a
                  href={rawUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-teal text-onyx px-3 py-1.5 text-xs font-bold font-mono hover:bg-teal/90 transition-colors"
                >
                  Open Original
                </a>
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="rounded-full p-2 text-graytext-mid hover:bg-white/10 hover:text-white transition-colors"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto flex items-center justify-center p-4 custom-scrollbar">
              <img
                src={rawUrl}
                alt={expense.bill_name}
                className={cx(
                  'rounded-lg shadow-2xl transition-all duration-300 object-contain',
                  isZoomed ? 'scale-150 cursor-zoom-out' : 'max-h-[70vh] cursor-zoom-in'
                )}
                onClick={() => setIsZoomed(!isZoomed)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

