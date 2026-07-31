import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getAllActions, getMembers, getMeetings, createAction, updateAction } from '../api'
import { buildParkingLotItems } from '../utils'
import './GlobalKanban.css'
import './GlobalParkingLot.css'

function ParkingCard({ item, members, onRefresh }) {
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

  const toggleTag = async (tag) => {
    const newTags = item.tags.includes(tag) ? item.tags.filter(t => t !== tag) : [...item.tags, tag]
    try {
      await updateAction(item.meetingId, item.id, undefined, undefined, undefined, undefined, newTags)
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
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
          <button 
            onClick={() => toggleTag('technical')}
            style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer', background: item.tags.includes('technical') ? 'rgba(79, 142, 247, 0.2)' : 'transparent', color: item.tags.includes('technical') ? '#4f8ef7' : 'var(--text-dim)' }}
          >
            Tech
          </button>
          <button 
            onClick={() => toggleTag('business')}
            style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer', background: item.tags.includes('business') ? 'rgba(63, 185, 80, 0.2)' : 'transparent', color: item.tags.includes('business') ? '#3fb950' : 'var(--text-dim)' }}
          >
            Biz
          </button>
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
  const [members, setMembers] = useState([])
  const [meetings, setMeetings] = useState([])
  
  const [showModal, setShowModal] = useState(false)
  const [newItemText, setNewItemText] = useState('')
  const [newItemAssignee, setNewItemAssignee] = useState('')
  const [newItemMeeting, setNewItemMeeting] = useState('')
  const [filterTags, setFilterTags] = useState([])

  const toggleFilter = (tag) => setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  
  const filteredItems = items.filter(t => {
    if (filterTags.length === 0) return true
    return filterTags.every(ft => t.tags.includes(ft))
  })

  const loadData = () => {
    getAllActions(teamId)
      .then((data) => setItems(buildParkingLotItems(data)))
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
      await createAction(newItemMeeting, 'parking_lot', newItemText, newItemAssignee ? parseInt(newItemAssignee) : null)
      setShowModal(false)
      setNewItemText('')
      loadData()
    } catch (err) {
      console.error(err)
      alert('Failed to add item')
    }
  }

  return (
    <div className="pl-page">
      <div className="pl-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="pl-page-title">Parking Lot</h1>
          <p className="pl-page-sub">Deferred topics and blockers from all meetings</p>
          <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
            <button 
              onClick={() => toggleFilter('technical')}
              style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer', background: filterTags.includes('technical') ? '#4f8ef7' : 'transparent', color: filterTags.includes('technical') ? '#fff' : 'var(--text-dim)' }}
            >
              Tech
            </button>
            <button 
              onClick={() => toggleFilter('business')}
              style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border)', cursor: 'pointer', background: filterTags.includes('business') ? '#3fb950' : 'transparent', color: filterTags.includes('business') ? '#fff' : 'var(--text-dim)' }}
            >
              Biz
            </button>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Add Item
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

      {filteredItems.length > 0 && (
        <div className="pl-groups">
          <div className="pl-group">
            <div className="pl-group-header">
              <span className="pl-group-title">All Items</span>
              <span className="pl-group-meta">{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pl-group-items">
              {filteredItems.map((item) => (
                <ParkingCard key={item.id} item={item} members={members} onRefresh={loadData} />
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
