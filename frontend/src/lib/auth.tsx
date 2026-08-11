import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api, setOnSessionExpired } from './api'
import type { Role } from './types'

/* Auth backed by the Flask JWT API Phase 2. The access token lives in memory;
 * the refresh token lives in an httpOnly cookie. The backend is the single
 * source of truth for capabilities (D-12). */

export interface Capabilities {
  is_organiser: boolean
  manageable_org_ids: string[]
  manageable_activity_ids: string[]
}

export interface Account {
  id: string
  name: string
  email: string
  role: Role
  city: string
  por?: string
  pors?: { por_type: string; org?: string }[]
  academic_status_stale?: boolean
}

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
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Account | null>(null)
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  // Register session expiry callback (D-06)
  useEffect(() => {
    setOnSessionExpired(() => {
      setCurrentUser(null)
      setCapabilities(null)
      // Redirect to login if not already there, preserving intent
      if (location.pathname !== '/login' && location.pathname !== '/register' && location.pathname !== '/') {
        navigate(`/login?from=${encodeURIComponent(location.pathname)}&expired=1`)
      }
    })
  }, [navigate, location.pathname])

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
      if (user.role !== 'admin' && user.capabilities?.is_organiser) {
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
      setCurrentUser(null)
      setCapabilities(null)
      navigate('/login')
    }
  }

  return (
    <Ctx.Provider value={{ currentUser, capabilities, loading, login, register, logout }}>
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

// Where each role lands after login
export const homeFor = (role: Role) =>
  role === 'admin' ? '/admin/approvals' : role === 'organiser' ? '/organiser' : '/discover'
