import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { getTeams, createTeam } from '../api'
import { useAuth } from '../contexts/AuthContext'
import UserSetupModal from '../components/UserSetupModal'
import './Teams.css'

export default function Teams() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(location.state?.creating ?? false)
  const [newName, setNewName] = useState('')
  const [createError, setCreateError] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [showUserSetup, setShowUserSetup] = useState(false)

  useEffect(() => {
    if (user?.id) {
      const userDone = localStorage.getItem(`mm_user_setup_completed_${user.id}`)
      if (!userDone) {
        setShowUserSetup(true)
      }
    }
  }, [user?.id])

  useEffect(() => {
    getTeams()
      .then((data) => setTeams(data.teams ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setCreateLoading(true)
    setCreateError('')
    try {
      const team = await createTeam(name)
      navigate(`/teams/${team.id}`)
    } catch (err) {
      setCreateError(err.message)
      setCreateLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="teams-page">
      <header className="teams-header">
        <div className="teams-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          <svg viewBox="0 0 20 20" fill="none" width="22" height="22">
            <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#4f8ef7" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
          </svg>
          MeetingMind
        </div>
        <div className="teams-header-right">
          <span className="teams-user-name">{user?.name}</span>
          <button className="teams-logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </header>

      <div className="teams-body">
        <div className="teams-section-header">
          <h1 className="teams-title">Your Teams</h1>
          <button className="teams-create-btn" onClick={() => setCreating(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Team
          </button>
        </div>

        {creating && (
          <form className="teams-create-form" onSubmit={handleCreate}>
            <input
              className="teams-create-input"
              type="text"
              placeholder="Team name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              autoFocus
            />
            <button className="teams-create-submit" disabled={createLoading || !newName.trim()}>
              {createLoading ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              className="teams-create-cancel"
              onClick={() => { setCreating(false); setNewName(''); setCreateError('') }}
            >
              Cancel
            </button>
            {createError && <p className="teams-create-error">{createError}</p>}
          </form>
        )}

        {loading && <p className="teams-loading">Loading…</p>}

        {!loading && teams.length === 0 && !creating && (
          <div className="teams-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p>You are not in any team yet. Create one or ask someone for an invite link.</p>
          </div>
        )}

        {!loading && teams.length > 0 && (
          <div className="teams-grid">
            {teams.map((team) => (
              <div key={team.id} className="team-card" onClick={() => navigate(`/teams/${team.id}`)}>
                <div className="team-card-icon">{team.name[0].toUpperCase()}</div>
                <div className="team-card-info">
                  <span className="team-card-name">{team.name}</span>
                  {team.is_owner && <span className="team-card-owner">Owner</span>}
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            ))}
          </div>
        )}
      </div>
      {showUserSetup && <UserSetupModal onClose={() => setShowUserSetup(false)} />}
    </div>
  )
}
