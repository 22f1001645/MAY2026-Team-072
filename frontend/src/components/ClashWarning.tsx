import { useClashes } from '../lib/queries'
import { formatDate, formatTime, scaleLabel } from '../lib/format'

/* ---------------------------------------------------------------------------
 * "There is already something on that weekend."
 *
 * Two meetups in one city on one Saturday split a turnout neither can afford to
 * halve, and until now nothing in Ekatva OS noticed — an organiser proposed
 * against an empty mental calendar and an admin approved against the same.
 *
 * Deliberately a warning and never a block. A clash is sometimes the plan: a
 * techno track and a sports track can share a Saturday on purpose, and a fest
 * weekend is *made* of overlapping things. The judgement stays with the
 * organiser and the admin; this only makes sure neither of them makes it
 * unknowingly.
 * ------------------------------------------------------------------------- */

export default function ClashWarning({
  city,
  startsAt,
  /** The activity being edited, so it never clashes with itself. */
  excludeId,
  className,
}: {
  city?: string
  startsAt?: string
  excludeId?: string
  className?: string
}) {
  const { data: clashes = [], isLoading } = useClashes(city, startsAt, excludeId)

  // Silence is the correct output for "no clash" — an all-clear banner on every
  // proposal would train organisers to scroll past this whole region.
  if (isLoading || clashes.length === 0) return null

  return (
    <div
      className={`rounded-xl border border-gold/30 bg-gold/[0.06] p-4 ${className ?? ''}`}
      role="status"
    >
      <div className="flex items-start gap-3">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-[2px] shrink-0 text-gold"
          aria-hidden="true"
        >
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>

        <div className="min-w-0">
          <div className="text-[14px] font-semibold text-gold">
            {clashes.length === 1
              ? `${city} already has an event around this date`
              : `${city} already has ${clashes.length} events around this date`}
          </div>
          <p className="mt-0.5 text-[13px] text-graytext-light">
            Same city, within a day and a half. Worth a look before you commit — you may be
            splitting the same crowd.
          </p>

          <ul className="mt-3 space-y-2">
            {clashes.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[13px]"
              >
                <div className="font-semibold text-offwhite">{c.title}</div>
                <div className="mt-0.5 text-graytext-mid">
                  {c.starts_at ? `${formatDate(c.starts_at)} · ${formatTime(c.starts_at)}` : 'Date to be confirmed'}
                  {c.scale ? ` · ${scaleLabel[c.scale] ?? c.scale}` : ''}
                  {c.organiser ? ` · by ${c.organiser}` : ''}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
