import { useState } from 'react'
import { inr } from '../lib/mock'
import { useReimbursements, useVerifyExpense } from '../lib/queries'
import { Badge, Button, Card, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import type { ExpenseStatus } from '../lib/types'

// FR-E3/E4: admin verifies each expense and advances the reimbursement status
const NEXT_LABEL: Record<ExpenseStatus, string | null> = {
  submitted: 'Verify',
  verified: 'Approve',
  approved: 'Mark paid',
  paid: null,
}
const STATUS_TONE: Record<string, any> = {
  submitted: 'warn',
  verified: 'teal',
  approved: 'gold',
  paid: 'success',
}

export default function Reimbursements() {
  const { data: rows = [], isLoading, isError, error } = useReimbursements()
  const verifyMut = useVerifyExpense()

  // Filter state
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [cityFilter, setCityFilter] = useState<string>('all')

  // Confirm modal state
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const confirmRow = rows.find((r: any) => r.id === confirmId)

  if (isLoading) return <Loading label="Loading reimbursements…" />
  if (isError) return <ErrorState error={error} />

  const totalPending = rows
    .filter((r: any) => r.status !== 'paid')
    .reduce((s: number, r: any) => s + r.amount, 0)

  const counts = (s: string) => rows.filter((r: any) => r.status === s).length

  // Unique cities for filter dropdown
  const cities = Array.from(new Set(rows.map((r: any) => r.city).filter(Boolean))) as string[]

  // Apply filters
  const filtered = rows.filter((r: any) => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter
    const matchCity = cityFilter === 'all' || r.city === cityFilter
    return matchStatus && matchCity
  })

  const handleAdvance = (id: string) => {
    setConfirmId(id)
  }

  const handleConfirm = () => {
    if (confirmId) {
      verifyMut.mutate(confirmId)
      setConfirmId(null)
    }
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Admin"
        title="Reimbursement Verification"
        sub="Verify bills and move each claim toward paid — a clear trail, no email bottleneck."
        right={<Badge tone="gold">{inr(totalPending)} in the pipeline</Badge>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-4">
        {(['submitted', 'verified', 'approved', 'paid'] as ExpenseStatus[]).map((s) => (
          <Card key={s} className="p-4">
            <div className="text-caption uppercase tracking-wider text-graytext-mid capitalize">
              {s === 'paid' ? 'Marked paid' : s}
            </div>
            <div className="mt-1 text-[26px] font-bold text-offwhite">{counts(s)}</div>
          </Card>
        ))}
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-surface px-3 py-1.5 text-sm text-offwhite focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="verified">Verified</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
        <select
          value={cityFilter}
          onChange={e => setCityFilter(e.target.value)}
          className="rounded-lg border border-white/10 bg-surface px-3 py-1.5 text-sm text-offwhite focus:outline-none"
        >
          <option value="all">All Cities</option>
          {cities.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(statusFilter !== 'all' || cityFilter !== 'all') && (
          <button
            onClick={() => { setStatusFilter('all'); setCityFilter('all') }}
            className="text-sm text-teal underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-graytext-light">
          No expenses match the current filters.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="border-b border-white/5 text-caption uppercase tracking-wider text-graytext-mid">
                  <th className="px-5 py-3 text-left">Expense</th>
                  <th className="px-5 py-3 text-left">Event</th>
                  <th className="px-5 py-3 text-left">Bill</th>
                  <th className="px-5 py-3 text-left">Social Post</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r: any) => (
                  <tr key={r.id} className="border-b border-white/5 last:border-0">
                    <td className="px-5 py-4 text-offwhite">{r.label}</td>
                    <td className="px-5 py-4 text-graytext-light">
                      {r.activity}
                      <div className="text-caption text-graytext-mid">{r.city}</div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center gap-1.5 text-teal">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M14 3v4h4M6 3h9l5 5v13H6z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {r.bill_name}
                      </span>
                    </td>
                    {/* REIMB-02: Social post link as supplementary admin review evidence */}
                    <td className="px-5 py-4">
                      {r.social_post_link ? (
                        <a
                          href={r.social_post_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-teal underline-offset-2 hover:underline"
                          title="View social post"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" strokeLinecap="round" />
                            <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" strokeLinecap="round" />
                          </svg>
                          View
                        </a>
                      ) : (
                        <span className="text-graytext-mid">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-offwhite">{inr(r.amount)}</td>
                    <td className="px-5 py-4 text-center">
                      <Badge tone={STATUS_TONE[r.status]}>
                        {r.status === 'paid' ? 'Marked paid' : r.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {NEXT_LABEL[r.status as ExpenseStatus] ? (
                        <Button
                          size="sm"
                          variant={r.status === 'approved' ? 'primary' : 'secondary'}
                          disabled={verifyMut.isPending}
                          onClick={() => handleAdvance(r.id)}
                        >
                          {NEXT_LABEL[r.status as ExpenseStatus]}
                        </Button>
                      ) : (
                        <span className="text-caption text-graytext-mid">Complete</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="mt-4 flex items-center gap-2 text-caption text-graytext-mid">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        Ekatva OS records and reports reimbursement status only — it never moves real money (FR-E6).
      </p>

      {/* Confirm Modal */}
      {confirmId && confirmRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-surface p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-offwhite">Confirm Action</h3>
            <p className="mt-2 text-sm text-graytext-light">
              Move <strong className="text-offwhite">{confirmRow.label}</strong> from{' '}
              <Badge tone={STATUS_TONE[confirmRow.status]}>{confirmRow.status}</Badge>{' '}
              to <strong className="text-offwhite">{NEXT_LABEL[confirmRow.status as ExpenseStatus]}</strong>?
              This cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <Button size="sm" variant="secondary" onClick={() => setConfirmId(null)}>Cancel</Button>
              <Button
                size="sm"
                variant="primary"
                disabled={verifyMut.isPending}
                onClick={handleConfirm}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

