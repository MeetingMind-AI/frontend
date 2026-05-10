import { useState, useEffect } from 'react'
import { mockAllKanbanTasks } from '../mockData'
import { getMeetings } from '../api'
import { useDemoMode } from '../DemoContext'
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
  const { demo } = useDemoMode()
  const [tasks, setTasks] = useState(
    demo ? mockAllKanbanTasks.filter((t) => t.type === 'todo') : []
  )

  useEffect(() => {
    if (demo) {
      setTasks(mockAllKanbanTasks.filter((t) => t.type === 'todo'))
      return
    }
    setTasks([])
    getMeetings()
      .then((data) => setTasks(buildKanbanTasks(data.meetings ?? [])))
      .catch(() => {})
  }, [demo])
  const [dragOver, setDragOver] = useState(null)
  const [filterMeeting, setFilterMeeting] = useState('all')

  const meetings = [...new Set(tasks.map((t) => t.meeting))]
  const visibleTodo = tasks.filter((t) => filterMeeting === 'all' || t.meeting === filterMeeting)

  const moveTask = (id, kanban_status) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, kanban_status } : t)))

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('taskId', String(id))
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDrop = (e, kanban_status) => {
    e.preventDefault()
    const id = Number(e.dataTransfer.getData('taskId'))
    if (id) moveTask(id, kanban_status)
    setDragOver(null)
  }

  const counts = {
    todo:  visibleTodo.filter((t) => t.kanban_status === 'todo').length,
    doing: visibleTodo.filter((t) => t.kanban_status === 'doing').length,
    done:  visibleTodo.filter((t) => t.kanban_status === 'done').length,
  }

  return (
    <div className="gk-page">
      {/* Header */}
      <div className="gk-page-header">
        <div>
          <h1 className="gk-page-title">Workspace</h1>
          <p className="gk-page-sub">Tasks and meetings from all sessions</p>
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

      {/* Summary */}
      <div className="gk-summary">
        {COLS.map((col) => (
          <div className="gk-summary-stat" key={col.id}>
            <span className="gk-summary-num" style={{ color: col.accent }}>{counts[col.id]}</span>
            <span className="gk-summary-label">{col.label}</span>
          </div>
        ))}
        <div className="gk-summary-stat">
          <span className="gk-summary-num">{tasks.length}</span>
          <span className="gk-summary-label">Total</span>
        </div>
      </div>

      {/* 3-column kanban */}
      <div className="gk-board">
        {COLS.map((col) => {
          const colTasks = visibleTodo.filter((t) => t.kanban_status === col.id)
          return (
            <div
              key={col.id}
              className={`gk-col ${dragOver === col.id ? 'gk-col--dragover' : ''}`}
              style={{ '--col-accent': col.accent }}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.id) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="gk-col-header">
                <div className="gk-col-header-left">
                  <span className="gk-col-dot" style={{ background: col.accent }} />
                  <span className="gk-col-title">{col.label}</span>
                </div>
                <span className="gk-col-count">{colTasks.length}</span>
              </div>
              <div className="gk-col-cards">
                {colTasks.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    className="gk-drag-wrap"
                  >
                    <KanbanCard task={task} onMove={moveTask} />
                  </div>
                ))}
                {colTasks.length === 0 && (
                  <div className="gk-empty">Drop tasks here</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
