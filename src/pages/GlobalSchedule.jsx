import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getAllActions } from '../api'
import { buildScheduleItems } from '../utils'
import './GlobalKanban.css'

function ScheduleRow({ item }) {
  return (
    <div className="gk-schedule-row">
      <div className="gk-schedule-row-left">
        <div className="gk-schedule-icon">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
      </div>

      <div className="gk-schedule-row-body">
        <p className="gk-schedule-row-title">{item.title}</p>
        <div className="gk-schedule-row-meta">
          <span>{item.meeting}</span>
        </div>
      </div>
    </div>
  )
}

export default function GlobalSchedule() {
  const { teamId } = useParams()
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    getAllActions(teamId)
      .then((data) => setTasks(buildScheduleItems(data)))
      .catch(() => {})
  }, [teamId])

  return (
    <div className="gk-page">
      <header className="gk-header">
        <h1 className="gk-title">Schedule</h1>
        <div className="gk-filters">
          <span className="gk-task-count">{tasks.length} items</span>
        </div>
      </header>

      {tasks.length > 0 && (
        <div className="gk-schedule-section">
          <h2 className="gk-schedule-section-title">To Schedule ({tasks.length})</h2>
          {tasks.map((t) => (
            <ScheduleRow key={t.id} item={t} />
          ))}
        </div>
      )}

      {tasks.length === 0 && (
        <div className="gk-col-empty" style={{ padding: '48px' }}>
          No items to schedule
        </div>
      )}
    </div>
  )
}
