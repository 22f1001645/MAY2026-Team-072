import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { DEMO_ACCOUNTS, homeFor, useAuth } from '../lib/auth'
import { Button } from '../components/ui'
import { cx } from '../lib/format'
import AuthShell from './AuthShell'

export default function Login() {
  const { login } = useAuth()
  const nav = useNavigate()
  const location = useLocation()
  
  // Router state, not a query param: a query param survives a bookmark and
  // would show an expiry notice to someone whose session never expired
  // (02-UI-SPEC S3). `from` is the route the bounce came off, set by both
  // App.tsx's protected-route guard and the session-expiry callback.
  const navState = location.state as { from?: string; expired?: boolean } | null
  const isExpired = navState?.expired === true
  const goHome = (role: Parameters<typeof homeFor>[0]) => nav(navState?.from ?? homeFor(role))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await login(email, password)
    setLoading(false)
    if (!res.ok) {
      setError(res.error || 'Login failed.')
      return
    }
    goHome(res.role!)
  }

  const quickLogin = async (em: string, pw: string) => {
    setEmail(em)
    setPassword(pw)
    setError('')
    setLoading(true)
    const res = await login(em, pw)
    setLoading(false)
    if (res.ok) goHome(res.role!)
    else setError(res.error || 'Login failed.')
  }

  return (
    <AuthShell
      quote={{
        text: 'A room full of people who had only ever known each other as usernames.',
        source: 'Ekatva Hyderabad · the founding fest',
      }}
    >
      <h1 className="text-h1 font-bold text-gold">Welcome back</h1>
      <p className="mt-1 text-body text-graytext-light">
        Sign in to your Ekatva OS dashboard.
      </p>

      {isExpired && (
        <div className="mt-6 rounded-xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-[14px] text-amber-300">
          Your session expired. Sign in to continue.
        </div>
      )}

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Email">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@ekatva.os"
            className={inputCls}
          />
        </Field>

        <Field
          label="Password"
          right={
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="text-caption text-graytext-mid hover:text-teal"
            >
              {show ? 'Hide' : 'Show'}
            </button>
          }
        >
          <input
            type={show ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className={inputCls}
          />
        </Field>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
            </svg>
            {error}
          </div>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-body text-graytext-light">
        New to Ekatva?{' '}
        <Link to="/register" className="font-semibold text-teal hover:text-teal-accent">
          Create an account
        </Link>
      </p>

      {/* Demo accounts — seeded in the mock DB, for quick testing/grading */}
      <div className="mt-9 rounded-xl2 border border-white/8 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2 text-caption font-semibold uppercase tracking-wider text-graytext-mid">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          Demo accounts — tap to sign in
        </div>
        <div className="space-y-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              onClick={() => quickLogin(a.email, a.password)}
              className="flex w-full items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5 text-left transition-all duration-300 ease-material hover:border-teal/40 hover:bg-teal/[0.06]"
            >
              <span
                className={cx(
                  'grid h-8 w-8 place-items-center rounded-full text-[11px] font-bold',
                  a.role === 'admin'
                    ? 'bg-gold/15 text-gold'
                    : 'bg-teal/15 text-teal',
                )}
              >
                {a.name.split(' ').map((n) => n[0]).join('')}
              </span>
              <span className="flex-1">
                <span className="block text-[13px] font-medium text-offwhite">
                  {a.name} · <span className="capitalize text-graytext-light">{a.role}</span>
                </span>
                <span className="block font-mono text-caption text-graytext-mid">
                  {a.email} / {a.password}
                </span>
              </span>
              <svg className="text-graytext-mid" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  )
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/20'

function Field({
  label,
  right,
  children,
}: {
  label: string
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-caption font-semibold uppercase tracking-wider text-graytext-light">
          {label}
        </label>
        {right}
      </div>
      {children}
    </div>
  )
}
