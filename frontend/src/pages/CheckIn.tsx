import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { useCheckIn, useScanQr, useEvent, useRoster } from '../lib/queries'
import { Badge, Button, Card, Progress, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx } from '../lib/format'

// FR-D6: organiser marks registered students as attended (check-in) →
// the attendance record that powers points & fee utilisation
export default function CheckIn() {
  const { id } = useParams()
  const { data: e, isLoading, isError, error } = useEvent(id)
  const { data: roster = [] } = useRoster(id)
  
  const checkInMut = useCheckIn()
  const scanQrMut = useScanQr()
  
  const [q, setQ] = useState('')
  const [scanResult, setScanResult] = useState<{ status: 'success' | 'duplicate' | 'error', message: string } | null>(null)
  
  // Keep track of the last scanned code to debounce duplicate scans quickly
  const lastScannedToken = useRef<string | null>(null)

  useEffect(() => {
    if (!id || !e) return

    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: 250,
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
      },
      false
    )
    
    scanner.render(
      (decodedText) => {
        // Prevent spamming the API with the same code in quick succession
        if (decodedText === lastScannedToken.current || scanQrMut.isPending) return
        lastScannedToken.current = decodedText
        
        scanQrMut.mutate({ id, qr_token: decodedText }, {
          onSuccess: (res: any) => {
            if (res.status === 'success') {
              setScanResult({ status: 'success', message: `Successfully checked in ${res.student_name}` })
            } else if (res.status === 'duplicate') {
              setScanResult({ status: 'duplicate', message: res.message || `${res.student_name} already checked in` })
            }
            setTimeout(() => setScanResult(null), 3000)
            setTimeout(() => { lastScannedToken.current = null }, 3000)
          },
          onError: (err: any) => {
            setScanResult({ status: 'error', message: err.message || 'Invalid QR code' })
            setTimeout(() => setScanResult(null), 3000)
            setTimeout(() => { lastScannedToken.current = null }, 3000)
          }
        })
      },
      (error) => {
        // Ignore continuous scanning errors
      }
    )
    
    return () => {
      scanner.clear().catch(console.error)
    }
  }, [id, e])

  if (isLoading) return <Loading label="Loading attendees…" />
  if (isError) return <ErrorState error={error} />
  if (!e) return <div>Event not found</div>

  const checkedIn = roster.filter((a: any) => a.attended).length
  const filtered = roster.filter((a: any) =>
    (a.student ?? '').toLowerCase().includes(q.toLowerCase()),
  )

  const toggle = (reg: any) => {
    if (reg.attended || checkInMut.isPending) return // check-in is one-way
    checkInMut.mutate({ id: e.id, ids: [reg.id] })
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to={`/events/${e.id}/manage`} className="mb-4 inline-block text-[13px] text-graytext-light hover:text-teal">
        ← Manage event
      </Link>
      <SectionTitle
        eyebrow={e.city + ' · Live check-in'}
        title="Attendance Scanner"
        sub="Scan QR passes as students arrive. A manual name-search fallback is provided below."
      />

      {/* Live counter */}
      <Card className="mb-6 p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-caption uppercase tracking-wider text-graytext-mid">Checked in</div>
            <div className="text-[44px] font-bold leading-none text-teal">
              {checkedIn}
              <span className="text-[20px] text-graytext-mid">/{roster.length}</span>
            </div>
          </div>
          <Badge tone="teal">
            {roster.length ? Math.round((checkedIn / roster.length) * 100) : 0}% arrived
          </Badge>
        </div>
        <div className="mt-4">
          <Progress value={checkedIn} max={roster.length || 1} />
        </div>
      </Card>

      {/* Scanner Section */}
      <Card className="mb-8 overflow-hidden relative border-teal/20">
        <div className="bg-onyx p-4 text-center border-b border-white/5">
          <h3 className="font-semibold text-offwhite flex items-center justify-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <path d="M7 7h.01M17 7h.01M7 17h.01M17 17h.01"/>
            </svg>
            Scan QR Pass
          </h3>
        </div>
        
        {/* html5-qrcode attaches here */}
        <div id="reader" className="w-full bg-black min-h-[300px]"></div>

        {/* Scan Result Overlay */}
        {scanResult && (
          <div className={cx(
            "absolute inset-x-0 bottom-0 p-4 text-center font-medium shadow-lg transition-transform animate-[fadeUp_0.2s_ease-out]",
            scanResult.status === 'success' ? 'bg-teal text-onyx' : 
            scanResult.status === 'duplicate' ? 'bg-gold text-onyx' : 
            'bg-red-500 text-white'
          )}>
            <div className="flex items-center justify-center gap-2">
              {scanResult.status === 'success' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m5 12 4 4L19 6" /></svg>
              )}
              {scanResult.status === 'duplicate' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              )}
              {scanResult.message}
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center gap-4 mb-4">
        <div className="h-px bg-white/10 flex-1"></div>
        <div className="text-caption uppercase tracking-wider text-graytext-mid font-medium">Manual Fallback</div>
        <div className="h-px bg-white/10 flex-1"></div>
      </div>

      <div className="relative mb-4">
        <input
          value={q}
          onChange={(ev) => setQ(ev.target.value)}
          placeholder="Search name if QR fails…"
          className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-11 pr-4 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/40 focus:outline-none"
        />
        <svg className="absolute left-4 top-3.5 text-graytext-mid" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3-3" strokeLinecap="round" />
        </svg>
      </div>

      {roster.length === 0 ? (
        <Card className="p-10 text-center text-graytext-light">No registrations to check in.</Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a: any) => (
            <button
              key={a.id}
              onClick={() => toggle(a)}
              disabled={a.attended}
              className={cx(
                'flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all duration-300 ease-material',
                a.attended
                  ? 'border-teal/40 bg-teal/10'
                  : 'border-white/8 bg-white/[0.02] hover:border-teal/30',
              )}
            >
              <div className="grid h-10 w-10 place-items-center rounded-full bg-teal/12 text-[13px] font-bold text-teal">
                {(a.student ?? '?').split(' ').map((n: string) => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="text-[15px] font-medium text-offwhite">{a.student}</div>
                <div className="font-mono text-caption text-graytext-mid">
                  {a.id.slice(0, 8).toUpperCase()}
                </div>
              </div>
              <div
                className={cx(
                  'grid h-8 w-8 place-items-center rounded-full transition-colors',
                  a.attended ? 'bg-teal text-onyx' : 'border border-white/20 text-graytext-mid',
                )}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m5 12 4 4L19 6" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-caption text-graytext-mid">
        Check-in is one-way — each scan or tap writes an attendance record and awards points.
      </p>
    </div>
  )
}
