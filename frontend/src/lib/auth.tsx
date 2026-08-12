import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, getToken, setToken } from './api'
import type { Role } from './types'

/* Auth backed by the Flask JWT API. The access token lives in localStorage;
 * the current user is resolved from /auth/me on cold load, or returned directly
 * by login/register. (Milestone 2 §1 — Flask-JWT-Extended + POR-RBAC.) */

export interface Account {
  id: string
  name: string
  email: string
  role: Role
  city: string
  por?: string
  pors?: { por_type: string; org?: string }[]
}

// PORs that grant organiser surfaces (mirrors the backend rbac.ORGANISER_PORS)
const ORGANISER_POR_TYPES = new Set([
  'Regional Coordinator',
  'Society Secretary',
  'House Secretary',
  'Event Lead',
  'Technical Secretary',
])

function withPor(user: any): Account {
  // The UI role is a function of the POR, not the login role (PRD P3):
  // a student who holds an organiser POR sees the organiser surfaces.
  const pors = user?.pors ?? []
  const por = pors[0]?.por_type
  let role: Role = user.role
  if (user.role !== 'admin') {
    role = pors.some((p: any) => ORGANISER_POR_TYPES.has(p.por_type)) ? 'organiser' : 'student'
  }
  return { ...user, role, por }
}

interface AuthCtx {
  currentUser: Account | null
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
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<Account | null>(null)
  const [loading, setLoading] = useState(true)

  // Resolve an existing session on first load
  useEffect(() => {
    let active = true
    async function resolve() {
      if (!getToken()) {
        setLoading(false)
        return
      }
      try {
        const user = await api.me()
        if (active) setCurrentUser(withPor(user))
      } catch {
        setToken(null)
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
      const { access_token, user } = await api.login(email, password)
      setToken(access_token)
      const account = withPor(user)
      setCurrentUser(account)
      return { ok: true, role: account.role }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  }

  const register: AuthCtx['register'] = async (data) => {
    try {
      const { access_token, user } = await api.register(data)
      setToken(access_token)
      setCurrentUser(withPor(user))
      return { ok: true }
    } catch (e) {
      return { ok: false, error: (e as Error).message }
    }
  }

  const logout = () => {
    setToken(null)
    setCurrentUser(null)
  }

  const updateCurrentUser = (updates: Partial<Account>) => {
    setCurrentUser((prev) => (prev ? { ...prev, ...updates } : prev))
  }

  return (
    <Ctx.Provider value={{ currentUser, loading, login, register, logout, updateCurrentUser }}>
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
