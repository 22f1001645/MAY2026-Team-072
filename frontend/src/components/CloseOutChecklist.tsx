import { Link } from 'react-router-dom'
import { useExpensesFor, useEventReport, useRoster } from '../lib/queries'
import { Card } from './ui'
import { cx } from '../lib/format'

/* ---------------------------------------------------------------------------
 * What is left to do now that the event is over.
 *
 * The day after a meetup is where this system quietly stalls. The organiser has
 * gone home, nothing chases them, and the four remaining jobs — finalise who
 * actually came, collect feedback, file the bills, write the report — are spread
 * across four pages that each have to be remembered independently. Money owed to
 * a student sits unclaimed because nobody was told they still owed a receipt.
 *
 * So this is deliberately a *derived* checklist, not a stored one. Every step
 * reads the same records the rest of the app writes, which means it can never
 * drift out of sync with reality and there is no new state to migrate: file an
 * expense anywhere and the step ticks itself.
 * ------------------------------------------------------------------------- */

type Step = {
  key: string
  label: string
  done: boolean
  detail: string
  to: string
  cta: string
}

export default function CloseOutChecklist({
  eventId,
  eventTitle,
  className,
}: {
  eventId: string
  eventTitle?: string
  className?: string
}) {
  const { data: roster = [] } = useRoster(eventId)
  const { data: expenses = [] } = useExpensesFor(eventId)
  // A missing report is the normal starting state, not an error — the query
  // 404s until someone writes one, which is exactly the "not done" signal.
  const { data: report } = useEventReport(eventId)

  const attended = roster.filter((r: any) => r.attended).length
  const reportStatus = (report as any)?.status ?? null

  const steps: Step[] = [
    {
      key: 'attendance',
      label: 'Finalise attendance',
      done: attended > 0,
      detail:
        attended > 0
          ? `${attended} of ${roster.length} registered checked in`
          : 'Nobody is marked as attended yet',
      to: '/checkin',
      cta: 'Open check-in',
    },
    {
      key: 'expenses',
      label: 'File expenses',
      done: expenses.length > 0,
      detail:
        expenses.length > 0
          ? `${expenses.length} ${expenses.length === 1 ? 'bill' : 'bills'} submitted`
          : 'No bills submitted — reimbursement cannot start',
      to: `/events/${eventId}/expenses`,
      cta: 'Add bills',
    },
    {
      key: 'report',
      label: 'Write the close-out report',
      done: !!reportStatus && reportStatus !== 'draft',
      detail: !reportStatus
        ? 'Not started'
        : reportStatus === 'draft'
          ? 'Saved as a draft — not submitted yet'
          : 'Submitted',
      to: `/events/${eventId}/manage`,
      cta: 'Write report',
    },
  ]

  const doneCount = steps.filter((s) => s.done).length
  const allDone = doneCount === steps.length

  return (
    <Card className={cx('p-6', className)}>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-h3 font-semibold text-offwhite">
            {allDone ? 'Close-out complete' : 'Finish closing this event'}
          </h3>
          <p className="mt-1 text-[13px] text-graytext-mid">
            {allDone
              ? `Everything for ${eventTitle ?? 'this event'} is filed.`
              : 'Reimbursement only moves once these are done.'}
          </p>
        </div>
        <div
          className={cx(
            'shrink-0 rounded-full px-3 py-1 text-[12px] font-bold',
            allDone ? 'bg-teal/15 text-teal' : 'bg-gold/15 text-gold',
          )}
        >
          {doneCount}/{steps.length}
        </div>
      </div>

      <ol className="space-y-2">
        {steps.map((step) => (
          <li
            key={step.key}
            className={cx(
              'flex items-center gap-3 rounded-xl border px-4 py-3',
              step.done ? 'border-teal/20 bg-teal/[0.04]' : 'border-white/10 bg-white/[0.02]',
            )}
          >
            <span
              className={cx(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-bold',
                step.done ? 'border-teal/40 bg-teal/20 text-teal' : 'border-white/15 text-graytext-mid',
              )}
              aria-hidden="true"
            >
              {step.done ? '✓' : ''}
            </span>

            <div className="min-w-0 flex-1">
              <div className={cx('text-[14px] font-semibold', step.done ? 'text-offwhite' : 'text-offwhite')}>
                {step.label}
              </div>
              <div className="text-[12px] text-graytext-mid">{step.detail}</div>
            </div>

            {/* A done step keeps its link: "finalise attendance" is reversible
                work, and hiding the way back would strand anyone correcting it. */}
            <Link
              to={step.to}
              className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-[12px] font-semibold text-teal transition-colors hover:border-teal/40 hover:bg-teal/10"
            >
              {step.done ? 'Review' : step.cta}
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  )
}
