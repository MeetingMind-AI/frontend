import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getMeeting, getTranscript, getActions, renameMeeting, updateAction, getTopics, addMeetingTopic, removeMeetingTopic } from '../api'
import { parseScrumMaster, formatMeetingTitle, formatDate } from '../utils'
import MeetingTopicTags from '../components/MeetingTopicTags'
import './Review.css'

function speakerColor(name) {
  const colors = ['#4f8ef7', '#3fb950', '#bc8cff', '#d29922', '#e3884c', '#f85149']
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
  return colors[hash % colors.length]
}

function speakerInitials(name) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase()
}

const TYPE_META = {
  todo:    { label: 'TODO',     color: 'var(--accent)',  bg: 'var(--accent-dim)'  },
  schedule:{ label: 'SCHEDULE', color: 'var(--purple)',  bg: 'var(--purple-dim)'  },
  parking: { label: 'PARKING',  color: 'var(--yellow)',  bg: 'var(--yellow-dim)'  },
}

function SuggestionCard({ task, onApprove, onReject, onEdit }) {
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState(task.title)

  const startEdit = () => {
    setDraft(task.title)
    setEditMode(true)
  }

  const saveEdit = () => {
    const trimmed = draft.trim()
    if (trimmed) onEdit(task.id, trimmed)
    setEditMode(false)
  }

  const cancelEdit = () => {
    setDraft(task.title)
    setEditMode(false)
  }

  return (
    <div className="rv-card rv-card--suggestion">
      <div className="rv-card-top">
        <span className="rv-card-type" style={{ color: TYPE_META[task.type].color, background: TYPE_META[task.type].bg }}>
          {TYPE_META[task.type].label}
        </span>
      </div>

      {editMode ? (
        <textarea
          className="rv-card-textarea"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit() }
            if (e.key === 'Escape') cancelEdit()
          }}
          autoFocus
          rows={3}
        />
      ) : (
        <p className="rv-card-title">{task.title}</p>
      )}

      <div className="rv-card-actions">
        {editMode ? (
          <>
            <button className="rv-card-btn rv-card-btn--cancel" onClick={cancelEdit}>Cancel</button>
            <button className="rv-card-btn rv-card-btn--save" onClick={saveEdit}>Save</button>
          </>
        ) : (
          <>
            <button className="rv-card-btn rv-card-btn--edit" onClick={startEdit} title="Edit suggestion">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button className="rv-card-btn rv-card-btn--approve" onClick={() => onApprove(task.id)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Approve
            </button>
            <button className="rv-card-btn rv-card-btn--reject" onClick={() => onReject(task.id)} title="Reject suggestion">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function ApprovedCard({ task, onUndo }) {
  return (
    <div className="rv-card rv-card--approved">
      <div className="rv-card-top">
        <span className="rv-card-type" style={{ color: TYPE_META[task.type].color, background: TYPE_META[task.type].bg }}>
          {TYPE_META[task.type].label}
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p className="rv-card-title">{task.title}</p>
      <div className="rv-card-actions">
        <button className="rv-card-btn rv-card-btn--undo" onClick={() => onUndo(task.id)}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Move back
        </button>
      </div>
    </div>
  )
}

function Review() {
  const navigate = useNavigate()
  const { teamId, meetingId } = useParams()
  const parsedMeetingId = meetingId ? parseInt(meetingId, 10) : null

  const [tasks, setTasks] = useState([])
  const [activeTab, setActiveTab] = useState('tasks')
  const [meetingData, setMeetingData] = useState(null)
  const [chunks, setChunks] = useState([])
  const [loading, setLoading] = useState(!!parsedMeetingId)
  const [titleEditing, setTitleEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [proposals, setProposals] = useState({})
  const [summaryTab, setSummaryTab] = useState('general')
  const [meetingTopics, setMeetingTopics] = useState([])
  const [teamTopics, setTeamTopics] = useState([])

  function proposalToTasks(proposals, meeting) {
    const items = []
    let id = 1
    for (const typeGroup of Object.values(proposals)) {
      for (const p of (typeGroup.pending ?? [])) {
        const type = p.action_type === 'to_schedule' ? 'schedule' : p.action_type === 'parking_lot' ? 'parking' : 'todo'
        items.push({ id: p.id || id++, title: p.content, type, status: 'suggested', meeting })
      }
      for (const p of (typeGroup.accepted ?? [])) {
        const type = p.action_type === 'to_schedule' ? 'schedule' : p.action_type === 'parking_lot' ? 'parking' : 'todo'
        items.push({ id: p.id || id++, title: p.content, type, status: 'approved', meeting })
      }
    }
    return items
  }

  useEffect(() => {
    if (!parsedMeetingId) return
    setLoading(true)
    Promise.all([getMeeting(parsedMeetingId), getTranscript(parsedMeetingId), getActions(parsedMeetingId)])
      .then(([meeting, transcript, actions]) => {
        setMeetingData(meeting)
        setMeetingTopics(meeting.topics ?? [])
        setChunks(transcript.chunks ?? [])
        setProposals(actions)
        const built = proposalToTasks(actions, meeting.title)
        if (built.length > 0) setTasks(built)
      })
      .catch((e) => console.warn('[Review] fetch failed:', e))
      .finally(() => setLoading(false))
  }, [parsedMeetingId])

  useEffect(() => {
    if (!teamId) return
    getTopics(teamId)
      .then((data) => setTeamTopics(data.topics ?? []))
      .catch(() => {})
  }, [teamId])

  const handleAddTopic = async (topicId, topic) => {
    setMeetingTopics((prev) => [...prev, topic])
    try { await addMeetingTopic(parsedMeetingId, topicId) } catch {
      setMeetingTopics((prev) => prev.filter((t) => t.id !== topicId))
    }
  }

  const handleRemoveTopic = async (topicId) => {
    setMeetingTopics((prev) => prev.filter((t) => t.id !== topicId))
    try { await removeMeetingTopic(parsedMeetingId, topicId) } catch {
      const topic = teamTopics.find((t) => t.id === topicId)
      if (topic) setMeetingTopics((prev) => [...prev, topic])
    }
  }

  useEffect(() => {
    if (!parsedMeetingId) return
    if (meetingData?.status !== 'completed' || meetingData?.summary) return
    const t = setInterval(async () => {
      try {
        const meeting = await getMeeting(parsedMeetingId)
        if (meeting.summary) {
          clearInterval(t)
          setMeetingData(meeting)
        }
      } catch {}
    }, 5000)
    return () => clearInterval(t)
  }, [parsedMeetingId, meetingData?.status])

  const taskItems     = tasks.filter((t) => t.type === 'todo')
  const scheduleItems = tasks.filter((t) => t.type === 'schedule')
  const parkingItems  = tasks.filter((t) => t.type === 'parking')

  const suggestedTasks  = taskItems.filter((t) => t.status === 'suggested')
  const approvedTasks   = taskItems.filter((t) => t.status === 'approved')

  const updateTask = (id, patch) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const approveTask = async (id) => {
    updateTask(id, { status: 'approved' })
    try { await updateAction(parsedMeetingId, id, 'accepted') } catch {}
  }
  const rejectTask = async (id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
    try { await updateAction(parsedMeetingId, id, 'rejected') } catch {}
  }
  const undoTask = async (id) => {
    updateTask(id, { status: 'suggested' })
    try { await updateAction(parsedMeetingId, id, 'pending') } catch {}
  }
  const editTask = async (id, title) => {
    updateTask(id, { title })
    try { await updateAction(parsedMeetingId, id, undefined, title) } catch {}
  }

  return (
    <div className="rv-page">
      <header className="rv-header">
        <div className="rv-header-left">
          <div className="rv-logo">
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
              <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#4f8ef7" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
            </svg>
            MeetingMind
          </div>
          <div className="rv-meeting-info">
            {meetingData && titleEditing ? (
              <input
                className="rv-title-input"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const t = titleDraft.trim()
                    if (t && t !== formatMeetingTitle(meetingData.title)) {
                      try { await renameMeeting(meetingData.id, t); setMeetingData((prev) => ({ ...prev, title: t })) } catch {}
                    }
                    setTitleEditing(false)
                  }
                  if (e.key === 'Escape') setTitleEditing(false)
                }}
                onBlur={async () => {
                  const t = titleDraft.trim()
                  if (t && t !== formatMeetingTitle(meetingData.title)) {
                    try { await renameMeeting(meetingData.id, t); setMeetingData((prev) => ({ ...prev, title: t })) } catch {}
                  }
                  setTitleEditing(false)
                }}
                autoFocus
              />
            ) : (
              <span
                className={`rv-meeting-title ${meetingData ? 'rv-meeting-title--editable' : ''}`}
                onClick={() => {
                  if (meetingData) {
                    setTitleDraft(formatMeetingTitle(meetingData.title))
                    setTitleEditing(true)
                  }
                }}
                title={meetingData ? 'Click to rename' : undefined}
              >
                {meetingData ? formatMeetingTitle(meetingData.title) : `Meeting #${parsedMeetingId}`}
              </span>
            )}
            <span className="rv-meeting-meta">
              {meetingData ? `${formatDate(meetingData.created_at)} · ${meetingData.status}` : ''}
            </span>
          </div>
        </div>
        <div className="rv-header-right">
          <button className="rv-btn rv-btn--ghost" onClick={() => navigate(`/teams/${teamId}`)}>← Dashboard</button>
        </div>
      </header>

      <div className="rv-content">
        <div className="rv-summary">
          <div className="rv-summary-header">
            <div className="rv-summary-title-row">
              <span className="rv-section-label">AI Meeting Summary</span>
            </div>

            {(meetingTopics.length > 0 || teamTopics.length > 0) && (
              <div className="rv-summary-tags">
                <MeetingTopicTags
                  meetingTopics={meetingTopics}
                  teamTopics={teamTopics}
                  onAdd={handleAddTopic}
                  onRemove={handleRemoveTopic}
                />
              </div>
            )}

            {meetingData?.summary && (
              <div className="rv-summary-tabs">
                <button
                  className={`rv-summary-tab${summaryTab === 'general' ? ' rv-summary-tab--active' : ''}`}
                  onClick={() => setSummaryTab('general')}
                >General</button>
                <button
                  className={`rv-summary-tab${summaryTab === 'technical' ? ' rv-summary-tab--active' : ''}`}
                  onClick={() => setSummaryTab('technical')}
                >Technical</button>
                <button
                  className={`rv-summary-tab${summaryTab === 'business' ? ' rv-summary-tab--active' : ''}`}
                  onClick={() => setSummaryTab('business')}
                >Business</button>
              </div>
            )}
          </div>
          {loading && (
            <div style={{ padding: '32px', color: 'var(--text-3)', fontSize: '13px', textAlign: 'center' }}>
              Loading summary...
            </div>
          )}
          {!loading && meetingData?.summary && summaryTab === 'general' && (() => {
            const sm = parseScrumMaster(meetingData?.summary?.scrum_master)
            if (!sm) return null
            return (
              <div className="rv-summary-grid">
                <div className="rv-summary-block rv-summary-block--full">
                  <h4 className="rv-summary-block-title">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="9 11 12 14 22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                    Summary
                  </h4>
                  <p className="rv-summary-text">{sm.summary}</p>
                </div>
                {sm.to_do?.length > 0 && (
                  <div className="rv-summary-block">
                    <h4 className="rv-summary-block-title">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                      Action Items
                    </h4>
                    <ul className="rv-summary-list">
                      {sm.to_do.map((t, i) => <li key={i}>{typeof t === 'string' ? t : `${t.task}${t.owner ? ` — ${t.owner}` : ''}`}</li>)}
                    </ul>
                  </div>
                )}
                {sm.parking_lot?.length > 0 && (
                  <div className="rv-summary-block">
                    <h4 className="rv-summary-block-title">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                      Parking Lot
                    </h4>
                    <ul className="rv-summary-list rv-summary-list--warn">
                      {sm.parking_lot.map((t, i) => <li key={i}>{typeof t === 'string' ? t : (t.task ?? String(t))}</li>)}
                    </ul>
                  </div>
                )}
                {(() => {
                  const allAccepted = Object.values(proposals).flatMap(t => t.accepted ?? [])
                  if (allAccepted.length === 0) return null
                  return (
                    <div className="rv-summary-block">
                      <h4 className="rv-summary-block-title">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                        Accepted Proposals
                      </h4>
                      <ul className="rv-summary-list">
                        {allAccepted.map((p, i) => <li key={i}>{p.content}</li>)}
                      </ul>
                    </div>
                  )
                })()}
              </div>
            )
          })()}
          {!loading && meetingData?.summary && summaryTab === 'technical' && (() => {
            const tl = parseScrumMaster(meetingData?.summary?.tech_lead)
            if (!tl) return null
            return (
              <div className="rv-summary-grid">
                {tl.technical_decisions?.length > 0 && (
                  <div className="rv-summary-block rv-summary-block--full">
                    <h4 className="rv-summary-block-title">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      Technical Decisions
                    </h4>
                    <ul className="rv-summary-list">
                      {tl.technical_decisions.map((d, i) => (
                        <li key={i}>{d.decision}{d.rationale ? ` — ${d.rationale}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {tl.architecture?.length > 0 && (
                  <div className="rv-summary-block">
                    <h4 className="rv-summary-block-title">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                      Architecture
                    </h4>
                    <ul className="rv-summary-list">
                      {tl.architecture.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
                {tl.engineering_blockers?.length > 0 && (
                  <div className="rv-summary-block">
                    <h4 className="rv-summary-block-title">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                      Engineering Blockers
                    </h4>
                    <ul className="rv-summary-list rv-summary-list--warn">
                      {tl.engineering_blockers.map((b, i) => (
                        <li key={i}>{b.blocker}{b.owner ? ` — ${b.owner}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })()}
          {!loading && meetingData?.summary && summaryTab === 'business' && (() => {
            const pm = parseScrumMaster(meetingData?.summary?.product_manager)
            if (!pm) return null
            return (
              <div className="rv-summary-grid">
                {pm.feature_requests?.length > 0 && (
                  <div className="rv-summary-block rv-summary-block--full">
                    <h4 className="rv-summary-block-title">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      Feature Requests
                    </h4>
                    <ul className="rv-summary-list">
                      {pm.feature_requests.map((f, i) => (
                        <li key={i}>{f.feature}{f.requester ? ` (requested by ${f.requester})` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {pm.ux_topics?.length > 0 && (
                  <div className="rv-summary-block">
                    <h4 className="rv-summary-block-title">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                      UX Topics
                    </h4>
                    <ul className="rv-summary-list">
                      {pm.ux_topics.map((u, i) => (
                        <li key={i}>{u.topic}{u.description ? ` — ${u.description}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {pm.roadmap_alignment?.length > 0 && (
                  <div className="rv-summary-block">
                    <h4 className="rv-summary-block-title">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                      </svg>
                      Roadmap Alignment
                    </h4>
                    <ul className="rv-summary-list">
                      {pm.roadmap_alignment.map((r, i) => (
                        <li key={i}>{r.task}{r.owner ? ` — ${r.owner}` : ''}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })()}
          {!loading && !meetingData?.summary && (
            <div style={{ padding: '24px', color: 'var(--text-3)', fontSize: '13px' }}>
              {meetingData?.status === 'completed'
                ? 'Generating final summary... this may take a moment.'
                : 'Summary will be generated when the meeting ends.'}
            </div>
          )}
        </div>

        <div className="rv-actions-section">
          <div className="rv-actions-header">
            <div className="rv-tabs">
              <button
                className={`rv-tab ${activeTab === 'tasks' ? 'rv-tab--active' : ''}`}
                onClick={() => setActiveTab('tasks')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Tasks
                <span className="rv-tab-count">{taskItems.length}</span>
              </button>
              <button
                className={`rv-tab ${activeTab === 'schedule' ? 'rv-tab--active' : ''}`}
                onClick={() => setActiveTab('schedule')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                To Schedule
                <span className="rv-tab-count">{scheduleItems.length}</span>
              </button>
              <button
                className={`rv-tab ${activeTab === 'parking' ? 'rv-tab--active rv-tab--parking' : ''}`}
                onClick={() => setActiveTab('parking')}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="16" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                </svg>
                Parking Lot
                <span className="rv-tab-count">{parkingItems.length}</span>
              </button>
            </div>
            <span className="rv-kanban-hint">
              {activeTab === 'tasks'
                ? 'Edit or reject suggestions before approving'
                : activeTab === 'schedule'
                ? 'Confirm meetings to schedule'
                : 'Review deferred topics'}
            </span>
          </div>

          {activeTab === 'tasks' && (
            <div className="rv-kanban-board">
              <div className="rv-col">
                <div className="rv-col-header">
                  <span className="rv-col-title">AI Suggestions</span>
                  <span className="rv-col-count">{suggestedTasks.length}</span>
                </div>
                <div className="rv-col-cards">
                  {suggestedTasks.map((task) => (
                    <SuggestionCard key={task.id} task={task} onApprove={approveTask} onReject={rejectTask} onEdit={editTask} />
                  ))}
                  {suggestedTasks.length === 0 && (
                    <div className="rv-col-empty">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      All items reviewed
                    </div>
                  )}
                </div>
              </div>

              <div className="rv-col rv-col--approved">
                <div className="rv-col-header">
                  <span className="rv-col-title">Approved</span>
                  <span className="rv-col-count rv-col-count--green">{approvedTasks.length}</span>
                </div>
                <div className="rv-col-cards">
                  {approvedTasks.map((task) => (
                    <ApprovedCard key={task.id} task={task} onUndo={undoTask} />
                  ))}
                  {approvedTasks.length === 0 && (
                    <div className="rv-col-empty">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                      </svg>
                      Approved tasks go here
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'parking' && (
            <div className="rv-kanban-board">
              <div className="rv-col">
                <div className="rv-col-header">
                  <span className="rv-col-title">Deferred Topics</span>
                  <span className="rv-col-count">{parkingItems.filter((t) => t.status === 'suggested').length}</span>
                </div>
                <div className="rv-col-cards">
                  {parkingItems.filter((t) => t.status === 'suggested').map((task) => (
                    <SuggestionCard key={task.id} task={task} onApprove={approveTask} onReject={rejectTask} onEdit={editTask} />
                  ))}
                  {parkingItems.filter((t) => t.status === 'suggested').length === 0 && (
                    <div className="rv-col-empty">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      No deferred topics
                    </div>
                  )}
                </div>
              </div>

              <div className="rv-col rv-col--approved">
                <div className="rv-col-header">
                  <span className="rv-col-title">Added to Parking Lot</span>
                  <span className="rv-col-count rv-col-count--green">{parkingItems.filter((t) => t.status === 'approved').length}</span>
                </div>
                <div className="rv-col-cards">
                  {parkingItems.filter((t) => t.status === 'approved').map((task) => (
                    <ApprovedCard key={task.id} task={task} onUndo={undoTask} />
                  ))}
                  {parkingItems.filter((t) => t.status === 'approved').length === 0 && (
                    <div className="rv-col-empty">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
                      </svg>
                      Approved topics go here
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="rv-schedule-list">
              {scheduleItems.length === 0 && (
                <div className="rv-col-empty" style={{ padding: '48px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  No meetings to schedule
                </div>
              )}
              {scheduleItems.map((task) => (
                <div className="rv-schedule-item" key={task.id}>
                  <div className="rv-schedule-item-left">
                    <div className="rv-schedule-dot">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </div>
                  </div>
                  <div className="rv-schedule-item-body">
                    <p className="rv-schedule-item-title">{task.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rv-transcript">
          {(() => {
            const feed = chunks.map((c) => ({
              id: c.id,
              speaker: c.speaker,
              role: '',
              text: c.text,
              timestamp: new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }))
            return (
              <>
                <div className="rv-transcript-header">
                  <span className="rv-section-label">Full Transcript</span>
                  <span className="rv-transcript-count">{feed.length} messages</span>
                </div>
                <div className="rv-transcript-feed">
                  {feed.length === 0 && (
                    <div style={{ padding: '32px', color: 'var(--text-3)', fontSize: '13px', textAlign: 'center' }}>
                      {loading ? 'Loading transcript...' : 'No transcript available.'}
                    </div>
                  )}
                  {feed.map((msg, i) => {
                    const isFirst = i === 0 || feed[i - 1].speaker !== msg.speaker
                    return (
                      <div className={`rv-msg${isFirst ? '' : ' rv-msg--continuation'}`} key={msg.id}>
                        {isFirst ? (
                          <div className="rv-msg-avatar" style={{ background: speakerColor(msg.speaker) }}>
                            {speakerInitials(msg.speaker)}
                          </div>
                        ) : (
                          <div className="rv-msg-avatar-spacer" />
                        )}
                        <div className="rv-msg-body">
                          {isFirst && (
                            <div className="rv-msg-meta">
                              <span className="rv-msg-speaker">{msg.speaker}</span>
                              {msg.role && <span className="rv-msg-role">{msg.role}</span>}
                              <span className="rv-msg-time">{msg.timestamp}</span>
                            </div>
                          )}
                          <div className="rv-msg-text">{msg.text}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

export default Review
