import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Mandala } from '../components/ui'

// Split-screen auth layout: brand story on the left, form on the right.
export default function AuthShell({
  children,
  quote,
}: {
  children: ReactNode
  quote: { text: string; source: string }
}) {
  return (
    <div className="min-h-screen bg-onyx lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-hero-gradient lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="grain absolute inset-0" />
        <div className="pointer-events-none absolute -right-32 -top-24 opacity-25">
          <svg width="440" height="440" viewBox="0 0 440 440" fill="none">
            {[200, 155, 110, 65].map((r, i) => (
              <circle
                key={r}
                cx="220"
                cy="220"
                r={r}
                stroke={i % 2 ? '#FFCF96' : '#5CE6C9'}
                strokeWidth="1.4"
                strokeDasharray={i === 1 ? '4 8' : undefined}
              />
            ))}
            <circle cx="220" cy="220" r="9" fill="#FFCF96" />
          </svg>
        </div>

        <Link to="/" className="relative flex items-center gap-2.5">
          <Mandala size={34} />
          <div>
            <div className="text-[18px] font-bold leading-none tracking-wide text-offwhite">
              EKATVA<span className="text-teal"> OS</span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.28em] text-gold">
              Unite · Inspire · Celebrate
            </div>
          </div>
        </Link>

        <div className="relative max-w-md">
          <div className="mb-5 text-5xl text-teal/40">“</div>
          <p className="text-[22px] font-medium leading-snug text-offwhite">{quote.text}</p>
          <p className="mt-4 text-caption uppercase tracking-widest text-gold">
            {quote.source}
          </p>
        </div>

        <div className="relative text-caption text-graytext-light">
          A community operating system for the IIT Madras BS ecosystem.
        </div>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col justify-center px-5 py-12 sm:px-10 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="mb-10 flex items-center gap-2.5 lg:hidden">
            <Mandala size={30} />
            <span className="text-[17px] font-bold tracking-wide text-offwhite">
              EKATVA<span className="text-teal"> OS</span>
            </span>
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
