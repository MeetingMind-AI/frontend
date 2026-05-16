import { useState, useEffect } from 'react'
import { getMeetings } from '../api'
import { buildKanbanTasks } from '../utils'
import './GlobalKanban.css'

const COLS = [
  { id: 'todo',  label: 'To-Do',  accent: 'var(--accent)' },
  { id: 'doing', label: 'Doing',  accent: 'var(--orange)' },
  { id: 'done',  label: 'Done',   accent: 'var(--green)'  },
]

function KanbanCard({ task, onMove }) {
  return (
    <div className="gk-card">
      <div className="gk-card-meeting">{task.meeting}</div>
      <p className="gk-card-title">{task.title}</p>
      <div className="gk-card-footer">
        <span className="gk-card-date">{task.meetingDate}</span>
        <div className="gk-card-move">
          {task.kanban_status !== 'todo' && (
            <button
              className="gk-move-btn"
              onClick={() => onMove(task.id, task.kanban_status === 'doing' ? 'todo' : 'doing')}
              title="Move left"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          {task.kanban_status !== 'done' && (
            <button
              className="gk-move-btn gk-move-btn--forward"
              onClick={() => onMove(task.id, task.kanban_status === 'todo' ? 'doing' : 'done')}
              title="Move right"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GlobalKanban() {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    getMeetings()
      .then((data) => setTasks(buildKanbanTasks(data.meetings ?? [])))
      .catch(() => {})
  }, [])
  const [dragOver, setDragOver] = useState(null)
  const [filterMeeting, setFilterMeeting] = useState('all')

  const meetings = [...new Set(tasks.map((t) => t.meeting))]
  const visibleTodo = tasks.filter((t) => filterMeeting === 'all' || t.meeting === filterMeeting)

  const moveTask = (id, newStatus) =>
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, kanban_status: newStatus } : t))

  return (
    <div className="gk-page">
      <header className="gk-header">
        <h1 className="gk-title">Kanban</h1>
        <div className="gk-filters">
          <select
            className="gk-filter-select"
            value={filterMeeting}
            onChange={(e) => setFilterMeeting(e.target.value)}
          >
            <option value="all">All Meetings</option>
            {meetings.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <span className="gk-task-count">{tasks.length} tasks</span>
        </div>
      </header>

      <div className="gk-board">
        {COLS.map((col) => {
          const colTasks = visibleTodo.filter((t) => t.kanban_status === col.id)
          return (
            <div
              key={col.id}
              className={`gk-col ${dragOver === col.id ? 'gk-col--drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => setDragOver(null)}
            >
              <div className="gk-col-header">
                <span className="gk-col-title" style={{ color: col.accent }}>{col.label}</span>
                <span className="gk-col-count">{colTasks.length}</span>
              </div>
              <div className="gk-col-cards">
                {colTasks.length === 0 && (
                  <div className="gk-col-empty">No tasks</div>
                )}
                {colTasks.map((task) => (
                  <div key={task.id} draggable onDragStart={() => {}}>
                    <KanbanCard task={task} onMove={moveTask} />
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
