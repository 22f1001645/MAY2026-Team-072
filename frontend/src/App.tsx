import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import { SessionProvider } from './lib/session'
import Layout from './components/Layout'
import { Mandala } from './components/ui'

// Public
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
// Student
import Discover from './pages/Discover'
import EventDetail from './pages/EventDetail'
import MyRegistrations from './pages/MyRegistrations'
import Leaderboard from './pages/Leaderboard'
import Notifications from './pages/Notifications'
// Organiser
import OrganiserDashboard from './pages/OrganiserDashboard'
import ProposalNew from './pages/ProposalNew'
import ManageEvent from './pages/ManageEvent'
import Expenses from './pages/Expenses'
import CheckIn from './pages/CheckIn'
import CampaignBuilder from './pages/CampaignBuilder'
// Admin
import ApprovalQueue from './pages/ApprovalQueue'
import Reimbursements from './pages/Reimbursements'
import Analytics from './pages/Analytics'
import OrganiserAnalytics from './pages/OrganiserAnalytics'
import Orgs from './pages/Orgs'
import OrgProfile from './pages/OrgProfile'
import AdminSettings from './pages/AdminSettings'

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
          <div className="mb-4 animate-spin-slow">
            <Mandala size={44} />
          </div>
          <div className="text-[13px] font-medium text-graytext-mid animate-pulse">Waking up server...</div>
        </div>
      </div>
    )
  }

  // Protected routes: no session → bounce to login (remember where we were)
  if (!currentUser)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return (
    <Layout>
      <Routes>
        {/* Student */}
        <Route path="/discover" element={<Discover />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/me" element={<MyRegistrations />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/notifications" element={<Notifications />} />
        {/* Readable by anyone signed in; the editing surface inside it is gated
            on capabilities.manageableOrgIds. Registering it here rather than
            beside the public routes is what makes it protected for free. */}
        <Route path="/orgs/:orgId" element={<OrgProfile />} />

        {/* Organiser */}
        <Route path="/organiser" element={<OrganiserDashboard />} />
        <Route path="/proposals/new" element={<ProposalNew />} />
        <Route path="/events/:id/manage" element={<ManageEvent />} />
        <Route path="/events/:id/expenses" element={<Expenses />} />
        <Route path="/events/:id/checkin" element={<CheckIn />} />
        <Route path="/events/:id/campaign" element={<CampaignBuilder />} />

        {/* Admin */}
        <Route path="/admin/approvals" element={<ApprovalQueue />} />
        <Route path="/admin/reimbursements" element={<Reimbursements />} />
        <Route path="/admin/analytics" element={<Analytics />} />
        <Route path="/admin/organiser-analytics" element={<OrganiserAnalytics />} />
        <Route path="/admin/orgs" element={<Orgs />} />
        <Route path="/admin/settings" element={<AdminSettings />} />

        <Route path="*" element={<Navigate to="/discover" replace />} />
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
