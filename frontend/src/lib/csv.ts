import Papa from 'papaparse'

/* ---------------------------------------------------------------------------
 * CSV export.
 *
 * Every number Ekatva OS shows an admin or an organiser eventually has to leave
 * the app: attendance sheets get filed, expense lines get reconciled against
 * receipts, city numbers get pasted into the term report. Until now the only
 * way out was retyping what was on screen, which is how transcription errors get
 * into reimbursement paperwork.
 *
 * papaparse was already a dependency (BulkAssignModal parses POR uploads with
 * it); this is the same library pointed the other way.
 * ------------------------------------------------------------------------- */

/** One exportable row. Values are flattened to text by `Papa.unparse`. */
export type CsvRow = Record<string, string | number | boolean | null | undefined>

/**
 * Turn rows into a CSV file and hand it to the browser.
 *
 * `columns` fixes the header order and lets a caller export a stable subset of
 * each row — without it, papaparse infers headers from the first row, so a
 * record with a missing optional field would silently shift every later column.
 */
export function downloadCsv(filename: string, rows: CsvRow[], columns?: string[]): void {
  const csv = Papa.unparse(rows, {
    columns: columns ?? (rows.length ? Object.keys(rows[0]) : undefined),
  })

  // The BOM is what makes Excel read the file as UTF-8. Without it, an organiser
  // named "Priyā" or a venue with a rupee sign opens as mojibake on Windows,
  // which is the machine most of this paperwork gets done on.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = url
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)

  // Revoking synchronously can cancel the download in Safari, so let the click
  // settle first.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * A filename that sorts chronologically and says what it holds.
 *
 * Exports pile up in a Downloads folder; `ekatva-attendance-hyderabad-regional-
 * fest-2026-08-31.csv` is findable three weeks later, `export (3).csv` is not.
 */
export function csvFilename(kind: string, subject?: string): string {
  const slug = (subject ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  const date = new Date().toISOString().slice(0, 10)
  return ['ekatva', kind, slug, date].filter(Boolean).join('-')
}
