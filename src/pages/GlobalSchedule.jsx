import { useState, useEffect } from 'react'
import { getAllActions, updateAction } from '../api'
import { buildScheduleItems } from '../utils'
import './GlobalKanban.css'

function ScheduleRow({ item, onSchedule, onRemove }) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const isScheduled = item.schedule_status === 'scheduled'

  return (
    <div className={`gk-schedule-row ${isScheduled ? 'gk-schedule-row--scheduled' : ''}`}>
      <div className="gk-schedule-row-left">
        <div className={`gk-schedule-icon ${isScheduled ? 'gk-schedule-icon--done' : ''}`}>
          {isScheduled ? (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          )}
        </div>
      </div>

      <div className="gk-schedule-row-body">
        <p className="gk-schedule-row-title">{item.title}</p>
        <div className="gk-schedule-row-meta">
          <span>{item.meeting}</span>
          {isScheduled && item.scheduledDate && (
            <span className="gk-schedule-date-badge">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {item.scheduledDate}
            </span>
          )}
        </div>
      </div>

      <div className="gk-schedule-row-actions">
        {isScheduled ? (
          <button className="gk-sched-btn gk-sched-btn--reschedule" onClick={() => setPickerOpen((v) => !v)}>
            Reschedule
          </button>
        ) : (
          <button className="gk-sched-btn gk-sched-btn--schedule" onClick={() => setPickerOpen((v) => !v)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Schedule
          </button>
        )}
        <button className="gk-sched-btn gk-sched-btn--remove" onClick={() => onRemove(item.id)} title="Remove">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {pickerOpen && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setPickerOpen(false)} />
          <div className="gk-date-picker" style={{ zIndex: 10 }}>
            <p className="gk-date-picker-label">Pick a date</p>
            <input
              type="date"
              className="gk-date-input"
              onChange={(e) => {
                if (e.target.value) {
                  onSchedule(item.id, item.meeting_id, e.target.value)
                  setPickerOpen(false)
                }
              }}
              autoFocus
            />
          </div>
        </>
      )}
    </div>
  )
}

export default function GlobalSchedule() {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    getAllActions()
      .then((data) => setTasks(buildScheduleItems(data)))
      .catch(() => {})
  }, [])
  const schedPending   = tasks.filter((t) => t.schedule_status === 'pending')
  const schedScheduled = tasks.filter((t) => t.schedule_status === 'scheduled')

  const scheduleItem = async (id, meeting_id, date) => {
    try {
      await updateAction(meeting_id, id, undefined, undefined, date)
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, schedule_status: 'scheduled', scheduledDate: date } : t))
      )
    } catch (e) {
      console.warn('[Schedule] failed to schedule:', e)
    }
  }

  const removeItem = (id) =>
    setTasks((prev) => prev.filter((t) => t.id !== id))

  return (
    <div className="gk-page">
      <header className="gk-header">
        <h1 className="gk-title">Schedule</h1>
        <div className="gk-filters">
          <span className="gk-task-count">{tasks.length} items</span>
        </div>
      </header>

      {schedPending.length > 0 && (
        <div className="gk-schedule-section">
          <h2 className="gk-schedule-section-title">To Schedule ({schedPending.length})</h2>
          {schedPending.map((t) => (
            <ScheduleRow key={t.id} item={t} onSchedule={scheduleItem} onRemove={removeItem} />
          ))}
        </div>
      )}

      {schedScheduled.length > 0 && (
        <div className="gk-schedule-section">
          <h2 className="gk-schedule-section-title">Scheduled ({schedScheduled.length})</h2>
          {schedScheduled.map((t) => (
            <ScheduleRow key={t.id} item={t} onSchedule={scheduleItem} onRemove={removeItem} />
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