import { useState, useEffect } from 'react'
import { getMeetings } from '../api'
import { buildParkingLotItems } from '../utils'
import './GlobalParkingLot.css'

export default function GlobalParkingLot() {
  const [items, setItems] = useState([])

  useEffect(() => {
    getMeetings()
      .then((data) => setItems(buildParkingLotItems(data.meetings ?? [])))
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
    <div className="gk-page">
      <header className="gk-header">
        <h1 className="gk-title">Parking Lot</h1>
        <div className="gk-filters">
          <span className="gk-task-count">{openItems.length} open</span>
          {resolvedItems.length > 0 && (
            <span className="gk-task-count gk-task-count--resolved">{resolvedItems.length} resolved</span>
          )}
        </div>
      </header>

      <div className="gk-tabs" style={{ padding: '16px 24px 0' }}>
        {[
          { key: 'all', label: `All (${items.length})` },
          { key: 'open', label: `Open (${openItems.length})` },
          { key: 'resolved', label: `Resolved (${resolvedItems.length})` },
        ].map((t) => (
          <button
            key={t.key}
            className={`gk-tab ${filter === t.key ? 'gk-tab--active' : ''}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="gk-parking-list">
        {visible.map((item) => (
          <div key={item.id} className={`gk-parking-row ${item.status === 'resolved' ? 'gk-parking-row--resolved' : ''}`}>
            <div className="gk-parking-row-left">
              <button
                className={`gk-parking-check ${item.status === 'resolved' ? 'gk-parking-check--done' : ''}`}
                onClick={() => toggleStatus(item.id)}
                title={item.status === 'resolved' ? 'Reopen' : 'Mark resolved'}
              >
                {item.status === 'resolved' ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
              </button>
            </div>
            <div className="gk-parking-row-body">
              <p className="gk-parking-row-text">{item.text}</p>
              <div className="gk-parking-row-meta">
                <span className="gk-parking-meeting">{item.meeting}</span>
                <span className="gk-parking-date">{item.date}</span>
              </div>
            </div>
            {item.status === 'resolved' && (
              <span className="gk-parking-resolved-badge">Resolved</span>
            )}
          </div>
        ))}
        {visible.length === 0 && (
          <div className="gk-col-empty" style={{ padding: '48px' }}>
            No items
          </div>
        )}
      </div>
    </div>
  )
}
