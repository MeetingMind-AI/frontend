import { useState, useEffect } from 'react'
import { getAllActions } from '../api'
import { buildParkingLotItems } from '../utils'
import './GlobalParkingLot.css'

function ParkingCard({ item }) {
  return (
    <div className="pl-item">
      <div className="pl-item-body">
        <p className="pl-item-text">{item.text}</p>
        <div className="pl-item-footer">
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

  return (
    <div className="pl-page">
      <div className="pl-page-header">
        <div>
          <h1 className="pl-page-title">Parking Lot</h1>
          <p className="pl-page-sub">Deferred topics and blockers from all meetings</p>
        </div>
      </div>

      {items.length > 0 && (
        <div className="pl-groups">
          <div className="pl-group">
            <div className="pl-group-header">
              <span className="pl-group-title">All Items</span>
              <span className="pl-group-meta">{items.length} item{items.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="pl-group-items">
              {items.map((item) => (
                <ParkingCard key={item.id} item={item} />
              ))}
            </div>
          </div>
        </div>
      )}

      {items.length === 0 && (
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