import { useAuth } from './auth'
import type { Role } from './types'

// The UI is a function of what you may do (PRD P3 / §16 — POR-driven surfaces).
// Session identity now comes from the authenticated account, not a demo toggle.
export function useSession(): { id: string | undefined; role: Role; name: string; city: string } {
  const { currentUser } = useAuth()
  return {
    id: currentUser?.id,
    role: currentUser?.role ?? 'student',
    name: currentUser?.name ?? 'Guest',
    city: currentUser?.city ?? 'Hyderabad',
  }
}
