import { useEffect, useRef, useState, useMemo } from 'react'
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode'
import { useCheckIn, useEvent, useRoster, useScanQr, useDashboard } from '../lib/queries'
import { Button, Card, SectionTitle } from '../components/ui'
import { Loading, ErrorState } from '../components/states'
import { cx } from '../lib/format'

// FR-D6: organiser marks registered students as attended (check-in) ->
// the attendance record that powers points & fee utilisation

function MissionControlHero() {
  const [time, setTime] = useState(new Date())
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative mb-8 overflow-hidden rounded-[32px] border border-teal/20 bg-onyx p-8 shadow-[0_0_40px_rgba(92,230,201,0.1)]">
      {/* Abstract Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
      
      {/* Glowing scanning line effect */}
      <div className="absolute left-0 top-0 h-full w-1.5 bg-gradient-to-b from-transparent via-teal to-transparent shadow-[0_0_20px_#5CE6C9] opacity-80" />

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex h-3 w-3 items-center justify-center">
              <div className="absolute h-full w-full animate-ping rounded-full bg-teal opacity-75" />
              <div className="relative h-1.5 w-1.5 rounded-full bg-teal" />
            </div>
            <div className="font-mono text-[13px] font-bold tracking-[0.2em] text-teal">
              SYSTEM STATUS: OPERATIONAL
            </div>
          </div>
          <h1 className="text-[40px] font-bold leading-none text-offwhite tracking-tight">
            Command Center
          </h1>
          <p className="mt-3 text-[15px] text-graytext-mid max-w-md">
            Global check-in uplink established. Select a live event below to initialize the optical scanner and record attendee arrivals.
          </p>
        </div>

        {/* Real-time Clock */}
        <div className="text-left md:text-right w-full md:w-auto p-6 md:p-0 rounded-2xl bg-black/40 md:bg-transparent border border-white/5 md:border-transparent">
          <div className="font-mono text-[48px] font-bold text-offwhite tracking-tighter drop-shadow-[0_0_15px_rgba(92,230,201,0.2)]">
            {time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div className="font-mono text-[12px] uppercase tracking-widest text-teal/70 mt-2">
            {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · LOCAL TIME
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckIn() {
  const { data: dashboardData, isLoading: isDashLoading, isError: isDashError, error: dashError } = useDashboard()
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  const { data: e, isLoading: isEventLoading, isError: isEventError, error: eventError } = useEvent(selectedEventId ?? undefined)
  const { data: roster = [] } = useRoster(selectedEventId ?? undefined)

  const checkInMut = useCheckIn()
  const scanQrMut = useScanQr()
  const [q, setQ] = useState('')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
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
  }, [selectedEventId, e]) // Depend on selectedEventId and e

  if (isDashLoading) return <Loading label="Loading check-in dashboard..." />
  if (isDashError) return <ErrorState error={dashError} />

  const events: any[] = dashboardData?.my_events ?? []
  // Only show approved and not completed events
  const liveEvents = events.filter((ev) => ev.proposal_status === 'approved' && ev.status !== 'completed')

  const checkedIn = roster.filter((a: any) => a.attended).length
  const filtered = q.trim() === '' ? [] : roster.filter((a: any) =>
    (a.student ?? '').toLowerCase().includes(q.toLowerCase()),
  )

  // Check-in opens strictly 2 hours before the scheduled start time
  const isCheckInOpen = useMemo(() => {
    if (!e?.startsAt) return false
    const startTime = new Date(e.startsAt).getTime()
    const now = Date.now()
    const twoHoursMs = 2 * 60 * 60 * 1000
    return (startTime - now) <= twoHoursMs
  }, [e?.startsAt])

  const toggle = (reg: any) => {
    if (reg.attended || pendingIds.has(reg.id) || !e || !isCheckInOpen) return // check-in is one-way
    setPendingIds(prev => new Set(prev).add(reg.id))
    checkInMut.mutate({ id: e.id, ids: [reg.id] }, {
      onSettled: () => {
        setPendingIds(prev => {
          const next = new Set(prev)
          next.delete(reg.id)
          return next
        })
      }
    })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 animate-fade-in">
      {/* Hero & Event Selector */}
      <div>
        <MissionControlHero />

        <div className="mt-8">
          <label className="text-caption uppercase tracking-wider text-graytext-mid mb-4 block">
            Live Events
          </label>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {liveEvents.length === 0 ? (
               <p className="text-[13px] text-gold col-span-full">You don't have any upcoming live events to manage.</p>
            ) : (
              liveEvents.map((ev) => {
                const isSelected = selectedEventId === ev.id
                return (
                  <button
                    key={ev.id}
                    onClick={() => setSelectedEventId(isSelected ? null : ev.id)}
                    className={cx(
                      'relative overflow-hidden flex flex-col items-start rounded-2xl border p-5 text-left transition-all duration-300 ease-material will-change-transform',
                      isSelected
                        ? 'border-teal bg-teal/10 shadow-[0_0_20px_rgba(92,230,201,0.2)] -translate-y-1'
                        : 'border-white/10 bg-onyx/50 hover:border-teal/50 hover:bg-white/5 hover:-translate-y-0.5'
                    )}
                  >
                    {/* Glowing Accent for selected state */}
                    {isSelected && (
                      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-teal to-transparent shadow-[0_0_10px_rgba(92,230,201,1)]" />
                    )}
                    
                    <div className="mb-1 text-[16px] font-bold text-offwhite line-clamp-1">{ev.title}</div>
                    <div className="text-[13px] text-graytext-mid line-clamp-1 flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-8-4.5-8-11a8 8 0 1 1 16 0c0 6.5-8 11-8 11z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {ev.city}
                    </div>
                  </button>
                )
              })
            )}
          </div>
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
                    {q.trim() === '' ? (
                      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-graytext-mid">
                        <svg className="mb-3 opacity-30" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="11" cy="11" r="8" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35" />
                        </svg>
                        <p className="text-[13px]">Type a name to search the roster...</p>
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-graytext-mid">
                        <p className="text-[13px]">No matches found for "{q}".</p>
                      </div>
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
                                disabled={r.attended || pendingIds.has(r.id) || !isCheckInOpen}
                                title={!isCheckInOpen ? "Check-in opens 2 hours before the event" : undefined}
                              >
                                {r.attended ? 'Arrived' : (!isCheckInOpen ? 'Too early' : 'Check in')}
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
