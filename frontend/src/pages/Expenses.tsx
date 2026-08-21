import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { inr } from '../lib/mock'
import { useEvent, useExpensesFor, useSubmitExpense } from '../lib/queries'
import { Badge, Button, Card, Progress, SectionTitle, Select } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import type { ExpenseStatus } from '../lib/types'

const STAGES: ExpenseStatus[] = ['submitted', 'verified', 'approved', 'paid']
const STAGE_LABEL: Record<ExpenseStatus, string> = {
  submitted: 'Submitted',
  verified: 'Verified',
  approved: 'Approved',
  paid: 'Marked paid',
}

export default function Expenses() {
  const { id } = useParams()
  const { data: e, isLoading, isError, error } = useEvent(id)
  const { data: expenses = [] } = useExpensesFor(id)
  const submitMut = useSubmitExpense()

  const [adding, setAdding] = useState(false)
  const [amt, setAmt] = useState('')
  const [desc, setDesc] = useState('')
  const [lineId, setLineId] = useState('')

  if (isLoading) return <Loading label="Loading reimbursement…" />
  if (isError) return <ErrorState error={error} />
  if (!e) return <div>Event not found</div>

  const planned = e.budget.reduce((s, b) => s + b.planned, 0)
  const spent = expenses.reduce((s: number, x: any) => s + x.amount, 0)

  const submit = () => {
    submitMut.mutate(
      {
        activity_id: e.id,
        budget_line_id: lineId || e.budget[0]?.id,
        label: desc || 'Expense',
        amount: parseInt(amt) || 0,
        bill_name: 'bill.pdf',
      },
      {
        onSuccess: () => {
          setAdding(false)
          setAmt('')
          setDesc('')
        },
      },
    )
  }

  return (
    <div>
      <Link to="/organiser" className="mb-4 inline-block text-[13px] text-graytext-light hover:text-teal">
        ← Dashboard
      </Link>
      <SectionTitle
        eyebrow={e.city + ' · Reimbursement'}
        title={e.title}
        sub="No more funding events out of pocket and waiting 15–30 days. Submit bills; watch each one move to paid."
        right={<Button onClick={() => setAdding(true)}>+ Submit expense</Button>}
      />

      {/* Budget vs actual (FR-E5) */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-mid">Budget</div>
          <div className="mt-1 text-[28px] font-bold text-offwhite">{inr(planned)}</div>
        </Card>
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-mid">Claimed</div>
          <div className="mt-1 text-[28px] font-bold text-teal">{inr(spent)}</div>
          <div className="mt-2">
            <Progress value={spent} max={planned || 1} tone="teal" />
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-caption uppercase tracking-wider text-graytext-mid">Remaining</div>
          <div className="mt-1 text-[28px] font-bold text-gold">{inr(planned - spent)}</div>
        </Card>
      </div>

      {/* Add form */}
      {adding && (
        <Card className="mb-6 space-y-4 border-teal/25 p-6">
          <h3 className="text-h3 font-semibold text-gold">Submit an expense</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FieldLabel>Against budget line</FieldLabel>
              <Select
                value={lineId}
                onChange={(ev) => setLineId(ev.target.value)}
                options={e.budget.map((b) => ({ label: `${b.label} ₹ ${inr(b.planned)}`, value: b.id }))}
              />
            </div>
            <div>
              <FieldLabel>Amount (₹)</FieldLabel>
              <input value={amt} onChange={(ev) => setAmt(ev.target.value.replace(/\D/g, ''))}
                     placeholder="8600"
                     className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite focus:border-teal/50 focus:outline-none" />
            </div>
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <input value={desc} onChange={(ev) => setDesc(ev.target.value)}
                   placeholder="Roastery bill — 38 covers"
                   className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite focus:border-teal/50 focus:outline-none" />
          </div>
          <div>
            <FieldLabel>Attach bill</FieldLabel>
            <div className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-5 text-graytext-mid">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 16V4M6 10l6-6 6 6M4 20h16" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[13px]">Drop a photo or PDF (≤10 MB)</span>
            </div>
          </div>
          {submitMut.isError && (
            <p className="text-caption text-red-300">{(submitMut.error as Error).message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitMut.isPending || !amt}>
              {submitMut.isPending ? 'Submitting…' : 'Submit for verification'}
            </Button>
          </div>
        </Card>
      )}

      {/* Expense list with status pipeline */}
      <div className="space-y-4">
        {expenses.length === 0 && (
          <Card className="p-10 text-center text-graytext-light">
            No expenses yet. Submit your first bill above.
          </Card>
        )}
        {expenses.map((x: any) => {
          const stageIdx = STAGES.indexOf(x.status)
          return (
            <Card key={x.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-h3 font-semibold text-offwhite">{x.label}</div>
                  <div className="mt-1 flex items-center gap-2 text-caption text-graytext-light">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M14 3v4h4M6 3h9l5 5v13H6z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {x.bill_name}
                  </div>
                </div>
                <div className="text-h3 font-bold text-teal">{inr(x.amount)}</div>
              </div>

              {/* Status pipeline */}
              <div className="mt-5 flex items-center">
                {STAGES.map((s, i) => (
                  <div key={s} className="flex flex-1 items-center last:flex-none">
                    <div className="flex flex-col items-center">
                      <div
                        className={
                          'grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ' +
                          (i <= stageIdx ? 'bg-teal text-onyx' : 'border border-white/15 text-graytext-mid')
                        }
                      >
                        {i <= stageIdx ? '✓' : i + 1}
                      </div>
                      <span
                        className={
                          'mt-1.5 whitespace-nowrap text-[10px] uppercase tracking-wider ' +
                          (i <= stageIdx ? 'text-teal' : 'text-graytext-mid')
                        }
                      >
                        {STAGE_LABEL[s]}
                      </span>
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className={'mx-1 h-0.5 flex-1 ' + (i < stageIdx ? 'bg-teal' : 'bg-white/10')} />
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right">
                <Badge tone="neutral">Ekatva OS tracks status only — no money moves here</Badge>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-caption font-semibold uppercase tracking-wider text-graytext-light">
      {children}
    </label>
  )
}
