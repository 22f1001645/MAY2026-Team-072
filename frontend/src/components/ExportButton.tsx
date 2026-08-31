import { Button } from './ui'
import { downloadCsv, csvFilename, type CsvRow } from '../lib/csv'

/* ---------------------------------------------------------------------------
 * A single, consistent way to get a table out of Ekatva OS as a CSV.
 *
 * `rows` is built lazily so a page never pays to shape an export the user has
 * not asked for, and so the download always reflects the filters applied at the
 * moment of the click rather than a snapshot from render time.
 * ------------------------------------------------------------------------- */

export default function ExportButton({
  /** What is being exported, e.g. "attendance" — becomes part of the filename. */
  kind,
  /** The specific thing, e.g. an event title — also part of the filename. */
  subject,
  /** Built on click. Return an empty array to mean "nothing to export". */
  rows,
  /** Fixes column order; without it papaparse infers headers from the first row. */
  columns,
  label = 'Export CSV',
  disabled,
  className,
}: {
  kind: string
  subject?: string
  rows: () => CsvRow[]
  columns?: string[]
  label?: string
  disabled?: boolean
  className?: string
}) {
  const handleClick = () => {
    const data = rows()
    if (data.length === 0) return
    downloadCsv(csvFilename(kind, subject), data, columns)
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleClick}
      disabled={disabled}
      className={className}
      title={disabled ? 'Nothing to export yet' : `Download ${kind} as a CSV`}
    >
      <span className="inline-flex items-center gap-1.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {label}
      </span>
    </Button>
  )
}
