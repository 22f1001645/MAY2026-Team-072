import { useState, createContext, useContext, type ReactNode, useEffect } from 'react'
import { useAuth } from './auth'
import type { Role } from './types'

interface SessionCtx {
  viewRole: Role
  setViewRole: (r: Role) => void
}

const Ctx = createContext<SessionCtx | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const { currentUser, capabilities } = useAuth()
  const defaultRole: Role = currentUser?.role === 'admin' ? 'admin' : (capabilities?.isOrganiser ? 'organiser' : 'student')
  const [viewRole, setViewRole] = useState<Role | null>(null)

  // Reset view role if user changes
  useEffect(() => {
    setViewRole(null)
  }, [currentUser?.id])

  return (
    <Ctx.Provider value={{ viewRole: viewRole || defaultRole, setViewRole }}>
      {children}
    </Ctx.Provider>
  )
}

export function useSession() {
  const { currentUser } = useAuth()
  const ctx = useContext(Ctx)
  
  return {
    role: ctx?.viewRole ?? currentUser?.role ?? 'student',
    name: currentUser?.name ?? 'Guest',
    city: currentUser?.city ?? 'Hyderabad',
    setViewRole: ctx?.setViewRole ?? (() => {})
  }
}
