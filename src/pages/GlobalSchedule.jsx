import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getAllActions, getMeetings, getMembers, getTopics, createAction, updateAction, deleteAction, addMeetingTopic, removeMeetingTopic } from '../api'
import { buildScheduleItems } from '../utils'
import MeetingTopicTags from '../components/MeetingTopicTags'
import './GlobalKanban.css'

function ScheduleRow({ item, members, teamTopics, onRefresh }) {
  const [isEditing, setIsEditing] = useState(false)
  const [promoting, setPromoting] = useState(false)

  const dateMatch = item.title.match(/^\[DATE:(.*?)\]\s*/)
  const targetDate = dateMatch ? dateMatch[1] : ''
  const displayTitle = dateMatch ? item.title.substring(dateMatch[0].length) : item.title
  const [editTitle, setEditTitle] = useState(displayTitle)

  const handleSaveTitle = async () => {
    setIsEditing(false)
    if (editTitle === displayTitle) return
    const newContent = targetDate ? `[DATE:${targetDate}] ${editTitle}` : editTitle
    try {
      await updateAction(item.meetingId, item.id, undefined, newContent)
      onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDateChange = async (newDate) => {
    const newContent = newDate ? `[DATE:${newDate}] ${displayTitle}` : displayTitle
    try {
      await updateAction(item.meetingId, item.id, undefined, newContent)
      onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const handleAssigneeChange = async (e) => {
    const newAssignee = e.target.value ? parseInt(e.target.value) : null
    try {
      await updateAction(item.meetingId, item.id, undefined, undefined, newAssignee)
      onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const handlePromote = async () => {
    setPromoting(true)
    try {
      await updateAction(item.meetingId, item.id, undefined, undefined, undefined, 'to_do')
      onRefresh()
    } catch (err) {
      setPromoting(false)
    }
  }

  const handleArchive = async () => {
    try {
      await updateAction(item.meetingId, item.id, 'archived')
      onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this schedule item?')) return
    try {
      await deleteAction(item.meetingId, item.id)
      onRefresh()
    } catch (err) {
      console.error(err)
    }
  }

  const setQuickDate = (daysFromNow) => {
    const d = new Date(Date.now() + daysFromNow * 86400000)
    handleDateChange(d.toISOString().split('T')[0])
  }

  return (
    <div className={`gk-schedule-row ${targetDate ? 'gk-schedule-row--scheduled' : ''}`}>
      <div className="gk-schedule-row-left">
        <div className={`gk-schedule-icon ${targetDate ? 'gk-schedule-icon--done' : ''}`} title={targetDate ? `Scheduled for ${targetDate}` : 'Pending schedule date'}>
          {targetDate ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          )}
        </div>
      </div>

      <div className="gk-schedule-row-body">
        {isEditing ? (
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveTitle}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
            autoFocus
            style={{ width: '100%', padding: '4px 8px', background: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '6px' }}
          />
        ) : (
          <p
            className="gk-schedule-row-title"
            onClick={() => setIsEditing(true)}
            style={{ cursor: 'pointer', margin: '0 0 6px' }}
            title="Click to edit"
          >
            {displayTitle}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{item.meeting}</span>
          <MeetingTopicTags
            meetingTopics={item.topics || []}
            teamTopics={teamTopics || []}
            onAdd={async (topicId) => {
              try {
                await addMeetingTopic(item.meetingId, topicId)
                onRefresh()
              } catch (err) {
                console.error(err)
              }
            }}
            onRemove={async (topicId) => {
              try {
                await removeMeetingTopic(item.meetingId, topicId)
                onRefresh()
              } catch (err) {
                console.error(err)
              }
            }}
            dropUp
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {item.assignee?.photo_url ? (
                <img src={item.assignee.photo_url} alt="avatar" style={{ width: 22, height: 22, borderRadius: '50%' }} />
              ) : (
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                  {item.assignee?.name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <select
                value={item.assignee?.id ?? ''}
                onChange={handleAssigneeChange}
                style={{ background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px', padding: '2px 6px', cursor: 'pointer' }}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {targetDate && (
              <span className="gk-schedule-date-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                {targetDate}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setQuickDate(0)}
                style={{ fontSize: '11px', padding: '3px 7px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text-2)', cursor: 'pointer' }}
                title="Schedule for Today"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(1)}
                style={{ fontSize: '11px', padding: '3px 7px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text-2)', cursor: 'pointer' }}
                title="Schedule for Tomorrow"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setQuickDate(7)}
                style={{ fontSize: '11px', padding: '3px 7px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-3)', color: 'var(--text-2)', cursor: 'pointer' }}
                title="Schedule for Next Week"
              >
                +1W
              </button>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => handleDateChange(e.target.value)}
                style={{ background: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '2px 6px', fontSize: '12px' }}
              />
              {targetDate && (
                <button
                  type="button"
                  onClick={() => handleDateChange('')}
                  style={{ fontSize: '11px', padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}
                  title="Clear Date"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              onClick={handlePromote}
              disabled={promoting}
              style={{ padding: '4px 9px', fontSize: '12px', cursor: 'pointer', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '4px', fontWeight: 600 }}
              title="Move to Kanban board as an active task"
            >
              {promoting ? 'Promoting...' : 'Promote to Task'}
            </button>
            <button
              onClick={handleArchive}
              style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}
              title="Archive Item"
            >
              Archive
            </button>
            <button
              onClick={handleDelete}
              className="gk-card-delete-btn"
              style={{ opacity: 1, padding: '4px' }}
              title="Delete Item"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GlobalSchedule() {
  const { teamId } = useParams()
  const [tasks, setTasks] = useState([])
  const [members, setMembers] = useState([])
  const [meetings, setMeetings] = useState([])
  const [teamTopics, setTeamTopics] = useState([])
  const [topicFilter, setTopicFilter] = useState([])
  const [statusFilter, setStatusFilter] = useState('all')

  const [showModal, setShowModal] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [newItemMeeting, setNewItemMeeting] = useState('')
  const [newItemAssignee, setNewItemAssignee] = useState('')
  const [newItemDate, setNewItemDate] = useState('')

  const loadData = () => {
    getAllActions(teamId)
      .then((data) => setTasks(buildScheduleItems(data)))
      .catch(() => {})
  }

  useEffect(() => {
    loadData()
    if (teamId) {
      getMembers(teamId).then(setMembers).catch(() => {})
      getMeetings(teamId).then((meets) => {
        setMeetings(meets)
        if (meets.length > 0) setNewItemMeeting(meets[0].id)
      }).catch(() => {})
      getTopics(teamId).then((data) => setTeamTopics(data.topics ?? [])).catch(() => {})
    }
  }, [teamId])

  const toggleTopicFilter = (id) => {
    setTopicFilter((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]))
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newItemMeeting || !newItemText.trim()) return
    const content = newItemDate ? `[DATE:${newItemDate}] ${newItemText.trim()}` : newItemText.trim()
    try {
      await createAction(newItemMeeting, 'to_schedule', content, newItemAssignee ? parseInt(newItemAssignee) : null)
      setShowModal(false)
      setNewItemText('')
      setNewItemDate('')
      setNewItemAssignee('')
      loadData()
    } catch (err) {
      console.error(err)
      alert('Failed to add item')
    }
  }

  const pendingItems = tasks.filter((t) => !t.title.match(/^\[DATE:(.*?)\]\s*/))
  const scheduledItems = tasks
    .filter((t) => t.title.match(/^\[DATE:(.*?)\]\s*/))
    .sort((a, b) => {
      const dateA = a.title.match(/^\[DATE:(.*?)\]\s*/)?.[1] || ''
      const dateB = b.title.match(/^\[DATE:(.*?)\]\s*/)?.[1] || ''
      return dateA.localeCompare(dateB)
    })

  const filteredTasks = tasks
    .filter((t) => {
      const hasDate = Boolean(t.title.match(/^\[DATE:(.*?)\]\s*/))
      if (statusFilter === 'pending') return !hasDate
      if (statusFilter === 'scheduled') return hasDate
      return true
    })
    .filter((t) => {
      if (topicFilter.length === 0) return true
      return topicFilter.every((id) => (t.topics || []).some((top) => top.id === id))
    })

  return (
    <div className="page-container">
      <header className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Schedule</h1>
          <p className="page-sub">Action items requiring follow-up meetings or scheduled dates</p>
          <div className="page-header-meta">
            <span className="page-count-badge">
              {filteredTasks.length} item{filteredTasks.length !== 1 ? 's' : ''}
            </span>
            <div className="page-filter-tabs">
              {[
                { key: 'all', label: `All (${tasks.length})` },
                { key: 'pending', label: `Needs Date (${pendingItems.length})` },
                { key: 'scheduled', label: `Scheduled (${scheduledItems.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`page-filter-tab ${statusFilter === tab.key ? 'page-filter-tab--active' : ''}`}
                  onClick={() => setStatusFilter(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {teamTopics.length > 0 && (
              <div className="gk-topic-filter-row">
                <span className="gk-topic-filter-label">Topics:</span>
                {teamTopics.map((t) => {
                  const active = topicFilter.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      className={`gk-topic-filter-chip ${active ? 'gk-topic-filter-chip--active' : ''}`}
                      style={active ? { background: t.color + '22', color: t.color, borderColor: t.color + '88' } : {}}
                      onClick={() => toggleTopicFilter(t.id)}
                    >
                      <span className="gk-topic-filter-dot" style={{ background: t.color }} />
                      {t.name}
                    </button>
                  )
                })}
                {topicFilter.length > 0 && (
                  <button className="gk-topic-filter-clear" onClick={() => setTopicFilter([])}>
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          className="page-primary-btn"
          onClick={() => setShowModal(true)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Schedule Item
        </button>
      </header>

      {showModal && (
        <div className="gk-add-panel">
          <h3>Add Schedule Item</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              className="gk-add-input"
              type="text"
              placeholder="Item content or topic to schedule..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              required
            />
            <div className="gk-add-row" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <select
                className="gk-form-select"
                value={newItemMeeting}
                onChange={(e) => setNewItemMeeting(e.target.value)}
                required
              >
                {meetings.length === 0 && <option value="">No meetings available</option>}
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
              <select
                className="gk-form-select"
                value={newItemAssignee}
                onChange={(e) => setNewItemAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <input
                type="date"
                className="gk-add-input"
                style={{ width: 'auto', flex: 1 }}
                value={newItemDate}
                onChange={(e) => setNewItemDate(e.target.value)}
                placeholder="Target date"
              />
            </div>
            <div className="gk-add-actions">
              <button type="button" className="gk-add-btn gk-add-btn--cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="gk-add-btn gk-add-btn--save">Save</button>
            </div>
          </form>
        </div>
      )}

      {filteredTasks.length > 0 && (
        <div className="gk-schedule-list">
          {filteredTasks.map((t) => (
            <ScheduleRow key={t.id} item={t} members={members} teamTopics={teamTopics} onRefresh={loadData} />
          ))}
        </div>
      )}

      {filteredTasks.length === 0 && !showModal && (
        <div className="gk-schedule-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          No schedule items match current filters
        </div>
      )}
    </div>
  )
}
