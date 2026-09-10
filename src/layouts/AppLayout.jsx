/**
 * @file AppLayout.jsx
 * @description Main application layout wrapper featuring sidebar navigation, team selector, user menu, and nested route Outlet.
 */

import { useState, useEffect, useRef } from 'react'
import { NavLink, Link, Outlet, useParams, useNavigate } from 'react-router-dom'
import { getMeetings, getTeam, getTeams } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { meetingToCard } from '../utils'
import QuickstartModal from '../components/QuickstartModal'
import ProfileModal from '../components/ProfileModal'
import TeamSetupModal from '../components/TeamSetupModal'
import SystemStatusTracker from '../components/SystemStatusTracker'
import './AppLayout.css'

/**
 * Returns a consistent hex color string for a given speaker name.
 *
 * @param {string} name - Speaker full name.
 * @returns {string} Hex color string.
 */
function speakerColor(name) {
  const colors = ['#4f8ef7', '#3fb950', '#bc8cff', '#d29922', '#e3884c', '#f85149']
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return colors[hash % colors.length]
}

/**
 * Generates 1-2 character uppercase initials from a name string.
 *
 * @param {string} name - User or team name.
 * @returns {string} Uppercase initials.
 */
function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

/**
 * Main AppLayout component.
 * Renders the top header, sidebar navigation items, team selector dropdown, user avatar menu, and outlet views.
 */
export default function AppLayout() {
  const { teamId } = useParams()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [recentMeetings, setRecentMeetings] = useState([])
  const [team, setTeam] = useState(null)
  const [teamNotFound, setTeamNotFound] = useState(false)
  const [allTeams, setAllTeams] = useState([])
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showQuickstart, setShowQuickstart] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showTeamSetup, setShowTeamSetup] = useState(false)
  const userMenuRef = useRef(null)

  useEffect(() => {
    if (user?.id) {
      const quickstartDismissed = localStorage.getItem(`mm_quickstart_dismissed_${user.id}`)
      const legacyDone = localStorage.getItem(`mm_user_setup_completed_${user.id}`)
      if (!quickstartDismissed && !legacyDone) {
        setShowQuickstart(true)
      }
    }
  }, [user?.id])

  useEffect(() => {
    if (teamId && user?.id && team && !showQuickstart) {
      const teamDone = localStorage.getItem(`mm_team_setup_completed_${user.id}_${teamId}`)
      if (!teamDone) {
        setShowTeamSetup(true)
      }
    }
  }, [teamId, user?.id, team, showQuickstart])


  useEffect(() => {
    getMeetings(teamId)
      .then((data) => setRecentMeetings((data || []).map(meetingToCard)))
      .catch(() => {})
  }, [teamId])

  useEffect(() => {
    setTeamNotFound(false)
    getTeam(teamId)
      .then(setTeam)
      .catch(() => setTeamNotFound(true))
  }, [teamId])

  useEffect(() => {
    getTeams()
      .then((data) => setAllTeams(data.teams ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const unreviewed = recentMeetings.filter((m) => !m.reviewed).length
  const isOwner = team && user && team.owner_id === user.id
  const base = `/teams/${teamId}`

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (teamNotFound) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '12px', color: 'var(--text-2)' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-1)', margin: 0 }}>404 — Team not found</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-3)', margin: 0 }}>This team doesn't exist or you don't have access to it.</p>
        <button
          onClick={() => navigate('/teams')}
          style={{ marginTop: '8px', padding: '8px 20px', borderRadius: 'var(--radius)', background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 600 }}
        >
          Back to my teams
        </button>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-logo">
          <span
            className="sidebar-logo-icon"
            style={{ cursor: 'pointer' }}
            title="Refresh dashboard"
            onClick={() => { window.location.href = `/teams/${teamId}` }}
          >
            <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
              <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#4f8ef7" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
            </svg>
          </span>
          <div className="sidebar-logo-text">
            <span className="sidebar-app-name">MeetingMind</span>
            {team && <span className="sidebar-team-chip">{team.name}</span>}
          </div>
          {team && (
            <Link to={`${base}/settings`} className="sidebar-settings-link" title="Team settings">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          )}
        </div>

        <nav className="sidebar-nav">
          <p className="sidebar-nav-label">Navigation</p>

          <NavLink to={base} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`} end>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Dashboard
            {unreviewed > 0 && <span className="sidebar-badge">{unreviewed}</span>}
          </NavLink>

          <NavLink to={`${base}/kanban`} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 11 12 14 22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Kanban
          </NavLink>

          <NavLink to={`${base}/schedule`} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Schedule
          </NavLink>

          <NavLink to={`${base}/parking-lot`} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
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
            <Link key={m.id} to={`${base}/review/${m.id}`} className="sidebar-recent-item">
              <div className="sidebar-recent-avatar" style={{ background: speakerColor(m.title) }}>
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

        <div className="sidebar-footer-nav">
          <NavLink to={`${base}/archive`} className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="21 8 21 21 3 21 3 8" />
              <rect x="1" y="3" width="22" height="5" />
              <line x1="10" y1="12" x2="14" y2="12" />
            </svg>
            Archive
          </NavLink>

          <button
            type="button"
            className="sidebar-link sidebar-link--btn"
            onClick={() => setShowQuickstart(true)}
            title="Open Quickstart Tutorial"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Quickstart Guide
          </button>
        </div>

        <SystemStatusTracker />

        <div className="sidebar-user" ref={userMenuRef}>
          <button className="sidebar-user-btn" onClick={() => setShowUserMenu((v) => !v)}>
            {user?.photo_url ? (
              <img className="sidebar-user-photo" src={user.photo_url} alt={user.name} />
            ) : (
              <div className="sidebar-user-avatar" style={{ background: speakerColor(user?.name ?? '') }}>
                {initials(user?.name ?? '?')}
              </div>
            )}
            <span className="sidebar-user-name">{user?.name}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
          {showUserMenu && (
            <div className="sidebar-user-menu">
              {allTeams.length > 0 && (
                <>
                  <p className="sidebar-user-menu-label">Switch team</p>
                  {allTeams.map((t) => (
                    <button
                      key={t.id}
                      className={`sidebar-user-menu-item ${String(t.id) === String(teamId) ? 'sidebar-user-menu-item--active' : ''}`}
                      onClick={() => { navigate(`/teams/${t.id}`); setShowUserMenu(false) }}
                    >
                      <span className="sidebar-user-menu-team-icon">{t.name[0].toUpperCase()}</span>
                      {t.name}
                      {String(t.id) === String(teamId) && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ marginLeft: 'auto' }}>
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                  ))}
                  <div className="sidebar-user-menu-divider" />
                </>
              )}
              <button
                className="sidebar-user-menu-item"
                onClick={() => { navigate('/teams', { state: { creating: true } }); setShowUserMenu(false) }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New team
              </button>
              <div className="sidebar-user-menu-divider" />
              <button
                className="sidebar-user-menu-item"
                onClick={() => { setShowQuickstart(true); setShowUserMenu(false) }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                Quickstart Tutorial
              </button>
              <button
                className="sidebar-user-menu-item"
                onClick={() => { setShowProfileModal(true); setShowUserMenu(false) }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Edit Profile
              </button>
              <div className="sidebar-user-menu-divider" />
              <button className="sidebar-user-menu-item" onClick={handleLogout}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </aside>

      <main className="app-main">
        <Outlet />
      </main>

      {showQuickstart && (
        <QuickstartModal onClose={() => setShowQuickstart(false)} />
      )}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
      {showTeamSetup && !showQuickstart && teamId && (
        <TeamSetupModal
          teamId={teamId}
          teamData={team}
          onClose={() => setShowTeamSetup(false)}
        />
      )}
    </div>
  )
}
