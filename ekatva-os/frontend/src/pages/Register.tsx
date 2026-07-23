import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { CITIES } from '../lib/mock'
import { Button } from '../components/ui'
import { cx } from '../lib/format'
import AuthShell from './AuthShell'

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    city: CITIES[0].name,
    password: '',
    confirm: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [k]: e.target.value })

  const pwStrength = strength(form.password)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 6)
      return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')

    setLoading(true)
    const res = await register({
      name: form.name,
      email: form.email,
      password: form.password,
      city: form.city,
    })
    setLoading(false)
    if (!res.ok) return setError(res.error || 'Registration failed.')
    // New students land straight on their city discovery feed
    nav('/discover')
  }

  return (
    <AuthShell
      quote={{
        text: 'Belonging in an online degree is an operational problem wearing an emotional mask.',
        source: 'The Ekatva founding manifesto',
      }}
    >
      <h1 className="text-h1 font-bold text-gold">Join the community</h1>
      <p className="mt-1 text-body text-graytext-light">
        Create a student account and find your city.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <Field label="Full name">
          <input
            required
            value={form.name}
            onChange={set('name')}
            placeholder="Arav Mehta"
            className={inputCls}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            required
            value={form.email}
            onChange={set('email')}
            placeholder="you@iitm.ac.in"
            className={inputCls}
          />
        </Field>

        <Field label="Your city">
          <select value={form.city} onChange={set('city')} className={inputCls}>
            {CITIES.map((c) => (
              <option key={c.id} className="bg-onyx">
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Password">
          <input
            type="password"
            required
            value={form.password}
            onChange={set('password')}
            placeholder="At least 6 characters"
            className={inputCls}
          />
          {form.password && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={cx(
                      'h-1 flex-1 rounded-full transition-colors',
                      i < pwStrength.level
                        ? pwStrength.level === 1
                          ? 'bg-red-400'
                          : pwStrength.level === 2
                            ? 'bg-amber-400'
                            : 'bg-teal'
                        : 'bg-white/10',
                    )}
                  />
                ))}
              </div>
              <span className="text-caption text-graytext-mid">{pwStrength.label}</span>
            </div>
          )}
        </Field>

        <Field label="Confirm password">
          <input
            type="password"
            required
            value={form.confirm}
            onChange={set('confirm')}
            placeholder="Re-enter your password"
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
          {loading ? 'Creating account…' : 'Create account'}
        </Button>

        <p className="text-center text-caption text-graytext-mid">
          By joining you agree to keep it warm, inclusive and student-led.
        </p>
      </form>

      <p className="mt-6 text-center text-body text-graytext-light">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-teal hover:text-teal-accent">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

function strength(pw: string): { level: number; label: string } {
  if (!pw) return { level: 0, label: '' }
  let score = 0
  if (pw.length >= 6) score++
  if (pw.length >= 10 || /[0-9]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  const level = Math.min(3, Math.max(1, score))
  return { level, label: ['', 'Weak', 'Okay', 'Strong'][level] }
}

const inputCls =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[14px] text-offwhite placeholder:text-graytext-mid focus:border-teal/50 focus:outline-none focus:ring-2 focus:ring-teal/20'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-caption font-semibold uppercase tracking-wider text-graytext-light">
        {label}
      </label>
      {children}
    </div>
  )
}
