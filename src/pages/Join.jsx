import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Join.css'

function Join() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState('idle') // idle | connecting | joined
  const navigate = useNavigate()

  const handleDispatch = () => {
    if (!url.trim()) return
    setStatus('connecting')
    setTimeout(() => setStatus('joined'), 2000)
    setTimeout(() => navigate('/live'), 3000)
  }

  const agents = [
    { icon: '🏃', label: 'Scrum Master', desc: 'Process & velocity' },
    { icon: '📊', label: 'PM Agent', desc: 'Business & risk' },
    { icon: '⚙️', label: 'Dev Agent', desc: 'Technical clarity' },
  ]

  return (
    <div className="join-page">
      <div className="join-card">
        <div className="join-logo">
          <svg className="join-logo-mark" viewBox="0 0 32 32" fill="none">
            <polygon points="16,2 30,9 30,23 16,30 2,23 2,9" fill="none" stroke="#4f8ef7" strokeWidth="2" />
            <polygon points="16,8 24,12 24,20 16,24 8,20 8,12" fill="#4f8ef7" fillOpacity="0.15" stroke="#4f8ef7" strokeWidth="1.5" />
            <circle cx="16" cy="16" r="3" fill="#4f8ef7" />
          </svg>
          <span className="join-logo-text">MeetingMind</span>
        </div>

        <div className="join-hero">
          <h1>Deploy Your AI Meeting Team</h1>
          <p>
            Paste your Google Meet link and dispatch role-specific AI agents to join,
            transcribe, and actively assist your meeting in real time.
          </p>
        </div>

        <div className="join-agents">
          {agents.map((a) => (
            <div className="join-agent-badge" key={a.label}>
              <span className="join-agent-icon">{a.icon}</span>
              <div>
                <div className="join-agent-name">{a.label}</div>
                <div className="join-agent-desc">{a.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="join-form">
          <label className="join-label">Google Meet URL</label>
          <div className={`join-input-group ${url ? 'join-input-group--filled' : ''}`}>
            <span className="join-input-prefix">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </span>
            <input
              className="join-input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDispatch()}
              disabled={status !== 'idle'}
            />
          </div>

          <button
            className={`join-btn ${status === 'connecting' ? 'join-btn--loading' : ''} ${status === 'joined' ? 'join-btn--success' : ''}`}
            onClick={handleDispatch}
            disabled={status !== 'idle' || !url.trim()}
          >
            {status === 'idle' && (
              <>
                <span>Dispatch Bot to Meeting</span>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
            {status === 'connecting' && (
              <>
                <span className="join-spinner" />
                <span>Dispatching agents...</span>
              </>
            )}
            {status === 'joined' && (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Agents joined — entering workspace</span>
              </>
            )}
          </button>
        </div>

        <div className="join-features">
          <div className="join-feature">
            <span className="join-feature-dot" style={{ background: 'var(--green)' }} />
            Real-time transcription
          </div>
          <div className="join-feature">
            <span className="join-feature-dot" style={{ background: 'var(--accent)' }} />
            Conflict detection
          </div>
          <div className="join-feature">
            <span className="join-feature-dot" style={{ background: 'var(--purple)' }} />
            Auto action items
          </div>
        </div>
      </div>
    </div>
  )
}

export default Join
