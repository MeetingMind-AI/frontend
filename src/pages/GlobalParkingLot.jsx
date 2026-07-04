import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getAllActions, getMembers, getMeetings, createAction, updateAction } from '../api'
import { buildParkingLotItems } from '../utils'
import './GlobalParkingLot.css'

function ParkingCard({ item, members, onRefresh }) {
  const [promoting, setPromoting] = useState(false)

  const handlePromote = async () => {
    setPromoting(true)
    try {
      await updateAction(item.meetingId, item.id, undefined, undefined, undefined, 'to_do')
      onRefresh()
    } catch (err) {
      console.error(err)
      setPromoting(false)
    }
  }

  return (
    <div className="pl-item">
      <div className="pl-item-body">
        <p className="pl-item-text">{item.text}</p>
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

  const loadData = () => {
    getAllActions(teamId)
      .then((data) => setItems(buildParkingLotItems(data)))
      .catch(() => {})
  }

  useEffect(() => {
    loadData()
    if (teamId) {
      getMembers(teamId).then(setMembers).catch(() => {})
      getMeetings(teamId).then(data => {
        setMeetings(data)
        if (data.length > 0) setNewItemMeeting(data[0].id)
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
        </div>
        <button 
          onClick={() => setShowModal(true)}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          + Add Item
        </button>
      </div>

      {showModal && (
        <div style={{ padding: '16px', background: 'var(--bg-card)', borderRadius: '8px', marginBottom: '24px', border: '1px solid var(--border)' }}>
          <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Add Parking Lot Item</h3>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input 
              type="text" 
              placeholder="Item content..." 
              value={newItemText} 
              onChange={e => setNewItemText(e.target.value)}
              style={{ padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px' }}
              required
            />
            <div style={{ display: 'flex', gap: '12px' }}>
              <select 
                value={newItemAssignee} 
                onChange={e => setNewItemAssignee(e.target.value)}
                style={{ flex: 1, padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px' }}
              >
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              <select 
                value={newItemMeeting} 
                onChange={e => setNewItemMeeting(e.target.value)}
                style={{ flex: 1, padding: '8px', background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px' }}
                required
              >
                {meetings.length === 0 && <option value="">No meetings available</option>}
                {meetings.map(m => (
                  <option key={m.id} value={m.id}>{m.title}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '8px 16px', background: 'var(--accent)', color: 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
            </div>
          </form>
        </div>
      )}

      {items.length > 0 && (
        <div className="pl-groups">
          <div className="pl-group">
            <div className="pl-group-header">
              <span className="pl-group-title">All Items</span>
              <span className="pl-group-meta">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pl-group-items">
              {items.map((item) => (
                <ParkingCard key={item.id} item={item} members={members} onRefresh={loadData} />
              ))}
            </div>
          </div>
        </div>
      )}

      {items.length === 0 && !showModal && (
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
