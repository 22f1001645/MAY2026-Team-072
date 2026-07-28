import type { ReactNode } from 'react'
import { cx } from '../lib/format'

/* ---------------------------------------------------------------------------
 * Design-system primitives — every token traces to the EKATVA Brand Kit v1.0
 * Teal = interactive/energy, Gold = warmth/headings, Onyx = ground.
 * ------------------------------------------------------------------------- */

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    'inline-flex items-center justify-center gap-2 font-bold uppercase tracking-wide rounded-full ' +
    'transition-all duration-300 ease-material focus:outline-none focus:ring-2 focus:ring-teal/50 ' +
    'disabled:opacity-40 disabled:cursor-not-allowed'
  // CTA hover: scale 1.02, lighten 10% (Brand Kit §7)
  const variants = {
    primary:
      'bg-teal text-onyx hover:bg-teal-accent hover:scale-[1.02] shadow-glow-teal',
    secondary:
      'bg-teal-deep/60 text-teal border border-teal/30 hover:bg-teal-deep hover:scale-[1.02]',
    ghost: 'bg-transparent text-graytext-light hover:text-teal hover:bg-white/5',
    danger:
      'bg-transparent text-red-300 border border-red-400/40 hover:bg-red-500/10',
  }
  const sizes = {
    sm: 'text-[12px] px-3 py-1.5',
    md: 'text-[14px] px-5 py-2.5',
    lg: 'text-[14px] px-7 py-3.5',
  }
  return (
    <button className={cx(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  )
}

export function Card({
  children,
  className,
  hover = false,
  onClick,
}: {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cx(
        'relative rounded-xl2 border border-white/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-card',
        // Card hover: lift 4px + border glow (Brand Kit §7)
        hover &&
          'cursor-pointer transition-all duration-300 ease-material hover:-translate-y-1 hover:border-teal/40 hover:shadow-glow-teal',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'teal' | 'gold' | 'neutral' | 'success' | 'warn' | 'danger'
}) {
  const tones = {
    teal: 'bg-teal/10 text-teal border-teal/25',
    gold: 'bg-gold/10 text-gold border-gold/25',
    neutral: 'bg-white/5 text-graytext-light border-white/10',
    success: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/25',
    warn: 'bg-amber-400/10 text-amber-300 border-amber-400/25',
    danger: 'bg-red-400/10 text-red-300 border-red-400/25',
  }
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  )
}

export function SectionTitle({
  eyebrow,
  title,
  sub,
  right,
}: {
  eyebrow?: string
  title: string
  sub?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-1 text-caption font-semibold uppercase tracking-[0.2em] text-teal">
            {eyebrow}
          </div>
        )}
        {/* Headings use Unity Gold (Brand Kit §2) */}
        <h1 className="text-h1 font-bold text-gold">{title}</h1>
        {sub && <p className="mt-1 max-w-[680px] text-body text-graytext-light">{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  tone = 'teal',
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'teal' | 'gold'
}) {
  return (
    <Card className="p-5">
      <div className="text-caption uppercase tracking-wider text-graytext-light">
        {label}
      </div>
      <div
        className={cx(
          'mt-1 text-[32px] font-bold leading-none',
          tone === 'teal' ? 'text-teal' : 'text-gold',
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1.5 text-caption text-graytext-mid">{hint}</div>}
    </Card>
  )
}

export function Progress({
  value,
  max,
  tone = 'teal',
}: {
  value: number
  max: number
  tone?: 'teal' | 'gold'
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100))
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
      <div
        className={cx(
          'h-full rounded-full transition-all duration-500 ease-material',
          tone === 'teal' ? 'bg-teal' : 'bg-gold',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function EmptyState({ title, sub }: { title: string; sub?: string }) {
  return (
    <Card className="p-12 text-center">
      <div className="mx-auto mb-3 h-12 w-12 rounded-full border border-teal/30 bg-teal/5" />
      <div className="text-h3 font-semibold text-offwhite">{title}</div>
      {sub && <div className="mt-1 text-body text-graytext-light">{sub}</div>}
    </Card>
  )
}

// The mandala/oneness mark — used across surfaces (Brand Kit §4, icon variant)
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal/40',
        className,
      )}
      {...props}
    />
  )
}

export function Mandala({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      aria-hidden
    >
      <circle cx="32" cy="32" r="18" stroke="#5CE6C9" strokeWidth="2.4" />
      <circle cx="32" cy="32" r="11" stroke="#FFCF96" strokeWidth="2.4" />
      <g stroke="#3FD4B6" strokeWidth="1.6">
        <line x1="32" y1="8" x2="32" y2="20" />
        <line x1="32" y1="44" x2="32" y2="56" />
        <line x1="8" y1="32" x2="20" y2="32" />
        <line x1="44" y1="32" x2="56" y2="32" />
      </g>
      <circle cx="32" cy="32" r="4" fill="#FFCF96" />
    </svg>
  )
}
