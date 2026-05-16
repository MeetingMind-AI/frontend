import { useState, useEffect } from 'react'
import { getAllActions } from '../api'
import { buildKanbanTasks } from '../utils'
import './GlobalKanban.css'

export default function GlobalKanban() {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    getAllActions()
      .then((data) => setTasks(buildKanbanTasks(data)))
      .catch(() => {})
  }, [])

  return (
    <div className="gk-page">
      <header className="gk-header">
        <h1 className="gk-title">Kanban</h1>
        <div className="gk-filters">
          <span className="gk-task-count">{tasks.length} tasks</span>
        </div>
      </header>

      <div className="gk-board">
        <div className="gk-col">
          <div className="gk-col-header">
            <span className="gk-col-title" style={{ color: 'var(--accent)' }}>To-Do</span>
            <span className="gk-col-count">{tasks.length}</span>
          </div>
          <div className="gk-col-cards">
            {tasks.length === 0 && (
              <div className="gk-col-empty">No tasks</div>
            )}
            {tasks.map((task) => (
              <div key={task.id} className="gk-card">
                <div className="gk-card-meeting">{task.meeting}</div>
                <p className="gk-card-title">{task.title}</p>
                <div className="gk-card-footer">
                  <span className="gk-card-date">{task.meetingDate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}