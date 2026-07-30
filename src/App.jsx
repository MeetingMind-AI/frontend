/**
 * @file App.jsx
 * @description Main application routing layout and authentication guard configuration for MeetingMind-AI.
 */

import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import GlobalKanban from './pages/GlobalKanban'
import GlobalParkingLot from './pages/GlobalParkingLot'
import GlobalSchedule from './pages/GlobalSchedule'
import GlobalArchive from './pages/GlobalArchive'
import Live from './pages/Live'
import Review from './pages/Review'
import Login from './pages/Login'
import Teams from './pages/Teams'
import Settings from './pages/Settings'
import JoinTeam from './pages/JoinTeam'
import MiniPopup from './pages/MiniPopup'

/**
 * Route guard component that restricts access to authenticated users.
 * Redirects unauthenticated users to the /login page.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Protected child route elements
 */
function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

/**
 * Route guard component for public pages (e.g. Login).
 * Redirects authenticated users away from public pages to /teams.
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Public child route elements
 */
function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) return null
  if (user) return <Navigate to="/teams" replace />
  return children
}

/**
 * Main application routing declaration.
 * Defines public, team-scoped, live meeting, and review routes.
 */
function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/teams" element={<ProtectedRoute><Teams /></ProtectedRoute>} />
      <Route path="/join/:inviteToken" element={<ProtectedRoute><JoinTeam /></ProtectedRoute>} />
      <Route path="/teams/:teamId" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="kanban" element={<GlobalKanban />} />
        <Route path="parking-lot" element={<GlobalParkingLot />} />
        <Route path="schedule" element={<GlobalSchedule />} />
        <Route path="archive" element={<GlobalArchive />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="/teams/:teamId/live/:meetingId" element={<ProtectedRoute><Live /></ProtectedRoute>} />
      <Route path="/teams/:teamId/review/:meetingId?" element={<ProtectedRoute><Review /></ProtectedRoute>} />
      <Route path="/popup" element={<ProtectedRoute><MiniPopup /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/teams" replace />} />
      <Route path="*" element={<Navigate to="/teams" replace />} />
    </Routes>
  )
}

/**
 * Root React App component wrapped with AuthProvider context.
 */
export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

