import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import GlobalKanban from './pages/GlobalKanban'
import GlobalParkingLot from './pages/GlobalParkingLot'
import GlobalSchedule from './pages/GlobalSchedule'
import Live from './pages/Live'
import Review from './pages/Review'
import Login from './pages/Login'
import Teams from './pages/Teams'
import Settings from './pages/Settings'
import JoinTeam from './pages/JoinTeam'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { user } = useAuth()
  if (user === undefined) return null
  if (user) return <Navigate to="/teams" replace />
  return children
}

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
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="/teams/:teamId/live/:meetingId" element={<ProtectedRoute><Live /></ProtectedRoute>} />
      <Route path="/teams/:teamId/review/:meetingId?" element={<ProtectedRoute><Review /></ProtectedRoute>} />
      <Route path="/" element={<Navigate to="/teams" replace />} />
      <Route path="*" element={<Navigate to="/teams" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
