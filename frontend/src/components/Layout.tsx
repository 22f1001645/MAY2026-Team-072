import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '../lib/session'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import { useNotifications, useUpdateProfile } from '../lib/queries'
import type { Role } from '../lib/types'
import { cx } from '../lib/format'
import { Button, Card, Input, Mandala } from './ui'
import NotificationsDropdown from './NotificationsDropdown'
import ViewSwitcher from './ViewSwitcher'
import AcademicStatusBanner from './AcademicStatusBanner'
import { ProfileModal } from './ProfileModal'
import { GlobalEventChatModal } from './GlobalEventChatModal'

interface NavItem {
  to?: string
  label: string
  icon?: ReactNode
  subItems?: { to: string; label: string; icon: ReactNode }[]
}

// Navigation is a function of the POR, not the login (PRD P3 / §15 IA)
const NAV: Record<Role, NavItem[]> = {
  student: [
    { to: '/discover', label: 'Discover', icon: <Icon d="M12 2 4 7v10l8 5 8-5V7z" /> },
    { to: '/me', label: 'My Registrations', icon: <Icon d="M4 6h16M4 12h16M4 18h10" /> },
    { to: '/leaderboard', label: 'Leaderboard', icon: <Icon d="M6 21V10M12 21V4M18 21v-7" /> },
  ],
  organiser: [
    { to: '/organiser', label: 'Dashboard', icon: <Icon d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" /> },
    { to: '/proposals/new', label: 'New Proposal', icon: <Icon d="M12 5v14M5 12h14" /> },
    {
      label: 'Organiser Hub',
      subItems: [
        { to: '/events/ev-ekatva-hyd/manage', label: 'Registrations & Tasks', icon: <Icon d="M4 6h16M4 12h16M4 18h10" /> },
        { to: '/events/ev-hyd-coffee/expenses', label: 'Reimbursement', icon: <Icon d="M3 10h18M6 15h4M3 6h18v12H3z" /> },
        { to: '/checkin', label: 'Check-in', icon: <Icon d="m5 12 4 4L19 6" /> },
      ]
    },
  ],
  admin: [
    { to: '/admin/approvals', label: 'Approval Queue', icon: <Icon d="m9 11 3 3 8-8M4 12v6a2 2 0 0 0 2 2h12" /> },
    { to: '/admin/reimbursements', label: 'Reimbursements', icon: <Icon d="M3 10h18M6 15h4M3 6h18v12H3z" /> },
    { to: '/admin/analytics', label: 'Community Analytics', icon: <Icon d="M6 21V10M12 21V4M18 21v-7" /> },
    { to: '/admin/organiser-analytics', label: 'Organiser Analytics', icon: <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" /> },
    { to: '/admin/orgs', label: 'Orgs, PORs & Cities', icon: <Icon d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" /> },
    { to: '/admin/settings', label: 'System Settings', icon: <Icon d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" /> },
  ],
}

function Icon({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  )
}

const ROLE_LABEL: Record<Role, string> = {
  student: 'Student',
  organiser: 'Organiser · RC',
  admin: 'Admin',
}

function NavDropdown({ item }: { item: NavItem }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const location = useLocation()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const isActive = item.subItems?.some(s => location.pathname === s.to)

  return (
    <div className="relative" ref={ref}>
      <button 
        onClick={() => setOpen(!open)}
        className={cx("whitespace-nowrap flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-200 focus:outline-none", 
          isActive 
            ? "bg-white/10 text-offwhite" 
            : "text-graytext-light hover:text-offwhite hover:bg-white/5",
          open && "text-offwhite bg-white/5"
        )}
      >
        {item.label}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={cx("transition-transform duration-200", open && "rotate-180")}>
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
        {open && (
          <div className="absolute top-full left-0 mt-1.5 w-48 rounded-lg border border-white/10 bg-[#111] p-1 shadow-[0_4px_24px_rgba(0,0,0,0.5)] z-50 animate-fade-down origin-top-left">
            {item.subItems?.map(sub => (
              <Link
                key={sub.to}
                to={sub.to}
                onClick={() => setOpen(false)}
                className={cx("flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors focus:outline-none", 
                  location.pathname === sub.to
                    ? "bg-white/10 text-offwhite"
                    : "text-graytext-mid hover:bg-white/5 hover:text-offwhite"
                )}
              >
                <div className="flex-shrink-0 text-current opacity-70">{sub.icon}</div>
                <span className="truncate">{sub.label}</span>
              </Link>
            ))}
          </div>
        )}
    </div>
  )
}


export default function Layout({ children }: { children: ReactNode }) {
  const { role, name, city, capabilities } = useSession()
  const { currentUser, logout, refreshUser, isLoggingOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [editCityOpen, setEditCityOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const location = useLocation()

  // The first data-derived nav entry in this file. `NAV` stays a static
  // Record<Role, NavItem[]>; the organisation-profile entry is appended from
  // the capability the server computed, not from a new static role key —
  // whether it renders is a fact about this user, not about their login role.
  const manageableOrgIds = capabilities?.manageableOrgIds
  const nav = useMemo(() => {
    const base = NAV[role]
    if (!manageableOrgIds?.length || role === 'student') return base
    return [
      ...base,
      {
        to: `/orgs/${manageableOrgIds[0]}`,
        label: 'Organisation profile',
        icon: <Icon d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M4 21h16M9 8h2M9 12h2M9 16h2" />,
      } as NavItem,
    ]
  }, [role, manageableOrgIds])

  // The two home routes, and only those. 02-UI-SPEC S4 keeps the academic
  // status nudge off deep pages entirely; it is not a header strip.
  const isHomeRoute = location.pathname === '/discover' || location.pathname === '/organiser'

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const { data: notifications = [] } = useNotifications(role)
  const unreadCount = notifications.filter((n: any) => !n.read).length

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
  }

  return (
    <div className="min-h-screen flex flex-col bg-onyx text-offwhite overflow-x-hidden">
      
      {/* Liquid Glass Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 bg-onyx/90 backdrop-blur-md px-5 py-3 lg:px-6">
        
        {/* Left: Branding & Navigation */}
        <div className="flex items-center gap-6 z-20">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none">
            <Mandala size={26} />
            <div className="hidden sm:block">
              <div className="text-[14px] font-bold tracking-wide text-offwhite">
                EKATVA<span className="text-teal"> OS</span>
              </div>
            </div>
          </Link>

          <div className="hidden lg:block w-px h-5 bg-white/10" />

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {nav.map(item => (
              item.subItems ? (
                <NavDropdown key={item.label} item={item} />
              ) : (
                <NavLink 
                  key={item.to!} 
                  to={item.to!}
                  className={({ isActive }) => 
                    cx("whitespace-nowrap px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors duration-200 focus:outline-none", 
                      isActive || location.pathname === item.to 
                        ? "bg-white/10 text-offwhite" 
                        : "text-graytext-light hover:text-offwhite hover:bg-white/5"
                    )
                  }
                >
                  {item.label}
                </NavLink>
              )
            ))}
          </nav>
        </div>

        {/* Right: Tools & Profile */}
        <div className="flex items-center gap-4 z-20">
          
          <div className="empty:hidden flex items-center">
            <ViewSwitcher />
            {capabilities?.isOrganiser && (
              <div className="w-px h-5 bg-white/10 ml-2 mr-0" />
            )}
          </div>
          
          {/* Notifications */}
          <div className="relative flex items-center" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
              className={cx(
                "group flex h-8 w-8 items-center justify-center rounded-md border border-transparent transition-all duration-200 focus:outline-none",
                notificationsOpen
                  ? 'bg-white/10 text-offwhite'
                  : 'text-graytext-mid hover:bg-white/5 hover:text-offwhite'
              )}
            >
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill={notificationsOpen ? "currentColor" : (unreadCount > 0 ? "currentColor" : "none")} 
                stroke="currentColor" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={cx(
                  "transition-transform duration-300",
                  unreadCount > 0 && !notificationsOpen && "group-hover:animate-shake"
                )}
              >
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </button>
            {unreadCount > 0 && (
              <div className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-teal px-1 ring-2 ring-onyx">
                <span className="text-[10px] font-bold text-onyx leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </div>
            )}
            {notificationsOpen && (
              <NotificationsDropdown onClose={() => setNotificationsOpen(false)} />
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative hidden lg:block">
            <button 
              onClick={() => setProfileModalOpen(true)} 
              className={cx(
                "flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-bold transition-all focus:outline-none ring-2 ring-transparent",
                role === 'admin' ? 'bg-gold/20 text-gold hover:ring-gold/40' : 'bg-teal/20 text-teal hover:ring-teal/40',
                profileModalOpen && (role === 'admin' ? 'ring-gold/60' : 'ring-teal/60')
              )}
            >
              {name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/5 text-graytext-light hover:text-offwhite lg:hidden transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Icon d="M4 6h16M4 12h16M4 18h16" />
          </button>
        </div>
      </header>

      {/* Mobile Nav Overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-onyx/95 backdrop-blur-xl lg:hidden flex flex-col animate-[fadeIn_0.2s_ease-out]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Mandala size={30} />
              <div className="text-[16px] font-bold leading-none tracking-wide text-offwhite">
                EKATVA<span className="text-teal"> OS</span>
              </div>
            </div>
            <button 
              onClick={() => setMobileOpen(false)} 
              className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-graytext-light hover:text-offwhite transition-colors"
            >
              ✕
            </button>
          </div>
          
          <nav className="flex-1 overflow-y-auto p-5 space-y-2">
            {nav.map(item => (
              item.subItems ? (
                <div key={item.label} className="space-y-1">
                  <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-graytext-mid mt-2">{item.label}</div>
                  {item.subItems.map(sub => (
                    <NavLink 
                      key={sub.to} 
                      to={sub.to} 
                      onClick={() => setMobileOpen(false)} 
                      className={({ isActive }) => 
                        cx(
                          'flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition duration-200 focus:outline-none',
                          isActive || location.pathname === sub.to
                            ? 'bg-teal/10 text-teal shadow-[inset_2px_0_0_#5CE6C9]'
                            : 'text-graytext-light hover:bg-white/5 hover:text-offwhite',
                        )
                      }
                    >
                      {sub.icon} {sub.label}
                    </NavLink>
                  ))}
                </div>
              ) : (
                <NavLink 
                  key={item.to!} 
                  to={item.to!} 
                  onClick={() => setMobileOpen(false)} 
                  className={({ isActive }) => 
                    cx(
                      'flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition duration-200 focus:outline-none',
                      isActive || location.pathname === item.to
                        ? 'bg-teal/10 text-teal shadow-[inset_2px_0_0_#5CE6C9]'
                        : 'text-graytext-light hover:bg-white/5 hover:text-offwhite',
                    )
                  }
                >
                  {item.icon} {item.label}
                </NavLink>
              )
            ))}
          </nav>
          
          <div className="border-t border-white/5 p-5 bg-black/20">
            <div className="flex items-center gap-3">
              <div
                className={cx(
                  'grid h-10 w-10 place-items-center rounded-full text-[14px] font-bold',
                  role === 'admin' ? 'bg-gold/15 text-gold' : 'bg-teal/15 text-teal',
                )}
              >
                {name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold text-offwhite">{name}</div>
                <div className="truncate text-[12px] text-graytext-light">
                  {currentUser?.por ?? ROLE_LABEL[role]} · {city}
                </div>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-graytext-mid hover:bg-white/5 hover:text-red-400 focus:outline-none transition-colors disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="relative flex-1 px-5 py-7 lg:px-8 lg:py-9">
        <div className="mx-auto max-w-7xl animate-fade-up">
          {isHomeRoute && <AcademicStatusBanner />}
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/5 px-5 py-6 text-center text-[13px] text-graytext-mid lg:px-8">
        Ekatva OS · CodeCrafters Team-072 · A community operating system for the
        IIT Madras BS ecosystem — <span className="text-gold">Unite. Inspire. Celebrate.</span>
      </footer>

      {editCityOpen && (
        <EditCityModal
          currentCity={city}
          onClose={() => setEditCityOpen(false)}
          onSaved={refreshUser}
        />
      )}

      <ProfileModal 
        isOpen={profileModalOpen} 
        onClose={() => setProfileModalOpen(false)} 
      />
      <GlobalEventChatModal />
    </div>
  )
}

export function EditCityModal({
  currentCity,
  onClose,
  onSaved,
}: {
  currentCity: string
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [city, setCity] = useState(currentCity)
  const updateMutation = useUpdateProfile()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!city.trim()) return
    updateMutation.mutate(
      { city },
      {
        onSuccess: async () => {
          await onSaved()
          onClose()
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-sm p-6 border-teal/20">
        <h2 className="mb-4 text-h3 font-bold text-offwhite">Edit city</h2>
        <form onSubmit={submit} className="space-y-4">
          <Input value={city} onChange={(e: any) => setCity(e.target.value)} disabled={updateMutation.isPending} />
          {updateMutation.isError && (
            <p className="text-caption text-red-300">{(updateMutation.error as Error).message}</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={onClose} disabled={updateMutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
