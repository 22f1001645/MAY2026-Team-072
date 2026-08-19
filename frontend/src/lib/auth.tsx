import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { api, setOnSessionExpired } from './api'
import { useToast } from '../components/ui'
import type { Account, Capabilities, Role } from './types'

/* Auth backed by the Flask JWT API Phase 2. The access token lives in memory;
 * the refresh token lives in an httpOnly cookie. The backend is the single
 * source of truth for capabilities (D-12). */

// `Account` and `Capabilities` now live with the other domain types; re-exported
// here so existing `from './auth'` imports keep working.
export type { Account, Capabilities }

interface AuthCtx {
  currentUser: Account | null
  capabilities: Capabilities | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string; role?: Role }>
  register: (data: {
    name: string
    email: string
    password: string
    region_id: string
    city?: string
  }) => Promise<{ ok: boolean; error?: string }>
  logout: () => void
  updateCurrentUser: (updates: Partial<Account>) => void
  refreshUser: () => Promise<void>
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Account | null>(null)
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  // Register session expiry callback (D-06). api.ts calls this once per failed
  // refresh, so the toast and the redirect happen once however many requests
  // were queued behind it. The expiry travels as router state, never a query
  // param — a query param survives a bookmark and would lie (02-UI-SPEC S3).
  useEffect(() => {
    setOnSessionExpired(() => {
      setCurrentUser(null)
      setCapabilities(null)
      // Redirect to login if not already there, preserving intent
      if (location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/') {
        addToast('Session expired — please sign in', 'info')
        navigate('/login', { replace: true, state: { from: location.pathname, expired: true } })
      }
    })
  }, [navigate, location.pathname, addToast])

  // Resolve an existing session on first load (D-08)
  useEffect(() => {
    let active = true
    async function resolve() {
      // Purge legacy ekatva_token (D-09)
      localStorage.removeItem('ekatva_token')
      
      try {
        await api.refresh()
        const user = await api.me()
        if (active) {
          setCurrentUser(user)
          setCapabilities(user.capabilities)
        }
      } catch {
        // No valid session
      } finally {
        if (active) setLoading(false)
      }
    }
    resolve()
    return () => {
      active = false
    }
  }, [])

  const login: AuthCtx['login'] = async (email, password) => {
    try {
      await api.login(email, password) // Sets refresh cookie and returns access token in memory
      const user = await api.me() // Re-fetch to get enriched user + capabilities
      setCurrentUser(user)
      setCapabilities(user.capabilities)
      
      // Determine UI role for routing
      let role: Role = user.role
      if (user.role !== 'admin' && user.capabilities?.isOrganiser) {
        role = 'organiser'
      }
      return { ok: true, role }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  }

  const register: AuthCtx['register'] = async (data) => {
    try {
      await api.register(data)
      // Register currently doesn't set refresh cookie in backend, but Phase 2 assumes login is required after
      // or we just fetch me if it does
      const user = await api.me()
      setCurrentUser(user)
      setCapabilities(user.capabilities)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  }

  const logout = async () => {
    try {
      await api.logout()
    } finally {
      // Clear react-query cache so data doesn't leak to the next login session
      queryClient.clear()
      // Use a hard redirect so AppShell is completely bypassed and destroyed. 
      // This ensures AppShell doesn't catch the unauthenticated state mid-render 
      // and redirect us back with state={{ from: '/organiser' }}
      window.location.href = '/login'
    }
  }

  const refreshUser = async () => {
    const user = await api.me()
    setCurrentUser(user)
    setCapabilities(user.capabilities)
  }

  const updateCurrentUser = (updates: Partial<Account>) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...updates } : prev))
  }

  return (
    <Ctx.Provider value={{ currentUser, capabilities, loading, login, register, logout, refreshUser, updateCurrentUser }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

// Demo credentials surfaced on the login screen (seeded in the backend DB)
export const DEMO_ACCOUNTS = [
  { name: 'Student Affairs', email: 'admin@ekatva.os', password: 'admin123', role: 'admin' as Role },
  { name: 'Sai Teja', email: 'saiteja@ds.study.iitm.ac.in', password: 'rc12345', role: 'organiser' as Role },
  { name: 'Arav Mehta', email: 'arav@ds.study.iitm.ac.in', password: 'student123', role: 'student' as Role },
]

// Where each role lands after login.
//
// This is the one place `localStorage['ekatva_view']` is read (D-15): an
// organiser who last used Student view comes back to the student home instead
// of the organiser dashboard. It is read to pick a *landing route* only —
// never to decide what the switcher renders, which is derived from the URL.
export const homeFor = (role: Role) => {
  if (role === 'organiser' && localStorage.getItem('ekatva_view') === 'student') return '/discover'
  return role === 'admin' ? '/admin/approvals' : role === 'organiser' ? '/organiser' : '/discover'
}
