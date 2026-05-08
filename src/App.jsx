import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import Dashboard from './pages/Dashboard'
import GlobalKanban from './pages/GlobalKanban'
import GlobalParkingLot from './pages/GlobalParkingLot'
import GlobalSchedule from './pages/GlobalSchedule'
import Live from './pages/Live'
import Review from './pages/Review'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="kanban" element={<GlobalKanban />} />
        <Route path="parking-lot" element={<GlobalParkingLot />} />
        <Route path="schedule" element={<GlobalSchedule />} />
      </Route>
      <Route path="/live" element={<Live />} />
      <Route path="/review" element={<Review />} />
    </Routes>
  )
}

export default App
