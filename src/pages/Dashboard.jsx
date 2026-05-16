import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { startMeeting, getMeetings, renameMeeting, deleteMeeting } from '../api'
import { meetingToCard } from '../utils'
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

function MeetingCard({ meeting, onRename, onDelete }) {
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(meeting.title)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const startEdit = (e) => {
    e.stopPropagation()
    setDraft(meeting.title)
    setEditing(true)
  }

  const saveEdit = async () => {
    const trimmed = draft.trim()
    if (!trimmed || trimmed === meeting.title) { setEditing(false); return }
    setSaving(true)
    try { await onRename(meeting.id, trimmed) } catch {}
    setSaving(false)
    setEditing(false)
  }

  return (
    <div className={`dash-card ${!meeting.reviewed ? 'dash-card--pending' : ''}`}>
      <div className="dash-card-header">
        {meeting.reviewed ? (
          <span className="dash-status dash-status--reviewed">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Finalized
          </span>
        ) : (
          <span className="dash-status dash-status--pending">
            <span className="dash-status-pulse" />
            In Progress
          </span>
        )}
        <span className="dash-card-date">{meeting.date}</span>
      </div>

      <div className="dash-card-title-row">
        {editing ? (
          <input
            ref={inputRef}
            className="dash-rename-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            onBlur={saveEdit}
            disabled={saving}
          />
        ) : (
          <>
            <h3 className="dash-card-title">{meeting.title}</h3>
            <button className="dash-rename-btn" onClick={startEdit} title="Rename">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </>
        )}
      </div>

      <p className="dash-card-summary">{meeting.summary}</p>

      <div className="dash-card-meta-row">
        <span className="dash-card-meta-item">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {meeting.duration}
        </span>
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
        {confirmDelete ? (
          <div className="dash-delete-confirm">
            <span>Delete?</span>
            <button className="dash-delete-yes" onClick={() => onDelete(meeting.id)}>Delete</button>
            <button className="dash-delete-no" onClick={() => setConfirmDelete(false)}>Cancel</button>
          </div>
        ) : (
          <button className="dash-delete-btn" onClick={() => setConfirmDelete(true)} title="Delete meeting">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        )}
        <div className="dash-card-actions">
          {!meeting.reviewed && (
            <button className="dash-card-cta dash-card-cta--live" onClick={() => navigate(`/live/${meeting.id}`)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polygon points="10 8 16 12 10 16" fill="currentColor" stroke="none" />
              </svg>
              Go to live meeting
            </button>
          )}
          <button
            className={`dash-card-cta ${!meeting.reviewed ? 'dash-card-cta--pending' : ''}`}
            onClick={() => navigate(`/review/${meeting.id}`)}
          >
            View Detail
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [dispatchState, setDispatchState] = useState('idle')
  const [dispatchError, setDispatchError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const [meetings, setMeetings] = useState([])

  useEffect(() => {
    getMeetings()
      .then((data) => setMeetings((data.meetings ?? []).map(meetingToCard)))
      .catch((e) => console.warn('[Dashboard] fetch failed:', e))
  }, [])

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
      setTimeout(() => navigate(`/live/${meeting_id}?native=${encodeURIComponent(nativeId)}`), 800)
    } catch (err) {
      setDispatchState('idle')
      setDispatchError(err.message)
    }
  }

  const handleRename = async (id, newTitle) => {
    await renameMeeting(id, newTitle)
    setMeetings((prev) => prev.map((m) => m.id === id ? { ...m, title: newTitle } : m))
  }

  const handleDelete = async (id) => {
    await deleteMeeting(id)
    setMeetings((prev) => prev.filter((m) => m.id !== id))
  }

  const filtered = meetings
    .filter((m) => {
      if (filter === 'pending') return !m.reviewed
      if (filter === 'reviewed') return m.reviewed
      return true
    })
    .filter((m) => !search.trim() || m.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="dash-page">
      <div className="dash-page-header">
        <div>
          <h1 className="dash-page-title">Dashboard</h1>
          <p className="dash-page-subtitle">Overview of your meetings and action items</p>
        </div>
      </div>

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

      <div className="dash-meetings-section">
        <div className="dash-meetings-header">
          <div className="dash-meetings-header-left">
            <span className="dash-section-label">Past Meetings</span>
            <div className="dash-search-wrap">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="dash-search-input"
                placeholder="Search meetings..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="dash-search-clear" onClick={() => setSearch('')} title="Clear">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="dash-filter-tabs">
            {[
              { key: 'all', label: `All (${meetings.length})` },
              { key: 'pending', label: `In Progress (${meetings.filter((m) => !m.reviewed).length})` },
              { key: 'reviewed', label: 'Finalized' },
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
              <MeetingCard key={m.id} meeting={m} onRename={handleRename} onDelete={handleDelete} />
            ))}
          </div>
        ) : (
          <div className="dash-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p>{search ? 'No meetings match your search' : 'No meetings match this filter'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
