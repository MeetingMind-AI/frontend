import { useState, useEffect } from 'react'
import { explainMeeting } from '../api'
import './MiniPopup.css'

export default function MiniPipContent({ meetingId, initialProposals, onGoBack }) {
  const [proposals, setProposals] = useState(initialProposals)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainResult, setExplainResult] = useState(null)
  const [explainTitle, setExplainTitle] = useState('')

  // Receive new parking lot proposals broadcast from Live while it's still mounted
  useEffect(() => {
    const ch = new BroadcastChannel(`meeting-${meetingId}`)
    ch.onmessage = (e) => {
      if (e.data.type === 'proposal' && e.data.proposal.type === 'parking_lot') {
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
        <button className="mp-back-btn" onClick={onGoBack} title="Close panel and return to transcript">
          ← Transcript
        </button>
      </header>

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
          {proposals.length > 0 && <span className="mp-badge-count">{proposals.length}</span>}
        </div>
        {proposals.length === 0 ? (
          <div className="mp-empty">No parking lot items captured yet</div>
        ) : (
          <div className="mp-proposal-list">
            {proposals.map((p, i) => (
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
