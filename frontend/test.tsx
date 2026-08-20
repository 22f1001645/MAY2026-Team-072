import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { useCheckIn, useEvent, useRoster, useScanQr, useDashboard } from '../lib/queries'
import { Button, Card, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx } from '../lib/format'

// FR-D6: organiser marks registered students as attended (check-in) →
// the attendance record that powers points & fee utilisation
export default function CheckIn() {
  const { data: dashboardData, isLoading: isDashLoading, isError: isDashError, error: dashError } = useDashboard()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const { data: e, isLoading: isEventLoading, isError: isEventError, error: eventError } = useEvent(selectedEventId ?? undefined)
  const { data: roster = [] } = useRoster(selectedEventId ?? undefined)

  const checkInMut = useCheckIn()
  const scanQrMut = useScanQr()
  const [q, setQ] = useState('')
  const [scanResult, setScanResult] = useState<{ status: 'success' | 'duplicate' | 'error'; message: string } | null>(null)
  const lastScannedId = useRef<string | null>(null)

  useEffect(() => {
    if (!selectedEventId || !e) return

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: 250, supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA] },
      false,
    )

    scanner.render(
      (decodedText) => {
        if (decodedText === lastScannedId.current || scanQrMut.isPending) return
        lastScannedId.current = decodedText

        scanQrMut.mutate(
          { id: selectedEventId, registration_id: decodedText },
          {
            onSuccess: (res: any) => {
              setScanResult({
                status: res.status,
                message: res.status === 'success' ? `Checked in ${res.student_name}` : res.message || `${res.student_name} already checked in`,
              })
              setTimeout(() => setScanResult(null), 3000)
              setTimeout(() => { lastScannedId.current = null }, 3000)
            },
            onError: (err: any) => {
              setScanResult({ status: 'error', message: err.message || 'Invalid QR code' })
              setTimeout(() => setScanResult(null), 3000)
              setTimeout(() => { lastScannedId.current = null }, 3000)
            },
          },
        )
      },
      () => {}, // ignore continuous scan-frame errors
    )

    return () => {
      scanner.clear().catch(() => {})
    }
  }, [selectedEventId, e])

  if (isDashLoading) return <Loading label="Loading check-in dashboard…" />
  if (isDashError) return <ErrorState error={dashError} />

  const events: any[] = dashboardData?.my_events ?? []
  const liveEvents = events.filter((ev) => ev.proposal_status === 'approved' && ev.status !== 'completed')

  const checkedIn = roster.filter((a: any) => a.attended).length
  const filtered = roster.filter((a: any) =>
    (a.student ?? '').toLowerCase().includes(q.toLowerCase()),
  )

  const toggle = (reg: any) => {
    if (reg.attended || checkInMut.isPending) return
    checkInMut.mutate({ id: e.id, ids: [reg.id] })
  }

  return <div className="mx-auto max-w-4xl space-y-8 animate-fade-in">
      {/* Header & Event Selector */}
      <div>
        <SectionTitle
          eyebrow="Organiser Hub · Command Center"
          title="Global Check-In"
          sub="Select an active event to initialize the scanner and begin recording arrivals."
        />

        <div className="mt-8 rounded-[24px] border border-white/10 bg-onyx/50 backdrop-blur-md p-6 shadow-2xl">
          <label className="text-caption uppercase tracking-wider text-graytext-mid mb-3 block">
            Select Live Event
          </label>
          <div className="relative">
            <select
              className="w-full appearance-none rounded-xl border border-white/10 bg-black/40 px-5 py-4 text-[16px] text-offwhite font-medium outline-none transition-all hover:bg-white/5 focus:border-teal focus:ring-1 focus:ring-teal"
              value={selectedEventId || ''}
              onChange={(evt) => setSelectedEventId(evt.target.value || null)}
            >
              <option value="">-- Choose an event --</option>
              {liveEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.city})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 text-graytext-light">
              ▼
            </div>
          </div>
          {liveEvents.length === 0 && (
             <p className="mt-3 text-[13px] text-gold">You don't have any upcoming live events to manage.</p>
          )}
        </div>
      </div>

      {/* Main Scanner Section - Only visible if an event is selected */}
      {selectedEventId && (
        <div className="animate-fade-up will-change-transform">
          {isEventLoading ? (
            <Loading label="Initializing scanner..." />
          ) : isEventError ? (
            <ErrorState error={eventError} />
          ) : !e ? (
            <div>Event not found</div>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1fr_350px] items-start">
              
              {/* Left Column: Scanner and Status */}
              <div className="space-y-6">
                
                {/* Result Overlay */}
                {scanResult && (
                  <div className={cx(
                    "rounded-2xl p-6 shadow-2xl animate-spring-up border",
                    scanResult.status === 'success' ? 'bg-teal/10 border-teal/20 text-teal' :
                    scanResult.status === 'duplicate' ? 'bg-gold/10 border-gold/20 text-gold' :
                    'bg-red-500/10 border-red-500/20 text-red-400'
                  )}>
                    <div className="text-[18px] font-semibold">{scanResult.message}</div>
                  </div>
                )}

                {/* Scanner Container */}
                <Card className="overflow-hidden border border-white/5 bg-black/40 p-1">
                  <div id="qr-reader" className="overflow-hidden rounded-xl bg-black" />
                  <style>{`
                    #qr-reader { border: none !important; }
                    #qr-reader__scan_region { background: #000; min-height: 300px; }
                    #qr-reader__dashboard_section_csr span { color: #aaa !important; font-family: sans-serif; }
                    #qr-reader__dashboard_section_swaplink { color: #5CE6C9 !important; text-decoration: none; margin-top: 10px; display: inline-block; }
                    #qr-reader button {
                      background: #1F4F59; color: #fff; border: 1px solid rgba(92,230,201,0.2); 
                      padding: 8px 16px; border-radius: 8px; font-weight: 500; cursor: pointer; transition: 0.2s;
                    }
                    #qr-reader button:hover { background: #5CE6C9; color: #000; }
                  `}</style>
                </Card>
              </div>

              {/* Right Column: Roster & Stats */}
              <div className="space-y-6">
                {/* Stats Card */}
                <div className="rounded-[24px] border border-white/10 bg-gradient-to-b from-teal/10 to-transparent p-6 text-center">
                  <div className="text-caption uppercase tracking-widest text-teal mb-2">Live Headcount</div>
                  <div className="text-[56px] font-bold leading-none text-offwhite drop-shadow-[0_0_15px_rgba(92,230,201,0.3)]">
                    {checkedIn}
                  </div>
                  <div className="text-[16px] text-graytext-mid font-medium mt-1">
                    of {roster.length} registered
                  </div>
                  <div className="mt-4 h-1.5 w-full rounded-full bg-black/50 overflow-hidden">
                    <div 
                      className="h-full bg-teal transition-all duration-1000 ease-out"
                      style={{ width: `${roster.length ? (checkedIn / roster.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {/* Manual Roster Search */}
                <Card className="flex flex-col h-[500px]">
                  <div className="p-4 border-b border-white/5 bg-black/20">
                    <input
                      type="text"
                      placeholder="Search by name..."
                      value={q}
                      onChange={(evt) => setQ(evt.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-black/40 px-4 py-2.5 text-[14px] outline-none transition-colors focus:border-teal text-offwhite"
                    />
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                    {filtered.length === 0 ? (
                      <div className="p-8 text-center text-[13px] text-graytext-mid">No matches found.</div>
                    ) : (
                      <div className="space-y-1">
                        {filtered.map((r: any) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between rounded-xl p-3 transition-colors hover:bg-white/5"
                          >
                            <div>
                              <div className="text-[14px] font-medium text-offwhite">{r.student}</div>
                              <div className="text-[12px] text-graytext-mid uppercase tracking-wider">{r.id.split('-').pop()}</div>
                            </div>
                            <Button
                              variant={r.attended ? 'ghost' : 'secondary'}
                              size="sm"
                              onClick={() => toggle(r)}
                              disabled={r.attended || checkInMut.isPending}
                            >
                              {r.attended ? 'Arrived' : 'Check in'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </div>

            </div>
          )}
        </div>
      )}

    </div>
  )
}

