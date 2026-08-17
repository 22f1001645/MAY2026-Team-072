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

interface NavItem {
  to: string
  label: string
  icon: ReactNode
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
    { to: '/events/ev-ekatva-hyd/manage', label: 'Registrations & Tasks', icon: <Icon d="M4 6h16M4 12h16M4 18h10" /> },
    { to: '/events/ev-hyd-coffee/expenses', label: 'Reimbursement', icon: <Icon d="M3 10h18M6 15h4M3 6h18v12H3z" /> },
    { to: '/events/ev-ekatva-hyd/checkin', label: 'Check-in', icon: <Icon d="m5 12 4 4L19 6" /> },
    { to: '/leaderboard', label: 'Leaderboard', icon: <Icon d="M6 21V10M12 21V4M18 21v-7" /> },
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

export default function Layout({ children }: { children: ReactNode }) {
  const { role, name, city, capabilities } = useSession()
  const { currentUser, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [editCityOpen, setEditCityOpen] = useState(false)
  const location = useLocation()

  // The first data-derived nav entry in this file. `NAV` stays a static
  // Record<Role, NavItem[]>; the organisation-profile entry is appended from
  // the capability the server computed, not from a new static role key —
  // whether it renders is a fact about this user, not about their login role.
  const manageableOrgIds = capabilities?.manageableOrgIds
  const nav = useMemo(() => {
    const base = NAV[role]
    if (!manageableOrgIds?.length) return base
    return [
      ...base,
      {
        to: `/orgs/${manageableOrgIds[0]}`,
        label: 'Organisation profile',
        icon: <Icon d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M4 21h16M9 8h2M9 12h2M9 16h2" />,
      },
    ]
  }, [role, manageableOrgIds])

  // The two home routes, and only those. 02-UI-SPEC S4 keeps the academic
  // status nudge off deep pages entirely; it is not a header strip.
  const isHomeRoute = location.pathname === '/discover' || location.pathname === '/organiser'

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const { data: notifications = [] } = useNotifications()
  const unreadCount = notifications.filter((n: any) => !n.read).length

  const { data: searchUsers = [] } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: () => api.users(searchQuery),
    enabled: role === 'admin' && searchQuery.trim().length >= 1,
  })

  const { data: allEvents = [] } = useQuery({
    queryKey: ['search-events'],
    queryFn: () => api.events(),
    enabled: searchQuery.trim().length >= 1,
  })

  const { data: allOrgs = [] } = useQuery({
    queryKey: ['search-orgs'],
    queryFn: () => api.orgs(),
    enabled: searchQuery.trim().length >= 1,
  })

  const filteredEvents = allEvents.filter(
    (e) =>
      e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredOrgs = allOrgs.filter(
    (o) =>
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (searchRef.current && !searchRef.current.contains(target)) {
        setSearchOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false)
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-onyx text-offwhite overflow-x-hidden">
      
      {/* Liquid Glass Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-white/5 bg-onyx/40 backdrop-blur-2xl shadow-[0_4px_30px_rgba(0,0,0,0.1)] px-5 py-3 lg:px-8">
        
        {/* Left: Branding */}
        <div className="flex items-center gap-2.5 z-20">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity focus:outline-none">
            <Mandala size={30} />
            <div className="hidden sm:block">
              <div className="text-[16px] font-bold leading-none tracking-wide text-offwhite">
                EKATVA<span className="text-teal"> OS</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Center: Desktop Nav */}
        <nav className="hidden lg:flex items-center gap-2 absolute left-1/2 -translate-x-1/2 z-10">
          <div className="empty:hidden">
            <ViewSwitcher />
          </div>
          {nav.map(item => (
            <NavLink 
              key={item.to} 
              to={item.to}
              className={({ isActive }) => 
                cx("px-4 py-2 rounded-full text-[13px] font-medium transition-all duration-300 focus:outline-none", 
                  isActive || location.pathname === item.to 
                    ? "bg-white/10 text-offwhite shadow-[0_2px_10px_rgba(0,0,0,0.1)]" 
                    : "text-graytext-light hover:text-offwhite hover:bg-white/5"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right: Tools & Profile */}
        <div className="flex items-center gap-3 z-20">
          
          {/* Global Search */}
          <div ref={searchRef} className="relative hidden md:block">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[13px] text-graytext-light focus-within:border-teal/50 focus-within:bg-black/40 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-graytext-mid">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                className="w-32 lg:w-48 bg-transparent text-[13px] text-offwhite placeholder:text-graytext-mid focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSearchOpen(false)
                  }}
                  className="text-graytext-mid hover:text-offwhite text-[12px] px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Global Search Dropdown */}
            {searchOpen && searchQuery.trim().length >= 1 && (
              <div className="absolute right-0 top-full mt-3 w-80 md:w-96 rounded-2xl border border-white/10 bg-onyx/95 p-3 shadow-2xl backdrop-blur-xl z-50 max-h-[70vh] overflow-y-auto space-y-3 animate-fade-down origin-top-right">
                {/* Events Section */}
                {filteredEvents.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-teal mb-1 px-2">Events ({filteredEvents.length})</div>
                    <div className="space-y-1">
                      {filteredEvents.slice(0, 3).map((evt) => (
                        <button
                          key={evt.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false)
                            navigate(`/events/${evt.id}`)
                          }}
                          className="w-full rounded-xl p-2 text-left hover:bg-white/5 transition-colors focus:outline-none"
                        >
                          <div className="text-[13px] font-semibold text-offwhite">{evt.title}</div>
                          <div className="text-[11px] text-graytext-light">{evt.city} · {evt.startsAt}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* People / Members Section */}
                {searchUsers.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-gold mb-1 px-2">People / Members ({searchUsers.length})</div>
                    <div className="space-y-1">
                      {searchUsers.slice(0, 3).map((usr) => (
                        <button
                          key={usr.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false)
                            if (role === 'admin') navigate('/admin/orgs')
                          }}
                          className="w-full rounded-xl p-2 text-left hover:bg-white/5 transition-colors focus:outline-none"
                        >
                          <div className="text-[13px] font-semibold text-offwhite">{usr.name}</div>
                          <div className="text-[11px] text-graytext-light">{usr.email} · {usr.city}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Organisations Section */}
                {filteredOrgs.length > 0 && (
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-1 px-2">Organisations ({filteredOrgs.length})</div>
                    <div className="space-y-1">
                      {filteredOrgs.slice(0, 3).map((org) => (
                        <button
                          key={org.id}
                          type="button"
                          onClick={() => {
                            setSearchOpen(false)
                            if (role === 'admin') navigate('/admin/orgs')
                            else navigate('/discover')
                          }}
                          className="w-full rounded-xl p-2 text-left hover:bg-white/5 transition-colors focus:outline-none"
                        >
                          <div className="text-[13px] font-semibold text-offwhite">{org.name}</div>
                          <div className="text-[11px] text-graytext-light">Type: {org.type}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {filteredEvents.length === 0 && searchUsers.length === 0 && filteredOrgs.length === 0 && (
                  <div className="p-4 text-center text-[13px] text-graytext-mid">No matching events, people, or orgs found.</div>
                )}
              </div>
            )}
          </div>
          
          {/* Notifications */}
          <div className="relative" ref={notificationsRef}>
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              aria-label="Notifications"
              className={cx(
                "group grid h-9 w-9 place-items-center rounded-full border transition-all duration-300 ease-out focus:outline-none",
                notificationsOpen
                  ? 'border-teal/50 bg-teal/10 text-teal shadow-[0_0_15px_rgba(63,212,182,0.3)] scale-105'
                  : 'border-white/10 bg-white/5 text-graytext-light hover:border-white/20 hover:bg-white/10 hover:text-offwhite hover:scale-105'
              )}
            >
              <svg 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill={notificationsOpen ? "currentColor" : (unreadCount > 0 ? "currentColor" : "none")} 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                className={cx(
                  "transition-transform duration-300 active:scale-90",
                  unreadCount > 0 && !notificationsOpen && "group-hover:animate-shake"
                )}
              >
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </button>
            {unreadCount > 0 && (
              <div className="absolute -right-1 -top-1 grid h-4 min-w-[16px] place-items-center rounded-full bg-teal px-1 ring-2 ring-onyx">
                <span className="text-[9px] font-bold text-onyx leading-none">{unreadCount > 9 ? '9+' : unreadCount}</span>
              </div>
            )}
            {notificationsOpen && (
              <NotificationsDropdown onClose={() => setNotificationsOpen(false)} />
            )}
          </div>

          {/* Profile Dropdown */}
          <div ref={profileRef} className="relative hidden lg:block ml-1">
            <button 
              onClick={() => setProfileOpen(!profileOpen)} 
              className={cx(
                "grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold transition-all focus:outline-none focus:ring-2 focus:ring-teal/50",
                role === 'admin' ? 'bg-gold/15 text-gold hover:ring-gold/50' : 'bg-teal/15 text-teal hover:ring-teal/50',
                profileOpen && (role === 'admin' ? 'ring-2 ring-gold/50' : 'ring-2 ring-teal/50')
              )}
            >
              {name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </button>
            {profileOpen && (
              <div className="absolute right-0 top-full mt-3 w-60 rounded-2xl border border-white/10 bg-onyx/95 p-2 shadow-2xl backdrop-blur-xl z-50 animate-fade-down origin-top-right">
                <div className="p-3 mb-1 border-b border-white/5">
                  <div className="truncate text-[14px] font-semibold text-offwhite">{name}</div>
                  <div className="truncate text-[12px] text-graytext-light mt-0.5">
                    {currentUser?.por ?? ROLE_LABEL[role]} · {city}
                  </div>
                </div>
                <button 
                  onClick={handleLogout} 
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors focus:outline-none"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
                  Sign out
                </button>
              </div>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="grid h-9 w-9 place-items-center rounded-full border border-white/10 bg-white/5 text-graytext-light hover:text-offwhite lg:hidden ml-1 transition-colors"
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
              <NavLink 
                key={item.to} 
                to={item.to} 
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
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-graytext-mid hover:bg-white/5 hover:text-red-400 focus:outline-none transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
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
    </div>
  )
}

function EditCityModal({
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
