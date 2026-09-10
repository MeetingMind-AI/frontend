import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { explainMeeting } from '../api'
import { getBrowserPipSupport } from '../utils'
import './MiniPopup.css'

export default function MiniPopup() {
  const [searchParams] = useSearchParams()
  const meetingId = parseInt(searchParams.get('meetingId') || '0', 10)

  const [proposals, setProposals] = useState([])
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainResult, setExplainResult] = useState(null)
  const [explainTitle, setExplainTitle] = useState('')

  useEffect(() => {
    // Load proposals snapshotted by Live just before navigation
    try {
      const raw = localStorage.getItem(`mini-popup-${meetingId}`)
      if (raw) {
        const data = JSON.parse(raw)
        setProposals(data.proposals || [])
        localStorage.removeItem(`mini-popup-${meetingId}`)
      }
    } catch {}

    // Also listen for any late proposals broadcast before Live unmounts
    const ch = new BroadcastChannel(`meeting-${meetingId}`)
    ch.onmessage = (e) => {
      if (e.data.type === 'proposal') {
        setProposals((prev) => [...prev, e.data.proposal])
      }
    }
    return () => ch.close()
  }, [meetingId])

  const handleExplain = async (mode) => {
    setExplainLoading(true)
    setExplainResult(null)
    try {
      const data = await explainMeeting(meetingId, mode, null)
      setExplainTitle(mode === 'technical' ? 'Technical Summary' : 'Business Summary')
      setExplainResult(data.explanation || 'No explanation returned.')
    } catch {
      setExplainTitle('Error')
      setExplainResult('Failed to generate explanation. Please try again.')
    } finally {
      setExplainLoading(false)
    }
  }

  const parkingLot = proposals.filter((p) => p.type === 'parking_lot')
  const pipSupport = getBrowserPipSupport()

  return (
    <div className="mp-root">
      <header className="mp-header">
        <div className="mp-logo">
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
            <polygon
              points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5"
              fill="none"
              stroke="#4f8ef7"
              strokeWidth="1.5"
            />
            <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
          </svg>
          MeetingMind
        </div>
        <span className="mp-meeting-label">Meeting #{meetingId}</span>
      </header>

      {!pipSupport.isSupported && (
        <div className="mp-browser-banner">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>
            {pipSupport.message || 'Always-on-top Document PiP is not supported in this browser. Please change browser to Chrome or Edge for the floating overlay.'}
          </span>
        </div>
      )}

      <section className="mp-section">
        <div className="mp-section-title">Instant Clarity</div>
        <div className="mp-explain-btns">
          <button
            className="mp-btn mp-btn--tech"
            onClick={() => handleExplain('technical')}
            disabled={explainLoading}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            {explainLoading ? 'Loading…' : 'Technical'}
          </button>
          <button
            className="mp-btn mp-btn--biz"
            onClick={() => handleExplain('business')}
            disabled={explainLoading}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            {explainLoading ? 'Loading…' : 'Business'}
          </button>
        </div>

        {explainResult && (
          <div className="mp-explain-result">
            <div className="mp-explain-result-title">{explainTitle}</div>
            <p className="mp-explain-result-text">{explainResult}</p>
          </div>
        )}
      </section>

      <section className="mp-section mp-section--parking">
        <div className="mp-section-title">
          Parking Lot
          {parkingLot.length > 0 && <span className="mp-badge-count">{parkingLot.length}</span>}
        </div>

        {parkingLot.length === 0 ? (
          <div className="mp-empty">No parking lot items captured</div>
        ) : (
          <div className="mp-proposal-list">
            {parkingLot.map((p, i) => (
              <div className="mp-proposal" key={p.id ?? i}>
                <div className="mp-proposal-label">PARKING LOT</div>
                <div className="mp-proposal-text">{p.content}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
