import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getAllActions, getMembers, updateAction, getTopics, addMeetingTopic, removeMeetingTopic } from '../api'
import { buildArchiveItems } from '../utils'
import MeetingTopicTags from '../components/MeetingTopicTags'
import './GlobalKanban.css'
import './GlobalParkingLot.css'

function ArchiveCard({ item, members, teamTopics, onRefresh }) {
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
    <div className="pl-item" style={{ opacity: 0.85 }}>
      <div className="pl-item-body">
        <p className="pl-item-text">{item.title}</p>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
          <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-dim)', fontWeight: 600 }}>
            {item.action_type === 'parking_lot' ? 'PARKING LOT' : item.action_type === 'to_schedule' ? 'SCHEDULE' : 'TODO'}
          </span>
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
          <button 
            onClick={handleRestore} 
            disabled={restoring}
            style={{ padding: '4px 10px', fontSize: '12px', cursor: 'pointer', background: 'transparent', color: 'var(--accent)', border: '1px solid var(--border)', borderRadius: '4px', fontWeight: 600 }}
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
  const [teamTopics, setTeamTopics] = useState([])
  const [topicFilter, setTopicFilter] = useState([])

  const toggleTopicFilter = (id) => {
    setTopicFilter(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id])
  }

  const filteredItems = items.filter(t => {
    if (topicFilter.length === 0) return true
    return topicFilter.every(id => (t.topics || []).some(top => top.id === id))
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
      getTopics(teamId).then(data => setTeamTopics(data.topics ?? [])).catch(() => {})
    }
  }, [teamId])

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="page-title">Archive</h1>
          <p className="page-sub">Archived tasks, parking lot items, and deferred topics</p>
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
                <ArchiveCard key={item.id} item={item} members={members} teamTopics={teamTopics} onRefresh={loadData} />
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
