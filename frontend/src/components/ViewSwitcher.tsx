import { useSession } from '../lib/session'
import { useAuth } from '../lib/auth'
import { cx } from '../lib/format'
import type { Role } from '../lib/types'

export default function ViewSwitcher() {
  const { role: viewRole, setViewRole } = useSession()
  const { currentUser, capabilities } = useAuth()

  if (!currentUser) return null

  // Determine allowed roles
  const allowedRoles: { label: string; role: Role }[] = []

  if (currentUser.role === 'admin') {
    allowedRoles.push({ label: 'Admin', role: 'admin' })
  }

  // Admin or Organiser can view Organiser UI
  if (currentUser.role === 'admin' || capabilities?.isOrganiser) {
    allowedRoles.push({ label: 'Organiser', role: 'organiser' })
  }

  // Everyone can view Student UI
  allowedRoles.push({ label: 'Student', role: 'student' })

  // If only one role is allowed (e.g., pure student), don't show the switcher
  if (allowedRoles.length <= 1) return null

  return (
    <div className="flex items-center gap-1 rounded-full border border-white/10 bg-black/20 p-1">
      {allowedRoles.map(({ label, role }) => (
        <button
          key={role}
          onClick={() => setViewRole(role)}
          className={cx(
            'rounded-full px-3 py-1.5 text-[12px] font-medium transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50',
            viewRole === role
              ? 'bg-teal/15 text-teal shadow-[inset_0_0_0_1px_rgba(92,230,201,0.2)]'
              : 'text-graytext-mid hover:text-offwhite hover:bg-white/5'
          )}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
