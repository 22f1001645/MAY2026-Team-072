import type { ReactNode } from 'react'
import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../lib/format'

/* ---------------------------------------------------------------------------
 * Toast notification system
 * ------------------------------------------------------------------------- */
type Toast = { id: string; message: string; type: 'success' | 'error' | 'info' }
type ToastContextType = { addToast: (message: string, type?: Toast['type']) => void }

const ToastContext = createContext<ToastContextType>({ addToast: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }, [])

  const icons = {
    success: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
    error: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    ),
    info: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  }
  const colors = {
    success: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
    error: 'bg-red-500/15 border-red-400/30 text-red-300',
    info: 'bg-teal/15 border-teal/30 text-teal',
  }

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      {createPortal(
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none"
        >
          {toasts.map(t => (
            <div
              key={t.id}
              className={cx(
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-[13px] font-medium shadow-xl backdrop-blur-sm pointer-events-auto',
                'animate-fade-up',
                colors[t.type],
              )}
            >
              <span className="shrink-0">{icons[t.type]}</span>
              {t.message}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}


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
    'transition duration-200 ease-material focus:outline-none focus:ring-2 focus:ring-teal/50 ' +
    'active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'
  // CTA hover: scale 1.02, lighten 10% (Brand Kit §7); press: scale 0.97 (feedback on press, not just release)
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
  const interactive = hover && !!onClick
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick?.()
              }
            }
          : undefined
      }
      className={cx(
        'relative rounded-xl2 border border-white/5 bg-gradient-to-b from-white/[0.04] to-white/[0.01] shadow-card',
        // Card hover: lift 4px + border glow (Brand Kit §7); press: scale 0.99 (subtler than Button)
        hover &&
          'cursor-pointer transition duration-200 ease-material hover:-translate-y-1 hover:border-teal/40 hover:shadow-glow-teal active:scale-[0.99]',
        interactive && 'focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50',
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
  className,
}: {
  children: ReactNode
  tone?: 'teal' | 'gold' | 'neutral' | 'success' | 'warn' | 'danger'
  className?: string
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
        className
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
        'w-full rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40',
        className,
      )}
      {...props}
    />
  )
}

/** The multi-line sibling of `Input`.
 *
 *  The base string is lifted verbatim from the `<textarea>` in
 *  `pages/ProposalNew.tsx` — four hand-rolled textareas with three different
 *  class strings already exist, and this phase needed two more. Lifting rather
 *  than authoring keeps the new primitive visually identical to the call sites
 *  it exists to unify; only the global focus ring is appended. Migrating the
 *  four existing call sites is deliberately out of scope (04-UI-SPEC.md). */
export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        'w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50',
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

export function Dialog({
  open,
  onClose,
  title,
  children,
  className
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-up">
      <div className="absolute inset-0" onClick={onClose} />
      <div className={cx("relative w-full max-w-md rounded-2xl border border-white/10 bg-onyx shadow-2xl overflow-hidden", className)}>
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <h2 className="text-[18px] font-bold text-offwhite">{title}</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-graytext-mid hover:bg-white/5 hover:text-offwhite transition">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}

export function Select({
  value,
  onChange,
  options,
  className,
  ariaLabel,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: { label: string; value: string }[]
  className?: string
  /** Accessible name for a select with no visible <label> — required wherever
   *  the control sits in a repeating row (UI-SPEC §7). */
  ariaLabel?: string
}) {
  return (
    <div className={cx("relative", className)}>
      <select
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className="w-full appearance-none rounded-xl border border-white/10 bg-onyx px-3.5 py-2.5 pr-10 text-[14px] text-offwhite focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-graytext-mid">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  )
}
