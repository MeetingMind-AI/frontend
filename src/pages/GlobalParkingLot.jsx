import { useState, useEffect } from 'react'
import { getAllActions } from '../api'
import { buildParkingLotItems } from '../utils'
import './GlobalParkingLot.css'

function ParkingCard({ item, onToggle }) {
  return (
    <div className={`pl-item ${item.status === 'resolved' ? 'pl-item--resolved' : ''}`}>
      <button
        className={`pl-item-toggle ${item.status === 'resolved' ? 'pl-item-toggle--done' : ''}`}
        onClick={() => onToggle(item.id)}
        title={item.status === 'resolved' ? 'Reopen' : 'Mark resolved'}
      >
        {item.status === 'resolved' ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
          </svg>
        )}
      </button>
      <div className="pl-item-body">
        <p className="pl-item-text">{item.text}</p>
        <div className="pl-item-footer">
          <span className={`pl-item-status pl-item-status--${item.status}`}>
            {item.status}
          </span>
          <span className="pl-item-meeting">{item.meeting}</span>
          <span className="pl-item-date">{item.date}</span>
        </div>
      </div>
    </div>
  )
}

export default function GlobalParkingLot() {
  const [items, setItems] = useState([])

  useEffect(() => {
    getAllActions()
      .then((data) => setItems(buildParkingLotItems(data)))
      .catch(() => {})
  }, [])
  const [filter, setFilter] = useState('all')

  const toggleStatus = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'open' ? 'resolved' : 'open' }
          : item
      )
    )
  }

  const visible = items.filter((i) => filter === 'all' || i.status === filter)
  const openItems = items.filter((i) => i.status === 'open')
  const resolvedItems = items.filter((i) => i.status === 'resolved')

  return (
    <div className="pl-page">
      <div className="pl-page-header">
        <div>
          <h1 className="pl-page-title">Parking Lot</h1>
          <p className="pl-page-sub">Deferred topics and blockers from all meetings</p>
        </div>
        <div className="pl-header-stats">
          <div className="pl-header-stat">
            <span className="pl-header-num" style={{ color: 'var(--yellow)' }}>{openItems.length}</span>
            <span className="pl-header-label">open</span>
          </div>
          <div className="pl-header-divider" />
          <div className="pl-header-stat">
            <span className="pl-header-num" style={{ color: 'var(--green)' }}>{resolvedItems.length}</span>
            <span className="pl-header-label">resolved</span>
          </div>
        </div>
      </div>

      <div className="pl-filters">
        {[
          { key: 'all', label: `All (${items.length})` },
          { key: 'open', label: `Open (${openItems.length})` },
          { key: 'resolved', label: `Resolved (${resolvedItems.length})` },
        ].map((t) => (
          <button
            key={t.key}
            className={`pl-filter-tab ${filter === t.key ? 'pl-filter-tab--active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {visible.length > 0 && (
        <div className="pl-groups">
          <div className="pl-group">
            <div className="pl-group-header">
              <span className="pl-group-title">{filter === 'all' ? 'All Items' : filter === 'open' ? 'Open' : 'Resolved'}</span>
              <span className="pl-group-meta">{visible.length} item{visible.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pl-group-items">
              {visible.map((item) => (
                <ParkingCard key={item.id} item={item} onToggle={toggleStatus} />
              ))}
            </div>
          </div>
        </div>
      )}

      {visible.length === 0 && (
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
