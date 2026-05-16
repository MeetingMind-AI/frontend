import { useState, useEffect } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import { getMeetings } from '../api'
import { meetingToCard } from '../utils'
import './AppLayout.css'

function speakerColor(name) {
  const colors = ['#4f8ef7', '#3fb950', '#bc8cff', '#d29922', '#e3884c', '#f85149']
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return colors[hash % colors.length]
}

function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase()
}

export default function AppLayout() {
  const [recentMeetings, setRecentMeetings] = useState([])

  useEffect(() => {
    getMeetings()
      .then((data) => setRecentMeetings((data.meetings ?? []).map(meetingToCard)))
      .catch(() => {})
  }, [])

  const unreviewed = recentMeetings.filter((m) => !m.reviewed).length

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
            <polygon
              points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5"
              fill="none"
              stroke="#4f8ef7"
              strokeWidth="1.5"
            />
            <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
          </svg>
          <span>MeetingMind</span>
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-nav-label">Navigation</p>

          <NavLink to="/" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`} end>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Dashboard
            {unreviewed > 0 && <span className="sidebar-badge">{unreviewed}</span>}
          </NavLink>

          <NavLink to="/kanban" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Kanban
          </NavLink>

          <NavLink to="/schedule" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Schedule
          </NavLink>

          <NavLink to="/parking-lot" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Parking Lot
          </NavLink>
        </nav>

        <div className="sidebar-recent">
          <p className="sidebar-nav-label">Recent Meetings</p>
          {recentMeetings.slice(0, 5).map((m) => (
            <Link key={m.id} to={`/review/${m.id}`} className="sidebar-recent-item">
              <div
                className="sidebar-recent-avatar"
                style={{ background: speakerColor(m.title) }}
              >
                {initials(m.title)}
              </div>
              <div className="sidebar-recent-info">
                <span className="sidebar-recent-title">{m.title}</span>
                <span className="sidebar-recent-date">
                  {m.date}
                  {!m.reviewed && <span className="sidebar-recent-dot" />}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
