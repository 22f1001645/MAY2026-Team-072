import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { Button, Select } from '../components/ui'
import { cx } from '../lib/format'
import AuthShell from './AuthShell'
import { useRegions, useCitiesForRegion } from '../lib/queries'
import { api } from '../lib/api'
import { useQueryClient } from '@tanstack/react-query'

export default function Register() {
  const { register } = useAuth()
  const nav = useNavigate()
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '',
    email: '',
    region_id: '',
    city: '',
    password: '',
    confirm: '',
  })
  const [cityMode, setCityMode] = useState<'select' | 'other'>('select')
  const [customCity, setCustomCity] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: regions = [], isLoading: regionsLoading } = useRegions()
  const { data: regionCities = [], isLoading: citiesLoading } = useCitiesForRegion(
    form.region_id || null,
  )

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [k]: e.target.value })

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setForm({ ...form, region_id: e.target.value, city: '' })
    setCityMode('select')
    setCustomCity('')
  }

  const pwStrength = strength(form.password)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.region_id) return setError('Please select your region.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password !== form.confirm) return setError('Passwords do not match.')

    const resolvedCity = cityMode === 'other' ? customCity.trim() : form.city

    setLoading(true)
    try {
      if (cityMode === 'other' && resolvedCity) {
        await api.addCityToRegion(form.region_id, resolvedCity)
        qc.invalidateQueries({ queryKey: ['cities-for-region', form.region_id] })
      }
      const res = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        region_id: form.region_id,
        city: resolvedCity || undefined,
      })
      if (!res.ok) {
        setError(res.error || 'Registration failed.')
      } else {
        nav('/discover')
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
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
        Create a student account and find your region.
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
            placeholder="22f1001234@ds.study.iitm.ac.in"
            className={inputCls}
          />
        </Field>

        {/* Step 1: Region (required) */}
        <Field label="Region">
          <Select
            value={form.region_id}
            onChange={handleRegionChange}
            options={[
              { label: regionsLoading ? 'Loading regions...' : 'Select your region', value: '' },
              ...regions.map((r) => ({ label: r.name, value: r.id }))
            ]}
          />
        </Field>

        {/* Step 2: City (optional, unlocks after region is chosen) */}
        {form.region_id && (
          <Field label="Your city">
            {cityMode === 'select' ? (
              <div className="flex gap-2">
                <Select
                  value={form.city}
                  onChange={set('city')}
                  className="flex-1"
                  options={[
                    { label: citiesLoading ? 'Loading cities...' : 'Select your city (optional)', value: '' },
                    ...regionCities.map((c) => ({ label: c.name, value: c.name }))
                  ]}
                />
                <button
                  type="button"
                  onClick={() => setCityMode('other')}
                  className="shrink-0 rounded-xl border border-teal/30 bg-teal/10 px-3 text-[13px] text-teal hover:bg-teal/20 transition-colors"
                >
                  + Other
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={customCity}
                  onChange={(e) => setCustomCity(e.target.value)}
                  placeholder="Type your city name..."
                  className={cx(inputCls, 'flex-1')}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { setCityMode('select'); setCustomCity('') }}
                  className="shrink-0 rounded-xl border border-white/10 bg-white/5 px-3 text-[13px] text-graytext-mid hover:bg-white/10 transition-colors"
                >
                  Back
                </button>
              </div>
            )}
            <p className="mt-1.5 text-[12px] text-graytext-mid">
              City is optional. Your Region is the primary anchor for events and analytics.
            </p>
          </Field>
        )}

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
          {loading ? 'Creating account...' : 'Create account'}
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
