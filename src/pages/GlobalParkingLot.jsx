import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getAllActions, getMeetings, createAction, updateAction, getTopics, addMeetingTopic, removeMeetingTopic } from '../api'
import { buildParkingLotItems } from '../utils'
import MeetingTopicTags from '../components/MeetingTopicTags'
import './GlobalKanban.css'
import './GlobalParkingLot.css'

function ParkingCard({ item, teamTopics, onRefresh }) {
  const [promoting, setPromoting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(item.text)

  const handleSaveText = async () => {
    setIsEditing(false)
    if (editText === item.text) return
    try {
      await updateAction(item.meetingId, item.id, undefined, editText)
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

  return (
    <div className="pl-item">
      <div className="pl-item-body">
        {isEditing ? (
          <input 
            value={editText} 
            onChange={e => setEditText(e.target.value)} 
            onBlur={handleSaveText}
            onKeyDown={e => e.key === 'Enter' && handleSaveText()}
            autoFocus
            style={{ width: '100%', padding: '4px', background: 'var(--bg-input)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}
          />
        ) : (
          <p className="pl-item-text" onClick={() => setIsEditing(true)} style={{ cursor: 'pointer', outline: 'none' }} title="Click to edit">{item.text}</p>
        )}
        <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
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
        {item.assignee && (
          <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-dim)' }}>
            Assigned to: {item.assignee.name}
          </div>
        )}
        <div className="pl-item-footer" style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="pl-item-meeting" style={{ marginRight: '8px' }}>{item.meeting}</span>
            <span className="pl-item-date">{item.date}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={handleArchive} 
              style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}
            >
              Archive
            </button>
            <button 
              onClick={handlePromote} 
              disabled={promoting}
              style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '4px' }}
            >
              {promoting ? 'Promoting...' : 'Promote to Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GlobalParkingLot() {
  const { teamId } = useParams()
  const [items, setItems] = useState([])
  const [meetings, setMeetings] = useState([])
  const [teamTopics, setTeamTopics] = useState([])
  const [topicFilter, setTopicFilter] = useState([])

  const [showModal, setShowModal] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [newItemMeeting, setNewItemMeeting] = useState('')

  const toggleTopicFilter = (id) => {
    setTopicFilter(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  const filteredItems = items.filter(t => {
    if (topicFilter.length === 0) return true
    return topicFilter.every(id => (t.topics || []).some(top => top.id === id))
  })

  const loadData = () => {
    getAllActions(teamId)
      .then((data) => setItems(buildParkingLotItems(data)))
      .catch(() => {})
  }

  useEffect(() => {
    loadData()
    if (teamId) {
      getMeetings(teamId).then(meets => {
        setMeetings(meets)
        if (meets.length > 0) setNewItemMeeting(meets[0].id)
      }).catch(() => {})
      getTopics(teamId).then(data => setTeamTopics(data.topics ?? [])).catch(() => {})
    }
  }, [teamId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!newItemMeeting || !newItemText.trim()) return
    try {
      await createAction(newItemMeeting, 'parking_lot', newItemText)
      setShowModal(false)
      setNewItemText('')
      loadData()
    } catch (err) {
      console.error(err)
      alert('Failed to add item')
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Parking Lot</h1>
          <p className="page-sub">Deferred topics, questions, and blockers from all meetings</p>
          <div className="page-header-meta">
            <span className="page-count-badge">
              {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
            </span>
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
          Add Item
        </button>
      </div>

      {showModal && (
        <div className="gk-add-panel">
          <h3>Add Parking Lot Item</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input
              className="gk-add-input"
              type="text"
              placeholder="Item content..."
              value={newItemText}
              onChange={e => setNewItemText(e.target.value)}
              required
            />
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
            <div className="gk-add-actions">
              <button type="button" className="gk-add-btn gk-add-btn--cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="gk-add-btn gk-add-btn--save">Save</button>
            </div>
          </form>
        </div>
      )}

      {filteredItems.length > 0 && (
        <div className="pl-groups">
          <div className="pl-group">
            <div className="pl-group-header">
              <span className="pl-group-title">All Items</span>
              <span className="pl-group-meta">{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pl-group-items">
              {filteredItems.map((item) => (
                <ParkingCard key={item.id} item={item} teamTopics={teamTopics} onRefresh={loadData} />
              ))}
            </div>
          </div>
        </div>
      )}

      {filteredItems.length === 0 && !showModal && (
        <div className="pl-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          No parking lot items
        </div>
      )}
    </div>
  )
}
