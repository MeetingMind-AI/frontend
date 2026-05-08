import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { mockPostMeetingTasks, mockMeetingSummary, mockTranscript } from '../mockData'
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

/* ── Suggestion card — Edit / Approve / Reject ── */
function SuggestionCard({ task, onApprove, onReject, onEdit }) {
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const textareaRef = useRef(null)

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
          ref={textareaRef}
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

/* ── Approved task card ── */
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

/* ── Schedule list item — Confirm / Edit / Reject ── */
function ScheduleItem({ task, onConfirm, onReject, onEdit }) {
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState(task.title)

  const saveEdit = () => {
    const trimmed = draft.trim()
    if (trimmed) onEdit(task.id, trimmed)
    setEditMode(false)
  }

  const cancelEdit = () => {
    setDraft(task.title)
    setEditMode(false)
  }

  const isConfirmed = task.status === 'approved'

  return (
    <div className={`rv-schedule-item ${isConfirmed ? 'rv-schedule-item--confirmed' : ''}`}>
      <div className="rv-schedule-item-left">
        <div className={`rv-schedule-dot ${isConfirmed ? 'rv-schedule-dot--confirmed' : ''}`}>
          {isConfirmed ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          )}
        </div>
      </div>

      <div className="rv-schedule-item-body">
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
            rows={2}
          />
        ) : (
          <p className="rv-schedule-item-title">{task.title}</p>
        )}
        <span className="rv-schedule-item-status">
          {isConfirmed ? 'Confirmed — will appear in To Schedule' : 'Pending review'}
        </span>
      </div>

      <div className="rv-schedule-item-actions">
        {editMode ? (
          <>
            <button className="rv-card-btn rv-card-btn--cancel" onClick={cancelEdit}>Cancel</button>
            <button className="rv-card-btn rv-card-btn--save" onClick={saveEdit}>Save</button>
          </>
        ) : isConfirmed ? (
          <button className="rv-card-btn rv-card-btn--undo" onClick={() => onReject(task.id)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Move back
          </button>
        ) : (
          <>
            <button className="rv-card-btn rv-card-btn--edit" onClick={() => { setDraft(task.title); setEditMode(true) }} title="Edit">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
            <button className="rv-card-btn rv-card-btn--approve" onClick={() => onConfirm(task.id)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Confirm
            </button>
            <button className="rv-card-btn rv-card-btn--reject" onClick={() => onReject(task.id)} title="Remove">
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

/* ── Main Review page ── */
function Review() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState(mockPostMeetingTasks)
  const [activeTab, setActiveTab] = useState('tasks') // 'tasks' | 'schedule' | 'parking'
  const [syncState, setSyncState] = useState('idle')

  // Separate by type
  const taskItems     = tasks.filter((t) => t.type === 'todo')
  const scheduleItems = tasks.filter((t) => t.type === 'schedule')
  const parkingItems  = tasks.filter((t) => t.type === 'parking')

  const suggestedTasks    = taskItems.filter((t) => t.status === 'suggested')
  const approvedTasks     = taskItems.filter((t) => t.status === 'approved')
  const pendingSchedule   = scheduleItems.filter((t) => t.status === 'suggested')
  const confirmedSchedule = scheduleItems.filter((t) => t.status === 'approved')
  const suggestedParking  = parkingItems.filter((t) => t.status === 'suggested')
  const approvedParking   = parkingItems.filter((t) => t.status === 'approved')

  const allApproved = tasks.filter((t) => t.status === 'approved')

  const updateTask = (id, patch) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))

  const approveTask = (id) => updateTask(id, { status: 'approved' })
  const rejectTask  = (id) => setTasks((prev) => prev.filter((t) => t.id !== id))
  const undoTask    = (id) => updateTask(id, { status: 'suggested' })
  const editTask    = (id, title) => updateTask(id, { title })

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('taskId', String(id))
    e.dataTransfer.effectAllowed = 'move'
  }
  const [dragOverCol, setDragOverCol] = useState(null)
  const handleDrop = (e, status) => {
    e.preventDefault()
    const id = Number(e.dataTransfer.getData('taskId'))
    if (id) updateTask(id, { status })
    setDragOverCol(null)
  }

  const handleSync = () => {
    if (allApproved.length === 0) return
    setSyncState('syncing')
    setTimeout(() => { setSyncState('done'); setTimeout(() => setSyncState('idle'), 3000) }, 1500)
  }

  return (
    <div className="rv-page">
      {/* Header */}
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
            <span className="rv-meeting-title">{mockMeetingSummary.title}</span>
            <span className="rv-meeting-meta">{mockMeetingSummary.date} · {mockMeetingSummary.duration}</span>
          </div>
        </div>
        <div className="rv-header-right">
          <button className="rv-btn rv-btn--ghost" onClick={() => navigate('/')}>← Dashboard</button>
          <button
            className={`rv-btn rv-btn--primary ${syncState === 'syncing' ? 'rv-btn--syncing' : ''} ${syncState === 'done' ? 'rv-btn--done' : ''}`}
            onClick={handleSync}
            disabled={syncState !== 'idle' || allApproved.length === 0}
          >
            {syncState === 'idle' && (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 3 21 3 21 8" /><line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" /><line x1="15" y1="15" x2="21" y2="21" />
                </svg>
                Sync to External System (API)
              </>
            )}
            {syncState === 'syncing' && <><span className="rv-spinner" />Syncing…</>}
            {syncState === 'done' && (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Synced {allApproved.length} items
              </>
            )}
          </button>
        </div>
      </header>

      <div className="rv-content">
        {/* Summary */}
        <div className="rv-summary">
          <div className="rv-summary-header">
            <div className="rv-summary-title-row">
              <span className="rv-section-label">AI Meeting Summary</span>
              <div className="rv-participants">
                {mockMeetingSummary.participants.map((p, i) => (
                  <span key={i} className="rv-participant-chip">{p}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="rv-summary-grid">
            <div className="rv-summary-block">
              <h4 className="rv-summary-block-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Key Decisions
              </h4>
              <ul className="rv-summary-list">
                {mockMeetingSummary.keyDecisions.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
            <div className="rv-summary-block">
              <h4 className="rv-summary-block-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Unresolved
              </h4>
              <ul className="rv-summary-list rv-summary-list--warn">
                {mockMeetingSummary.unresolvedItems.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </div>
            <div className="rv-summary-block rv-summary-block--full">
              <h4 className="rv-summary-block-title">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
                Next Steps
              </h4>
              <p className="rv-summary-text">{mockMeetingSummary.nextSteps}</p>
            </div>
          </div>
        </div>

        {/* Transcript */}
        <div className="rv-transcript">
          <div className="rv-transcript-header">
            <span className="rv-section-label">Full Transcript</span>
            <span className="rv-transcript-count">{mockTranscript.length} messages</span>
          </div>
          <div className="rv-transcript-feed">
            {mockTranscript.map((msg) => (
              <div className="rv-msg" key={msg.id}>
                <div className="rv-msg-avatar" style={{ background: speakerColor(msg.speaker) }}>
                  {speakerInitials(msg.speaker)}
                </div>
                <div className="rv-msg-body">
                  <div className="rv-msg-meta">
                    <span className="rv-msg-speaker">{msg.speaker}</span>
                    <span className="rv-msg-role">{msg.role}</span>
                    <span className="rv-msg-time">{msg.timestamp}</span>
                  </div>
                  <div className="rv-msg-text">{msg.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action items section with tabs */}
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
                ? 'Edit or reject suggestions before approving · Drag to move'
                : activeTab === 'schedule'
                ? 'Confirm meetings to schedule · Edit titles before confirming'
                : 'Review deferred topics · Approve to add to the Parking Lot'}
            </span>
          </div>

          {/* Tasks tab — kanban */}
          {activeTab === 'tasks' && (
            <div className="rv-kanban-board">
              {/* Suggestions */}
              <div
                className={`rv-col ${dragOverCol === 'suggested' ? 'rv-col--dragover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol('suggested') }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, 'suggested')}
              >
                <div className="rv-col-header">
                  <span className="rv-col-title">AI Suggestions</span>
                  <span className="rv-col-count">{suggestedTasks.length}</span>
                </div>
                <div className="rv-col-cards">
                  {suggestedTasks.map((task) => (
                    <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} className="rv-card-drag-wrapper">
                      <SuggestionCard task={task} onApprove={approveTask} onReject={rejectTask} onEdit={editTask} />
                    </div>
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

              {/* Approved */}
              <div
                className={`rv-col rv-col--approved ${dragOverCol === 'approved' ? 'rv-col--dragover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol('approved') }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, 'approved')}
              >
                <div className="rv-col-header">
                  <span className="rv-col-title">Approved</span>
                  <span className="rv-col-count rv-col-count--green">{approvedTasks.length}</span>
                </div>
                <div className="rv-col-cards">
                  {approvedTasks.map((task) => (
                    <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} className="rv-card-drag-wrapper">
                      <ApprovedCard task={task} onUndo={undoTask} />
                    </div>
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

          {/* Parking Lot tab — kanban */}
          {activeTab === 'parking' && (
            <div className="rv-kanban-board">
              <div
                className={`rv-col ${dragOverCol === 'suggested' ? 'rv-col--dragover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol('suggested') }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, 'suggested')}
              >
                <div className="rv-col-header">
                  <span className="rv-col-title">Deferred Topics</span>
                  <span className="rv-col-count">{suggestedParking.length}</span>
                </div>
                <div className="rv-col-cards">
                  {suggestedParking.map((task) => (
                    <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} className="rv-card-drag-wrapper">
                      <SuggestionCard task={task} onApprove={approveTask} onReject={rejectTask} onEdit={editTask} />
                    </div>
                  ))}
                  {suggestedParking.length === 0 && (
                    <div className="rv-col-empty">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      No deferred topics
                    </div>
                  )}
                </div>
              </div>

              <div
                className={`rv-col rv-col--approved ${dragOverCol === 'approved' ? 'rv-col--dragover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOverCol('approved') }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={(e) => handleDrop(e, 'approved')}
              >
                <div className="rv-col-header">
                  <span className="rv-col-title">Added to Parking Lot</span>
                  <span className="rv-col-count rv-col-count--green">{approvedParking.length}</span>
                </div>
                <div className="rv-col-cards">
                  {approvedParking.map((task) => (
                    <div key={task.id} draggable onDragStart={(e) => handleDragStart(e, task.id)} className="rv-card-drag-wrapper">
                      <ApprovedCard task={task} onUndo={undoTask} />
                    </div>
                  ))}
                  {approvedParking.length === 0 && (
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

          {/* To Schedule tab — list */}
          {activeTab === 'schedule' && (
            <div className="rv-schedule-list">
              {pendingSchedule.length > 0 && (
                <div className="rv-schedule-group">
                  <div className="rv-schedule-group-label">
                    Pending
                    <span className="rv-schedule-group-count">{pendingSchedule.length}</span>
                  </div>
                  {pendingSchedule.map((task) => (
                    <ScheduleItem
                      key={task.id}
                      task={task}
                      onConfirm={approveTask}
                      onReject={rejectTask}
                      onEdit={editTask}
                    />
                  ))}
                </div>
              )}

              {confirmedSchedule.length > 0 && (
                <div className="rv-schedule-group">
                  <div className="rv-schedule-group-label rv-schedule-group-label--confirmed">
                    Confirmed
                    <span className="rv-schedule-group-count rv-schedule-group-count--green">{confirmedSchedule.length}</span>
                  </div>
                  {confirmedSchedule.map((task) => (
                    <ScheduleItem
                      key={task.id}
                      task={task}
                      onConfirm={approveTask}
                      onReject={undoTask}
                      onEdit={editTask}
                    />
                  ))}
                </div>
              )}

              {pendingSchedule.length === 0 && confirmedSchedule.length === 0 && (
                <div className="rv-col-empty" style={{ padding: '48px' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  No meetings to schedule
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {syncState === 'done' && (
        <div className="rv-toast">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Successfully synced {allApproved.length} approved items to external system
        </div>
      )}
    </div>
  )
}

export default Review
