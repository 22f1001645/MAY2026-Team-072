import { Card, Mandala } from './ui'

// Shared async states for query-backed pages — on brand, low-noise.

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 animate-spin-slow">
        <Mandala size={44} />
      </div>
      <div className="text-body text-graytext-light">{label}</div>
    </div>
  )
}

export function ErrorState({ error }: { error: unknown }) {
  const message =
    (error as { message?: string })?.message ?? 'Something went wrong.'
  const isNetwork = (error as { code?: string })?.code === 'network_error'
  return (
    <Card className="mx-auto max-w-lg p-10 text-center">
      <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-red-400/30 bg-red-500/10 text-red-300">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
        </svg>
      </div>
      <div className="text-h3 font-semibold text-offwhite">
        {isNetwork ? 'Backend unavailable' : 'Could not load'}
      </div>
      <p className="mt-1 text-body text-graytext-light">{message}</p>
      {isNetwork && (
        <p className="mt-3 text-caption text-graytext-mid">
          Start it with <span className="text-teal">python run.py</span> in the{' '}
          <span className="text-teal">backend/</span> folder.
        </p>
      )}
    </Card>
  )
}
