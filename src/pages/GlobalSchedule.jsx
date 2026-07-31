import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getAllActions, getMembers, getMeetings, createAction, updateAction } from '../api'
import { buildScheduleItems } from '../utils'
import './GlobalKanban.css'

function ScheduleRow({ item, members, onRefresh }) {
  const dateMatch = item.title.match(/^\[DATE:(.*?)\]\s*/)
  const targetDate = dateMatch ? dateMatch[1] : ''
  const displayTitle = dateMatch ? item.title.substring(dateMatch[0].length) : item.title

  const handleDateChange = async (e) => {
    const newDate = e.target.value
    const newContent = newDate ? `[DATE:${newDate}] ${displayTitle}` : displayTitle
    try {
      await updateAction(item.meetingId, item.id, undefined, newContent)
      onRefresh()
    } catch (err) {
      console.error(err)
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

  return (
    <div className="gk-schedule-row">
      <div className="gk-schedule-row-left">
        <div className="gk-schedule-icon">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
      </div>

      <div className="gk-schedule-row-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p className="gk-schedule-row-title">{displayTitle}</p>
          <div className="gk-schedule-row-meta">
            <span>{item.meeting}</span>
            {item.assignee && <span style={{ marginLeft: '12px' }}>Assigned: {item.assignee.name}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={handleArchive} 
            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}
          >
            Archive
          </button>
          <input 
            type="date" 
            value={targetDate} 
            onChange={handleDateChange}
            style={{ background: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '4px' }}
          />
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
  
  const [showModal, setShowModal] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [newItemAssignee, setNewItemAssignee] = useState('')
  const [newItemMeeting, setNewItemMeeting] = useState('')

  const loadData = () => {
    getAllActions(teamId)
      .then((data) => setTasks(buildScheduleItems(data)))
      .catch(() => {})
  }

  useEffect(() => {
    loadData()
    if (teamId) {
      getMembers(teamId).then(setMembers).catch(() => {})
      getMeetings(teamId).then(meets => {
        setMeetings(meets)
        if (meets.length > 0) setNewItemMeeting(meets[0].id)
      }).catch(() => {})
    }
  }, [teamId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newItemMeeting || !newItemText.trim()) return
    try {
      await createAction(newItemMeeting, 'to_schedule', newItemText, newItemAssignee ? parseInt(newItemAssignee) : null)
      setShowModal(false)
      setNewItemText('')
      loadData()
    } catch (err) {
      console.error(err)
      alert('Failed to add item')
    }
  }

  return (
    <div className="gk-page">
      <header className="gk-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="gk-title">Schedule</h1>
          <div className="gk-filters">
            <span className="gk-task-count">{tasks.length} items</span>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Add Item
        </button>
      </header>

      {showModal && (
        <div className="gk-add-panel">
          <h3>Add Schedule Item</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              className="gk-add-input"
              type="text"
              placeholder="Item content..."
              value={newItemText}
              onChange={e => setNewItemText(e.target.value)}
              required
            />
            <div className="gk-add-row">
              <select
                className="gk-form-select"
                value={newItemAssignee}
                onChange={e => setNewItemAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <select
                className="gk-form-select"
                value={newItemMeeting}
                onChange={e => setNewItemMeeting(e.target.value)}
                required
              >
                {meetings.length === 0 && <option value="">No meetings available</option>}
                {meetings.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div className="gk-add-actions">
              <button type="button" className="gk-add-btn gk-add-btn--cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="gk-add-btn gk-add-btn--save">Save</button>
            </div>
          </form>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="gk-schedule-section">
          <h2 className="gk-schedule-section-title">To Schedule ({tasks.length})</h2>
          {tasks.map((t) => (
            <ScheduleRow key={t.id} item={t} members={members} onRefresh={loadData} />
          ))}
        </div>
      )}

      {tasks.length === 0 && !showModal && (
        <div className="gk-col-empty" style={{ padding: '48px' }}>
          No items to schedule
        </div>
      )}
    </div>
  )
}
