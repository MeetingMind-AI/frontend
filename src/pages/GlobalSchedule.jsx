import { useState, useEffect } from 'react'
import { mockAllKanbanTasks } from '../mockData'
import { getMeetings } from '../api'
import { useDemoMode } from '../DemoContext'
import { buildScheduleItems } from '../utils'
import './GlobalKanban.css'

const MOCK_DATES = ['May 7, 2026', 'May 9, 2026', 'May 14, 2026', 'May 19, 2026']

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
            {MOCK_DATES.map((d) => (
              <button
                key={d}
                className={`gk-date-option ${item.scheduledDate === d ? 'gk-date-option--selected' : ''}`}
                onClick={() => { onSchedule(item.id, d); setPickerOpen(false) }}
              >
                {d}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function GlobalSchedule() {
  const { demo } = useDemoMode()
  const [tasks, setTasks] = useState(
    demo ? mockAllKanbanTasks.filter((t) => t.type === 'schedule') : []
  )

  useEffect(() => {
    if (demo) {
      setTasks(mockAllKanbanTasks.filter((t) => t.type === 'schedule'))
      return
    }
    getMeetings()
      .then((data) => setTasks(buildScheduleItems(data.meetings ?? [])))
      .catch(() => {})
  }, [demo])
  const [filterMeeting, setFilterMeeting] = useState('all')

  const meetings = [...new Set(tasks.map((t) => t.meeting))]
  const visible = tasks.filter((t) => filterMeeting === 'all' || t.meeting === filterMeeting)

  const schedPending   = visible.filter((t) => t.schedule_status === 'pending')
  const schedScheduled = visible.filter((t) => t.schedule_status === 'scheduled')

  const scheduleItem = (id, scheduledDate) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, schedule_status: 'scheduled', scheduledDate } : t))
    )

  const removeItem = (id) => setTasks((prev) => prev.filter((t) => t.id !== id))

  return (
    <div className="gk-page">
      <div className="gk-page-header">
        <div>
          <h1 className="gk-page-title">To Schedule</h1>
          <p className="gk-page-sub">Meetings and follow-ups pending a date</p>
        </div>
        <div className="gk-header-right">
          <div className="gk-filters">
            <span className="gk-filter-label">Meeting</span>
            <select className="gk-select" value={filterMeeting} onChange={(e) => setFilterMeeting(e.target.value)}>
              <option value="all">All meetings</option>
              {meetings.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="gk-schedule-list">
        {schedPending.length > 0 && (
          <div className="gk-schedule-group">
            <div className="gk-schedule-group-label">
              Pending a date
              <span className="gk-schedule-group-count gk-schedule-group-count--warn">{schedPending.length}</span>
            </div>
            {schedPending.map((item) => (
              <ScheduleRow key={item.id} item={item} onSchedule={scheduleItem} onRemove={removeItem} />
            ))}
          </div>
        )}

        {schedScheduled.length > 0 && (
          <div className="gk-schedule-group">
            <div className="gk-schedule-group-label">
              Scheduled
              <span className="gk-schedule-group-count gk-schedule-group-count--green">{schedScheduled.length}</span>
            </div>
            {schedScheduled.map((item) => (
              <ScheduleRow key={item.id} item={item} onSchedule={scheduleItem} onRemove={removeItem} />
            ))}
          </div>
        )}

        {visible.length === 0 && (
          <div className="gk-schedule-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p>No meetings to schedule</p>
          </div>
        )}
      </div>
    </div>
  )
}
