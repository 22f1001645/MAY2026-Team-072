import { useState, useRef, useEffect, type ReactNode } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSession } from '../lib/session'
import { useAuth } from '../lib/auth'
import { api } from '../lib/api'
import type { Role } from '../lib/types'
import { cx } from '../lib/format'
import { Mandala } from './ui'
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
    { to: '/notifications', label: 'Notifications', icon: <Icon d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /> },
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
  const { role, name, city } = useSession()
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const nav = NAV[role]

  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const notificationsRef = useRef<HTMLDivElement>(null)

  const { data: searchUsers = [] } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: () => api.users(searchQuery),
    enabled: searchQuery.trim().length >= 1,
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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false)
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
    <div className="min-h-screen lg:flex">
      {/* Sidebar */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-white/5 bg-brand-gradient transition-transform duration-300 ease-material lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-2.5 px-5 py-6">
          <Mandala size={34} />
          <div>
            <div className="text-[18px] font-bold leading-none tracking-wide text-offwhite">
              EKATVA<span className="text-teal"> OS</span>
            </div>
            <div className="text-[9px] uppercase tracking-[0.28em] text-gold">
              Unite · Inspire · Celebrate
            </div>
          </div>
        </div>

        <nav className="mt-2 flex-1 space-y-1 px-3">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-medium transition duration-200 ease-material focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50',
                  isActive || location.pathname === item.to
                    ? 'bg-teal/12 text-teal shadow-[inset_2px_0_0_#5CE6C9]'
                    : 'text-graytext-light hover:bg-white/5 hover:text-offwhite',
                )
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Signed-in identity + logout */}
        <div className="border-t border-white/5 p-3">
          <div className="flex items-center gap-3 rounded-xl bg-black/20 px-3 py-2.5">
            <div
              className={cx(
                'grid h-9 w-9 place-items-center rounded-full text-[14px] font-bold',
                role === 'admin' ? 'bg-gold/15 text-gold' : 'bg-teal/15 text-teal',
              )}
            >
              {name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-offwhite">{name}</div>
              <div className="truncate text-[11px] text-graytext-light">
                {currentUser?.por ?? ROLE_LABEL[role]} · {city}
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out"
              aria-label="Sign out"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-graytext-mid transition-colors hover:bg-white/5 hover:text-red-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main column */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/5 bg-onyx/80 px-5 py-3.5 backdrop-blur-xl lg:px-8">
          <button
            className="text-graytext-light lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Icon d="M4 6h16M4 12h16M4 18h16" />
          </button>
          <div ref={searchRef} className="relative hidden sm:block">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-[13px] text-graytext-light focus-within:border-teal/50 focus-within:bg-black/40">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-graytext-mid">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3-3" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search events, people, orgs…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setSearchOpen(true)
                }}
                onFocus={() => setSearchOpen(true)}
                className="w-48 bg-transparent text-[13px] text-offwhite placeholder:text-graytext-mid focus:outline-none md:w-64"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setSearchOpen(false)
                  }}
                  aria-label="Clear search"
                  className="text-graytext-mid hover:text-offwhite text-[12px] px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Global Search Dropdown */}
            {searchOpen && searchQuery.trim().length >= 1 && (
              <div className="absolute left-0 top-full mt-2 w-80 md:w-96 rounded-2xl border border-white/10 bg-onyx/95 p-3 shadow-2xl backdrop-blur-xl z-50 max-h-96 overflow-y-auto space-y-3">
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
                          className="w-full rounded-xl p-2 text-left hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
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
                          className="w-full rounded-xl p-2 text-left hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
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
                          className="w-full rounded-xl p-2 text-left hover:bg-white/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50"
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
          <div className="ml-auto flex items-center gap-3">
            <ViewSwitcher />
            <span className="hidden text-caption text-graytext-mid sm:block">
              v1 · City-meetup lifecycle
            </span>
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notifications"
                className={cx("grid h-9 w-9 place-items-center rounded-full border border-white/8 text-graytext-light hover:text-teal transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal/50", notificationsOpen ? 'bg-white/10 text-offwhite' : 'bg-white/5')}
              >
                <Icon d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              </button>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-teal ring-2 ring-onyx" />
              {notificationsOpen && (
                <NotificationsDropdown onClose={() => setNotificationsOpen(false)} />
              )}
            </div>
          </div>
        </header>

        <AcademicStatusBanner />

        <main className="relative flex-1 px-5 py-7 lg:px-8 lg:py-9">
          <div className="mx-auto max-w-6xl animate-fade-up">{children}</div>
        </main>

        <footer className="border-t border-white/5 px-5 py-5 text-center text-caption text-graytext-mid lg:px-8">
          Ekatva OS · CodeCrafters Team-072 · A community operating system for the
          IIT Madras BS ecosystem — <span className="text-gold">Unite. Inspire. Celebrate.</span>
        </footer>
      </div>
    </div>
  )
}
