import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { SessionProvider } from './lib/session'
import Layout from './components/Layout'


// Public
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
// Student
import Discover from './pages/Discover'
import EventDetail from './pages/EventDetail'
import MyRegistrations from './pages/MyRegistrations'
import Leaderboard from './pages/Leaderboard'
// Organiser
import OrganiserDashboard from './pages/OrganiserDashboard'
import ProposalNew from './pages/ProposalNew'
import ManageEvent from './pages/ManageEvent'
import Expenses from './pages/Expenses'
import CheckIn from './pages/CheckIn'
import CampaignBuilder from './pages/CampaignBuilder'
import KanbanWorkspace from './pages/KanbanWorkspace'
// Admin
import ApprovalQueue from './pages/ApprovalQueue'
import Reimbursements from './pages/Reimbursements'
import Analytics from './pages/Analytics'
import OrganiserAnalytics from './pages/OrganiserAnalytics'
import Orgs from './pages/Orgs'
import OrgProfile from './pages/OrgProfile'
import AdminSettings from './pages/AdminSettings'

/**
 * The one anonymously-renderable app path (OD-3, CAMPAIGN-04).
 *
 * A registration link is only shareable if a logged-out visitor can open it, so
 * `/events/<slug>` renders without a session. The pattern matches ONE segment
 * after `/events/` and nothing else: `/events/<id>/manage`, `/events/<id>/campaign`,
 * `/events/<id>/checkin`, `/events/<id>/expenses` and anything added later keep
 * the login redirect. Widening this to a prefix test would hand every organiser
 * sub-page to anonymous visitors in a single character (T-05-34).
 *
 * This decides only what RENDERS. The server decides what is allowed: the
 * anonymous detail payload omits budget, collaborators and team roster, and the
 * register endpoint stays behind @auth_required.
 */
export function isPublicEventPath(pathname: string): boolean {
  return /^\/events\/[^/]+$/.test(pathname)
}

// 3-tier loading: silent (0-600ms), spinner (>600ms), timeout (>8s)
function useBootLoader(loading: boolean) {
  const [tier, setTier] = useState<0 | 1 | 2>(0)

  useEffect(() => {
    if (!loading) {
      setTier(0)
      return
    }
    const t1 = setTimeout(() => setTier(1), 600)
    const t2 = setTimeout(() => setTier(2), 8000)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [loading])

  return tier
}

function RequireOrganiser({ children }: { children: React.ReactNode }) {
  const { currentUser, capabilities } = useAuth()
  if (!capabilities?.isOrganiser) return <Navigate to={currentUser?.role === 'admin' ? "/admin/approvals" : "/discover"} replace />
  return <>{children}</>
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()
  if (currentUser?.role !== 'admin') return <Navigate to="/discover" replace />
  return <>{children}</>
}

function RequireStudent({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth()
  if (currentUser?.role === 'admin') return <Navigate to="/admin/approvals" replace />
  return <>{children}</>
}

function FallbackRoute() {
  const { currentUser } = useAuth()
  return <Navigate to={currentUser?.role === 'admin' ? "/admin/approvals" : "/discover"} replace />
}

// Everything except public pages lives inside the app shell, behind auth.
function AppShell() {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  const bootTier = useBootLoader(loading)

  // Still resolving a stored token — don't bounce to login prematurely
  if (loading) {
    if (bootTier === 0) return null
    if (bootTier === 2) {
      return (
        <div className="grid min-h-screen place-items-center bg-onyx px-4">
          <div className="max-w-md text-center rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-red-400/30 bg-red-500/10 text-red-300">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
              </svg>
            </div>
            <h2 className="text-h3 font-semibold text-offwhite mb-2">Connection Timeout</h2>
            <p className="text-[14px] text-graytext-light mb-6">
              Ekatva OS is taking longer than expected to load. The server might be asleep or down.
            </p>
            <button onClick={() => window.location.reload()} className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-[13px] font-medium text-offwhite hover:bg-white/20 transition-colors">
              Reload page
            </button>
          </div>
        </div>
      )
    }
    return (
      <div className="grid min-h-screen place-items-center bg-onyx">
        <div className="flex flex-col items-center">
          <svg className="mb-4 animate-spin h-10 w-10 text-teal" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-[13px] font-medium text-graytext-mid animate-pulse">Waking up server...</div>
        </div>
      </div>
    )
  }

  // A shared registration link renders for a visitor with no session. Minimal
  // shell — no Layout, because the sidebar is a signed-in surface and its nav
  // would offer routes this visitor cannot reach.
  if (!currentUser && isPublicEventPath(location.pathname))
    return (
      <div className="min-h-screen bg-onyx px-6 py-8">
        <div className="mx-auto max-w-6xl">
          <Routes>
            <Route path="/events/:id" element={<EventDetail />} />
          </Routes>
        </div>
      </div>
    )

  // Protected routes: no session → bounce to login (remember where we were)
  if (!currentUser)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return (
    <Layout>
      <Routes>
        {/* Student */}
        <Route path="/discover" element={<RequireStudent><Discover /></RequireStudent>} />
        <Route path="/events/:id" element={<RequireStudent><EventDetail /></RequireStudent>} />
        <Route path="/me" element={<RequireStudent><MyRegistrations /></RequireStudent>} />
        <Route path="/leaderboard" element={<RequireStudent><Leaderboard /></RequireStudent>} />
        {/* Readable by anyone signed in; the editing surface inside it is gated
            on capabilities.manageableOrgIds. Registering it here rather than
            beside the public routes is what makes it protected for free. */}
        <Route path="/orgs/:orgId" element={<RequireStudent><OrgProfile /></RequireStudent>} />

        {/* Organiser */}
        <Route path="/organiser" element={<RequireOrganiser><OrganiserDashboard /></RequireOrganiser>} />
        <Route path="/proposals/new" element={<RequireOrganiser><ProposalNew /></RequireOrganiser>} />
        <Route path="/events/:id/manage" element={<RequireOrganiser><ManageEvent /></RequireOrganiser>} />
        <Route path="/events/:id/expenses" element={<RequireOrganiser><Expenses /></RequireOrganiser>} />
        <Route path="/checkin" element={<RequireOrganiser><CheckIn /></RequireOrganiser>} />
        <Route path="/events/:id/campaign" element={<RequireOrganiser><CampaignBuilder /></RequireOrganiser>} />
        <Route path="/events/:id/workspace" element={<RequireOrganiser><KanbanWorkspace /></RequireOrganiser>} />

        {/* Admin */}
        <Route path="/admin/approvals" element={<RequireAdmin><ApprovalQueue /></RequireAdmin>} />
        <Route path="/admin/reimbursements" element={<RequireAdmin><Reimbursements /></RequireAdmin>} />
        <Route path="/admin/analytics" element={<RequireAdmin><Analytics /></RequireAdmin>} />
        <Route path="/admin/organiser-analytics" element={<RequireAdmin><OrganiserAnalytics /></RequireAdmin>} />
        <Route path="/admin/orgs" element={<RequireAdmin><Orgs /></RequireAdmin>} />
        <Route path="/admin/settings" element={<RequireAdmin><AdminSettings /></RequireAdmin>} />

        <Route path="*" element={<FallbackRoute />} />
      </Routes>
    </Layout>
  )
}

function Root() {
  const location = useLocation()
  const isPublic = ['/', '/login', '/register'].includes(location.pathname)

  if (isPublic)
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    )

  return <AppShell />
}

export default function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <Root />
      </SessionProvider>
    </AuthProvider>
  )
}
