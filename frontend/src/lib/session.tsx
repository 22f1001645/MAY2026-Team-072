import { useAuth } from './auth'
import type { Role } from './types'

// The UI is a function of what you may do (PRD P3 / §16 — POR-driven surfaces).
// Session identity now comes from the authenticated account, not a demo toggle.
export function useSession(): { role: Role; name: string; city: string } {
  const { currentUser } = useAuth()
  return {
    role: currentUser?.role ?? 'student',
    name: currentUser?.name ?? 'Guest',
    city: currentUser?.city ?? 'Hyderabad',
  }
}
