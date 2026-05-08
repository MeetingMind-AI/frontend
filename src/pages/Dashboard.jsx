import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockPreviousMeetings } from '../mockData'
import { startMeeting } from '../api'
import './Dashboard.css'

function extractNativeId(url) {
  try {
    return new URL(url).pathname.split('/').filter(Boolean).pop() || null
  } catch {
    return url.trim().split('/').filter(Boolean).pop() || null
  }
}

function speakerColor(name) {
  const colors = ['#4f8ef7', '#3fb950', '#bc8cff', '#d29922', '#e3884c', '#f85149']
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return colors[hash % colors.length]
}

function initials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase()
}

function MeetingCard({ meeting }) {
  const navigate = useNavigate()

  return (
    <div className={`dash-card ${!meeting.reviewed ? 'dash-card--pending' : ''}`}>
      <div className="dash-card-header">
        {meeting.reviewed ? (
          <span className="dash-status dash-status--reviewed">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Reviewed
          </span>
        ) : (
          <span className="dash-status dash-status--pending">
            <span className="dash-status-pulse" />
            Needs Review
          </span>
        )}
        <span className="dash-card-date">{meeting.date}</span>
      </div>

      <h3 className="dash-card-title">{meeting.title}</h3>
      <p className="dash-card-summary">{meeting.summary}</p>

      <div className="dash-card-meta-row">
        <span className="dash-card-meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {meeting.duration}
        </span>
        <span className="dash-card-meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          {meeting.participants.length} participants
        </span>
      </div>

      <div className="dash-card-participants">
        {meeting.participants.slice(0, 4).map((p) => (
          <div
            key={p}
            className="dash-avatar"
            style={{ background: speakerColor(p) }}
            title={p}
          >
            {initials(p)}
          </div>
        ))}
        {meeting.participants.length > 4 && (
          <div className="dash-avatar dash-avatar--overflow">
            +{meeting.participants.length - 4}
          </div>
        )}
      </div>

      <div className="dash-card-stats">
        <div className="dash-stat">
          <span className="dash-stat-num">{meeting.actionItemCount}</span>
          <span className="dash-stat-label">action items</span>
        </div>
        <div className="dash-stat-divider" />
        <div className="dash-stat">
          <span className="dash-stat-num" style={{ color: meeting.parkingLotCount > 0 ? 'var(--yellow)' : 'var(--text-3)' }}>
            {meeting.parkingLotCount}
          </span>
          <span className="dash-stat-label">parking lot</span>
        </div>
      </div>

      <div className="dash-card-footer">
        <button
          className={`dash-card-cta ${!meeting.reviewed ? 'dash-card-cta--pending' : ''}`}
          onClick={() => navigate(`/review/${meeting.id}`)}
        >
          {meeting.reviewed ? 'View Review' : 'Open Review'}
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [dispatchState, setDispatchState] = useState('idle') // idle | loading | done | error
  const [dispatchError, setDispatchError] = useState('')
  const [filter, setFilter] = useState('all') // all | pending | reviewed

  const handleDispatch = async () => {
    if (!url.trim() || dispatchState !== 'idle') return
    const nativeId = extractNativeId(url.trim())
    if (!nativeId) {
      setDispatchError('Invalid Google Meet URL')
      return
    }
    setDispatchState('loading')
    setDispatchError('')
    try {
      const { meeting_id } = await startMeeting('google_meet', nativeId)
      setDispatchState('done')
      setTimeout(() => navigate(`/live/${meeting_id}`), 800)
    } catch (err) {
      setDispatchState('idle')
      setDispatchError(err.message)
    }
  }

  const filtered = mockPreviousMeetings.filter((m) => {
    if (filter === 'pending') return !m.reviewed
    if (filter === 'reviewed') return m.reviewed
    return true
  })

  const totalActionItems = mockPreviousMeetings.reduce((s, m) => s + m.actionItemCount, 0)
  const totalParking = mockPreviousMeetings.reduce((s, m) => s + m.parkingLotCount, 0)
  const pendingReview = mockPreviousMeetings.filter((m) => !m.reviewed).length

  return (
    <div className="dash-page">
      {/* Page header */}
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Dashboard</h1>
          <p className="dash-page-subtitle">Overview of your meetings and action items</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="dash-stats-row">
        <div className="dash-stat-card">
          <div className="dash-stat-card-num">{mockPreviousMeetings.length}</div>
          <div className="dash-stat-card-label">Total meetings</div>
        </div>
        <div className="dash-stat-card dash-stat-card--warn">
          <div className="dash-stat-card-num" style={{ color: 'var(--yellow)' }}>{pendingReview}</div>
          <div className="dash-stat-card-label">Needs review</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card-num">{totalActionItems}</div>
          <div className="dash-stat-card-label">Action items</div>
        </div>
        <div className="dash-stat-card">
          <div className="dash-stat-card-num" style={{ color: 'var(--yellow)' }}>{totalParking}</div>
          <div className="dash-stat-card-label">Parking lot items</div>
        </div>
      </div>

      {/* Join box */}
      <div className="dash-join-box">
        <div className="dash-join-box-left">
          <div className="dash-join-box-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            Start a New Meeting
          </div>
          <p className="dash-join-box-sub">Dispatch AI agents to an active Google Meet session</p>
        </div>
        <div className="dash-join-input-row">
          <div className={`dash-join-input-group ${url ? 'dash-join-input-group--filled' : ''}`}>
            <input
              className="dash-join-input"
              type="url"
              placeholder="https://meet.google.com/abc-defg-hij"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setDispatchError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleDispatch()}
              disabled={dispatchState !== 'idle'}
            />
          </div>
          <button
            className={`dash-join-btn ${dispatchState === 'loading' ? 'dash-join-btn--loading' : ''} ${dispatchState === 'done' ? 'dash-join-btn--done' : ''}`}
            onClick={handleDispatch}
            disabled={dispatchState !== 'idle' || !url.trim()}
          >
            {dispatchState === 'idle' && (
              <>
                Dispatch Bot
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
            {dispatchState === 'loading' && (
              <>
                <span className="dash-join-spinner" />
                Dispatching…
              </>
            )}
            {dispatchState === 'done' && (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Joined
              </>
            )}
          </button>
        </div>
      </div>

      {dispatchError && (
        <p style={{ color: 'var(--red)', fontSize: '13px', marginTop: '-8px', marginBottom: '8px', paddingLeft: '4px' }}>
          {dispatchError}
        </p>
      )}

      {/* Meetings section */}
      <div className="dash-meetings-section">
        <div className="dash-meetings-header">
          <span className="dash-section-label">Past Meetings</span>
          <div className="dash-filter-tabs">
            {[
              { key: 'all', label: `All (${mockPreviousMeetings.length})` },
              { key: 'pending', label: `Needs Review (${pendingReview})` },
              { key: 'reviewed', label: 'Reviewed' },
            ].map((f) => (
              <button
                key={f.key}
                className={`dash-filter-tab ${filter === f.key ? 'dash-filter-tab--active' : ''}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length > 0 ? (
          <div className="dash-meetings-grid">
            {filtered.map((m) => (
              <MeetingCard key={m.id} meeting={m} />
            ))}
          </div>
        ) : (
          <div className="dash-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p>No meetings match this filter</p>
          </div>
        )}
      </div>
    </div>
  )
}
