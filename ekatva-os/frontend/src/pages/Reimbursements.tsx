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

  if (isLoading) return <Loading label="Loading reimbursements…" />
  if (isError) return <ErrorState error={error} />

  const totalPending = rows
    .filter((r: any) => r.status !== 'paid')
    .reduce((s: number, r: any) => s + r.amount, 0)

  const counts = (s: string) => rows.filter((r: any) => r.status === s).length

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

      {rows.length === 0 ? (
        <Card className="p-12 text-center text-graytext-light">
          No expenses submitted yet.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-white/5 text-caption uppercase tracking-wider text-graytext-mid">
                <th className="px-5 py-3 text-left">Expense</th>
                <th className="px-5 py-3 text-left">Event</th>
                <th className="px-5 py-3 text-left">Bill</th>
                <th className="px-5 py-3 text-right">Amount</th>
                <th className="px-5 py-3 text-center">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any) => (
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
                        onClick={() => verifyMut.mutate(r.id)}
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
        </Card>
      )}

      <p className="mt-4 flex items-center gap-2 text-caption text-graytext-mid">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        Ekatva OS records and reports reimbursement status only — it never moves real money (FR-E6).
      </p>
    </div>
  )
}
