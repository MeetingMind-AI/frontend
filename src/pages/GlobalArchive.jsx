import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getAllActions, getMembers, updateAction } from '../api'
import { buildArchiveItems } from '../utils'
import './GlobalParkingLot.css'

function ArchiveCard({ item, members, onRefresh }) {
  const [restoring, setRestoring] = useState(false)

  const handleRestore = async () => {
    setRestoring(true)
    try {
      await updateAction(item.meetingId, item.id, 'accepted')
      onRefresh()
    } catch (err) {
      console.error(err)
      setRestoring(false)
    }
  }

  return (
    <div className="pl-item" style={{ opacity: 0.8 }}>
      <div className="pl-item-body">
        <p className="pl-item-text">{item.title}</p>
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-dim)' }}>
            {item.action_type.toUpperCase()}
          </span>
          {item.tags.includes('technical') && (
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(79, 142, 247, 0.2)', color: '#4f8ef7' }}>Tech</span>
          )}
          {item.tags.includes('business') && (
            <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'rgba(63, 185, 80, 0.2)', color: '#3fb950' }}>Biz</span>
          )}
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
          <button 
            onClick={handleRestore} 
            disabled={restoring}
            style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer', background: 'transparent', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px' }}
          >
            {restoring ? 'Restoring...' : 'Restore'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function GlobalArchive() {
  const { teamId } = useParams()
  const [items, setItems] = useState([])
  const [members, setMembers] = useState([])
  const [filterTags, setFilterTags] = useState([])

  const toggleFilter = (tag) => setFilterTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  
  const filteredItems = items.filter(t => {
    if (filterTags.length === 0) return true
    return filterTags.every(ft => t.tags.includes(ft))
  })

  const loadData = () => {
    getAllActions(teamId)
      .then((data) => setItems(buildArchiveItems(data)))
      .catch(() => {})
  }

  useEffect(() => {
    loadData()
    if (teamId) {
      getMembers(teamId).then(setMembers).catch(() => {})
    }
  }, [teamId])

  return (
    <div className="pl-page">
      <div className="pl-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="pl-page-title">Archive</h1>
          <p className="pl-page-sub">Archived tasks and topics from all meetings</p>
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
      </div>

      {filteredItems.length > 0 && (
        <div className="pl-groups">
          <div className="pl-group">
            <div className="pl-group-header">
              <span className="pl-group-title">All Archived Items</span>
              <span className="pl-group-meta">{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pl-group-items">
              {filteredItems.map((item) => (
                <ArchiveCard key={item.id} item={item} members={members} onRefresh={loadData} />
              ))}
            </div>
          </div>
        </div>
      )}

      {filteredItems.length === 0 && (
        <div className="pl-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
          No archived items
        </div>
      )}
    </div>
  )
}
