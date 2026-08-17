import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from './auth'
import { viewFromPathname } from '../components/ViewSwitcher'
import type { Role } from './types'

/* The active view is derived from the URL (D-15, D-16), so there is no
 * `viewRole` state and no `setViewRole` — ViewSwitcher navigates instead of
 * setting a flag, and the URL is the only source of truth. `SessionProvider` is
 * kept as a passthrough so App.tsx's tree is unchanged; it holds no state. */

export function SessionProvider({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function useSession(): {
  id?: string
  role: Role
  name: string
  city: string
  capabilities?: any
} {
  const { currentUser } = useAuth()
  const { pathname } = useLocation()

  // Admin is a login role, not a view: an admin keeps the admin nav whatever
  // the URL says. For everyone else the pathname picks Student vs Organiser,
  // which is what makes `NAV[role]` in Layout follow the switcher.
  const role: Role = currentUser?.role === 'admin' ? 'admin' : viewFromPathname(pathname)

  return {
    id: currentUser?.id,
    role,
    name: currentUser?.name ?? '',
    city: currentUser?.city ?? '',
    capabilities: currentUser?.capabilities,
  }
}
