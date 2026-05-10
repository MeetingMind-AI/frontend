import { useState, useEffect } from 'react'
import { mockAllParkingLotItems } from '../mockData'
import { getMeetings } from '../api'
import { useDemoMode } from '../DemoContext'
import { buildParkingLotItems } from '../utils'
import './GlobalParkingLot.css'

export default function GlobalParkingLot() {
  const { demo } = useDemoMode()
  const [items, setItems] = useState(demo ? mockAllParkingLotItems : [])

  useEffect(() => {
    if (demo) {
      setItems(mockAllParkingLotItems)
      return
    }
    getMeetings()
      .then((data) => setItems(buildParkingLotItems(data.meetings ?? [])))
      .catch(() => {})
  }, [demo])
  const [filter, setFilter] = useState('all') // all | open | resolved

  const toggleStatus = (id) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === 'open' ? 'resolved' : 'open' }
          : item
      )
    )
  }

  const filtered = items.filter((i) => {
    if (filter === 'open') return i.status === 'open'
    if (filter === 'resolved') return i.status === 'resolved'
    return true
  })

  const openCount = items.filter((i) => i.status === 'open').length
  const resolvedCount = items.filter((i) => i.status === 'resolved').length

  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.meeting]) acc[item.meeting] = []
    acc[item.meeting].push(item)
    return acc
  }, {})

  return (
    <div className="pl-page">
      <div className="pl-page-header">
        <div>
          <h1 className="pl-page-title">Parking Lot</h1>
          <p className="pl-page-sub">Deferred topics and unresolved items across all meetings</p>
        </div>
        <div className="pl-header-stats">
          <div className="pl-header-stat">
            <span className="pl-header-num" style={{ color: 'var(--yellow)' }}>{openCount}</span>
            <span className="pl-header-label">Open</span>
          </div>
          <div className="pl-header-divider" />
          <div className="pl-header-stat">
            <span className="pl-header-num" style={{ color: 'var(--green)' }}>{resolvedCount}</span>
            <span className="pl-header-label">Resolved</span>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="pl-filters">
        {[
          { key: 'all', label: `All (${items.length})` },
          { key: 'open', label: `Open (${openCount})` },
          { key: 'resolved', label: `Resolved (${resolvedCount})` },
        ].map((f) => (
          <button
            key={f.key}
            className={`pl-filter-tab ${filter === f.key ? 'pl-filter-tab--active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Grouped by meeting */}
      <div className="pl-groups">
        {Object.entries(grouped).map(([meeting, meetingItems]) => (
          <div className="pl-group" key={meeting}>
            <div className="pl-group-header">
              <span className="pl-group-title">{meeting}</span>
              <span className="pl-group-meta">
                {meetingItems[0].date} · {meetingItems.length} item{meetingItems.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="pl-group-items">
              {meetingItems.map((item) => (
                <div
                  key={item.id}
                  className={`pl-item ${item.status === 'resolved' ? 'pl-item--resolved' : ''}`}
                >
                  <button
                    className={`pl-item-toggle ${item.status === 'resolved' ? 'pl-item-toggle--done' : ''}`}
                    onClick={() => toggleStatus(item.id)}
                    title={item.status === 'open' ? 'Mark resolved' : 'Re-open'}
                  >
                    {item.status === 'resolved' ? (
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="pl-item-p">P</span>
                    )}
                  </button>

                  <div className="pl-item-body">
                    <p className="pl-item-text">{item.text}</p>
                    <div className="pl-item-footer">
                      <span className={`pl-item-status ${item.status === 'open' ? 'pl-item-status--open' : 'pl-item-status--resolved'}`}>
                        {item.status === 'open' ? 'Open' : 'Resolved'}
                      </span>
                      <span className="pl-item-date">Added {item.date}</span>
                    </div>
                  </div>

                  <button
                    className="pl-item-action"
                    onClick={() => toggleStatus(item.id)}
                    title={item.status === 'open' ? 'Mark as resolved' : 'Re-open'}
                  >
                    {item.status === 'open' ? 'Resolve' : 'Re-open'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(grouped).length === 0 && (
          <div className="pl-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <p>No items match this filter</p>
          </div>
        )}
      </div>
    </div>
  )
}
