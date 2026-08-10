import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
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
// Admin
import ApprovalQueue from './pages/ApprovalQueue'
import Reimbursements from './pages/Reimbursements'
import Analytics from './pages/Analytics'
import Orgs from './pages/Orgs'
import Users from './pages/Users'
import PorDirectory from './pages/PorDirectory'

// Everything except public pages lives inside the app shell, behind auth.
function AppShell() {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  // Still resolving a stored token — don't bounce to login prematurely
  if (loading)
    return (
      <div className="grid min-h-screen place-items-center bg-onyx">
        <div className="animate-spin-slow">
          <Mandala size={48} />
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
        <Route path="/discover" element={<Discover />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/me" element={<MyRegistrations />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/notifications" element={<Notifications />} />

        {/* Organiser */}
        <Route path="/organiser" element={<OrganiserDashboard />} />
        <Route path="/proposals/new" element={<ProposalNew />} />
        <Route path="/events/:id/manage" element={<ManageEvent />} />
        <Route path="/events/:id/expenses" element={<Expenses />} />
        <Route path="/events/:id/checkin" element={<CheckIn />} />

        {/* Admin */}
        <Route path="/admin/approvals" element={<ApprovalQueue />} />
        <Route path="/admin/reimbursements" element={<Reimbursements />} />
        <Route path="/admin/analytics" element={<Analytics />} />
        <Route path="/admin/orgs" element={<Orgs />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/pors" element={<PorDirectory />} />

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
      <Root />
    </AuthProvider>
  )
}
