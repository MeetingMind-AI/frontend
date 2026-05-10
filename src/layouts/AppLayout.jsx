import { useState, useEffect } from 'react'
import { NavLink, Link, Outlet } from 'react-router-dom'
import { mockPreviousMeetings } from '../mockData'
import { getMeetings } from '../api'
import { useDemoMode } from '../DemoContext'
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
  const { demo, toggle } = useDemoMode()
  const [recentMeetings, setRecentMeetings] = useState(demo ? mockPreviousMeetings : [])

  useEffect(() => {
    if (demo) { setRecentMeetings(mockPreviousMeetings); return }
    setRecentMeetings([])
    getMeetings()
      .then((data) => setRecentMeetings((data.meetings ?? []).map(meetingToCard)))
      .catch(() => {})
  }, [demo])

  const unreviewed = recentMeetings.filter((m) => !m.reviewed).length

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        {/* Logo */}
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

        {/* Primary nav */}
        <nav className="sidebar-nav">
          <p className="sidebar-nav-label">Navigation</p>

          <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            Dashboard
            {unreviewed > 0 && <span className="sidebar-badge">{unreviewed}</span>}
          </NavLink>

          <NavLink to="/kanban" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="5" height="18" rx="1" />
              <rect x="10" y="3" width="5" height="12" rx="1" />
              <rect x="17" y="3" width="5" height="15" rx="1" />
            </svg>
            Kanban
          </NavLink>

          <NavLink to="/parking-lot" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9 8h4a2 2 0 0 1 0 4H9V8z" />
              <line x1="9" y1="12" x2="9" y2="16" />
            </svg>
            Parking Lot
          </NavLink>

          <NavLink to="/schedule" className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            To Schedule
          </NavLink>
        </nav>

        {/* Recent meetings quick-list */}
        <div className="sidebar-recent">
          <p className="sidebar-nav-label">Recent Meetings</p>
          {recentMeetings.slice(0, 5).map((m) => (
            <Link to={`/review/${m.id}`} className="sidebar-recent-item" key={m.id}>
              <div className="sidebar-recent-avatars">
                {m.participants.slice(0, 2).map((p) => (
                  <div
                    key={p}
                    className="sidebar-recent-avatar"
                    style={{ background: speakerColor(p) }}
                    title={p}
                  >
                    {initials(p)}
                  </div>
                ))}
              </div>
              <div className="sidebar-recent-info">
                <div className="sidebar-recent-title">{m.title}</div>
                <div className="sidebar-recent-meta">
                  {m.date}
                  {!m.reviewed && <span className="sidebar-recent-dot" />}
                </div>
              </div>
            </Link>
          ))}
        </div>
        {/* Demo mode toggle */}
        <div className="sidebar-demo">
          <button
            className={`sidebar-demo-btn ${demo ? 'sidebar-demo-btn--on' : ''}`}
            onClick={toggle}
            title={demo ? 'Demo mode on — click to use real data' : 'Demo mode off — click to load sample data'}
          >
            <span className={`sidebar-demo-dot ${demo ? 'sidebar-demo-dot--on' : ''}`} />
            Demo Mode
            <span className="sidebar-demo-state">{demo ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>
    </div>
  )
}
