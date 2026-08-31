import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { useEvent, useRoster, useScanQr, useScheduleItems, useBroadcast } from '../lib/queries'
import { Button, Card } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx } from '../lib/format'

/* ---------------------------------------------------------------------------
 * Event Day Mode — one screen for the two hours that actually matter.
 *
 * On the day, an organiser is standing at a door with a phone in one hand. The
 * things they need are currently four separate pages: the scanner on /checkin,
 * the headcount inside it, the running order on the manage page, and the
 * broadcast composer behind a query param. Switching between them while a queue
 * builds is how people end up waving students through uncounted.
 *
 * This composes those four into a single view, scoped to one event and built for
 * a phone held at arm's length: big numbers, few controls, nothing that needs a
 * second hand.
 * ------------------------------------------------------------------------- */

export default function EventDayMode() {
  const { id } = useParams<{ id: string }>()
  const { data: e, isLoading, isError, error } = useEvent(id)
  const { data: roster = [] } = useRoster(id)
  const { data: schedule = [] } = useScheduleItems(id)
  const scanQrMut = useScanQr()
  const broadcastMut = useBroadcast()

  const [scanResult, setScanResult] = useState<{ status: string; message: string } | null>(null)
  const [currentItemId, setCurrentItemId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)
  const lastScanned = useRef<string | null>(null)

  // Every hook above runs before any early return below. CheckIn once shipped a
  // useMemo underneath its loading guard, which meant the first render ran one
  // fewer hook than the second and React tore the page down; keeping the guards
  // strictly last is what stops that recurring here.
  useEffect(() => {
    if (!id || !e) return

    const scanner = new Html5QrcodeScanner(
      'day-qr-reader',
      { fps: 10, qrbox: 250, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
      false,
    )

    scanner.render(
      (decoded) => {
        // A QR code sitting in front of the lens fires continuously; without
        // this guard one student becomes twenty requests.
        if (decoded === lastScanned.current || scanQrMut.isPending) return
        lastScanned.current = decoded

        scanQrMut.mutate(
          { id, registration_id: decoded },
          {
            onSuccess: (res: any) =>
              setScanResult({
                status: res.status,
                message:
                  res.status === 'success'
                    ? `${res.student_name} is in`
                    : res.message || `${res.student_name} already checked in`,
              }),
            onError: (err: any) =>
              setScanResult({ status: 'error', message: err.message || 'Unrecognised code' }),
            onSettled: () => {
              setTimeout(() => setScanResult(null), 2500)
              setTimeout(() => { lastScanned.current = null }, 2500)
            },
          },
        )
      },
      () => {}, // per-frame decode misses are noise, not errors
    )

    return () => { scanner.clear().catch(() => {}) }
  }, [id, e])

  if (isLoading) return <Loading label="Opening event day mode…" />
  if (isError) return <ErrorState error={error} />
  if (!e) return <ErrorState error={new Error('Event not found')} />

  const checkedIn = roster.filter((r: any) => r.attended).length
  const pct = roster.length ? Math.round((checkedIn / roster.length) * 100) : 0

  const sendNote = () => {
    if (!note.trim() || !id) return
    broadcastMut.mutate(
      { id, title: `Update — ${e.title}`, body: note.trim() },
      {
        onSuccess: () => {
          setNote('')
          setSent(true)
          setTimeout(() => setSent(false), 2500)
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-caption uppercase tracking-widest text-teal">
            <span className="h-2 w-2 animate-pulse rounded-full bg-teal" />
            Event day
          </div>
          <h1 className="mt-1 text-[28px] font-bold leading-tight text-white">{e.title}</h1>
          <p className="text-[13px] text-graytext-mid">{e.venue}</p>
        </div>
        <Link to={`/events/${id}/manage`}>
          <Button variant="secondary" size="sm">Full event page</Button>
        </Link>
      </div>

      {/* The scan verdict is the one thing read at arm's length, so it sits above
          everything and is sized to be legible without looking closely. */}
      {scanResult && (
        <div
          role="status"
          aria-live="polite"
          className={cx(
            'animate-spring-up rounded-2xl border p-6 text-center text-[22px] font-bold',
            scanResult.status === 'success'
              ? 'border-teal/30 bg-teal/10 text-teal'
              : scanResult.status === 'duplicate'
                ? 'border-gold/30 bg-gold/10 text-gold'
                : 'border-red-500/30 bg-red-500/10 text-red-400',
          )}
        >
          {scanResult.message}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
        <div className="space-y-6">
          <Card className="overflow-hidden border-white/5 bg-black/40 p-1">
            <div id="day-qr-reader" className="overflow-hidden rounded-xl bg-black" />
            <style>{`
              #day-qr-reader { border: none !important; }
              #day-qr-reader__scan_region { background: #000; min-height: 300px; }
              #day-qr-reader__dashboard_section_csr span { color: #aaa !important; }
              #day-qr-reader__dashboard_section_swaplink { color: #5CE6C9 !important; text-decoration: none; }
              #day-qr-reader button {
                background: #1F4F59; color: #fff; border: 1px solid rgba(92,230,201,0.2);
                padding: 8px 16px; border-radius: 8px; font-weight: 500; cursor: pointer;
              }
            `}</style>
          </Card>

          {/* Broadcast, kept to one field. Anything longer than a sentence is not
              something anyone writes while a queue is forming. */}
          <Card className="p-5">
            <label htmlFor="day-note" className="text-caption uppercase tracking-wider text-graytext-mid">
              Tell everyone
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="day-note"
                value={note}
                onChange={(ev) => setNote(ev.target.value)}
                onKeyDown={(ev) => { if (ev.key === 'Enter') sendNote() }}
                placeholder="Doors moved to Gate 3"
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-[14px] text-offwhite outline-none transition-colors focus:border-teal"
              />
              <Button onClick={sendNote} disabled={!note.trim() || broadcastMut.isPending}>
                {broadcastMut.isPending ? 'Sending…' : 'Send'}
              </Button>
            </div>
            {sent && <p className="mt-2 text-[13px] text-teal">Sent to everyone registered.</p>}
          </Card>
        </div>

        <div className="space-y-6">
          <div className="rounded-[24px] border border-white/10 bg-gradient-to-b from-teal/10 to-transparent p-6 text-center">
            <div className="text-caption uppercase tracking-widest text-teal">In the room</div>
            <div className="mt-2 text-[64px] font-bold leading-none text-offwhite drop-shadow-[0_0_15px_rgba(92,230,201,0.3)]">
              {checkedIn}
            </div>
            <div className="mt-1 text-[15px] font-medium text-graytext-mid">
              of {roster.length} registered · {pct}%
            </div>
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-black/50">
              <div className="h-full bg-teal transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <Card className="p-5">
            <h2 className="mb-1 text-[15px] font-semibold text-offwhite">Running order</h2>
            {/* The stored time block is free text ("after lunch"), so nothing here
                pretends to compute what is on now. The organiser taps it — they
                are the only reliable clock in the room. */}
            <p className="mb-3 text-[12px] text-graytext-mid">Tap what is happening now.</p>

            {schedule.length === 0 ? (
              <p className="text-[13px] text-graytext-mid">
                No running order yet.{' '}
                <Link to={`/events/${id}/manage`} className="text-teal hover:underline">Add one</Link>.
              </p>
            ) : (
              <ol className="space-y-1.5">
                {schedule.map((item: any) => {
                  const isNow = currentItemId === item.id
                  return (
                    <li key={item.id}>
                      <button
                        onClick={() => setCurrentItemId(isNow ? null : item.id)}
                        aria-pressed={isNow}
                        className={cx(
                          'w-full rounded-xl border px-3 py-2.5 text-left transition-colors',
                          isNow
                            ? 'border-teal/40 bg-teal/10'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20',
                        )}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className={cx('text-[14px] font-semibold', isNow ? 'text-teal' : 'text-offwhite')}>
                            {item.title}
                          </span>
                          {isNow && <span className="shrink-0 text-[11px] font-bold uppercase tracking-wider text-teal">Now</span>}
                        </div>
                        {item.timeBlock && <div className="text-[12px] text-graytext-mid">{item.timeBlock}</div>}
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
