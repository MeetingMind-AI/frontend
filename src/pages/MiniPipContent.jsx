import { useState, useEffect } from 'react'
import { explainMeeting } from '../api'
import './MiniPopup.css'

const PROPOSAL_LABELS = { to_do: 'TO DO', parking_lot: 'PARKING LOT', to_schedule: 'TO SCHEDULE', blocker: 'BLOCKER' }

export default function MiniPipContent({
  meetingId,
  initialProposals,
  onGoBack,
  meetingType = 'general',
  createdAt = null,
  initialElapsed = 0,
}) {
  const [proposals, setProposals] = useState(initialProposals)
  const [mType, setMType] = useState(meetingType)
  const [elapsed, setElapsed] = useState(initialElapsed)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainResult, setExplainResult] = useState(null)
  const [explainTitle, setExplainTitle] = useState('')

  useEffect(() => {
    if (createdAt) {
      const startMs = new Date(createdAt).getTime()
      setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
    }
    const t = setInterval(() => {
      if (createdAt) {
        const startMs = new Date(createdAt).getTime()
        setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
      } else {
        setElapsed((e) => e + 1)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [createdAt])

  // Listen for the main webpage broadcasting its exact state
  useEffect(() => {
    const ch = new BroadcastChannel(`meeting-${meetingId}`)
    ch.onmessage = (e) => {
      if (e.data.type === 'sync_proposals') {
        setProposals(e.data.pending)
      }
      if (e.data.type === 'sync_timer') {
        if (typeof e.data.elapsed === 'number') setElapsed(e.data.elapsed)
        if (e.data.meetingType) setMType(e.data.meetingType)
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

  // Send accept/reject commands back to the main webpage
  const handleAction = (proposal, action) => {
    // Optimistic UI update for immediate feedback
    setProposals((prev) => prev.filter((p) => p.id !== proposal.id))

    const ch = new BroadcastChannel(`meeting-${meetingId}`)
    ch.postMessage({ type: 'action_proposal', proposal, action })
    ch.close()
  }

  return (
    <div className="mp-root">
      <header className="mp-header">
        <div className="mp-logo">
          <svg viewBox="0 0 20 20" fill="none" width="16" height="16">
            <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#4f8ef7" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
          </svg>
          MeetingMind
        </div>
        {mType === 'daily_standup' ? (() => {
          const remaining = 900 - elapsed
          const isOvertime = remaining < 0
          const isWarning = !isOvertime && remaining <= 180
          const displaySecs = isOvertime ? Math.abs(remaining) : Math.max(0, remaining)
          const m = Math.floor(displaySecs / 60)
          const s = displaySecs % 60
          const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

          return (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                padding: '2px 8px',
                borderRadius: '12px',
                background: isOvertime
                  ? 'rgba(239, 68, 68, 0.2)'
                  : isWarning
                  ? 'rgba(245, 158, 11, 0.2)'
                  : 'rgba(16, 185, 129, 0.2)',
                color: isOvertime ? 'var(--red, #ef4444)' : isWarning ? 'var(--yellow, #f59e0b)' : 'var(--green, #10b981)',
                border: `1px solid ${isOvertime ? '#ef444466' : isWarning ? '#f59e0b66' : '#10b98166'}`,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title={isOvertime ? 'Standup Overtime' : 'Timebox Remaining'}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{isOvertime ? `+${formatted}` : formatted}</span>
            </span>
          )
        })() : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</span>
          </span>
        )}
        <button className="mp-back-btn" onClick={onGoBack} title="Close panel and return to transcript">
          ← Transcript
        </button>
      </header>

      <section className="mp-section">
        <div className="mp-section-title">Instant Clarity</div>
        <div className="mp-explain-btns">
          <button className="mp-btn mp-btn--tech" onClick={() => handleExplain('technical')} disabled={explainLoading}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            {explainLoading ? 'Loading…' : 'Technical'}
          </button>
          <button className="mp-btn mp-btn--biz" onClick={() => handleExplain('business')} disabled={explainLoading}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            {explainLoading ? 'Loading…' : 'Business'}
          </button>
        </div>

        {explainResult && (
          <div className="mp-explain-result" style={{ position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div className="mp-explain-result-title" style={{ margin: 0 }}>{explainTitle}</div>
              <button
                onClick={() => setExplainResult(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px' }}
                title="Clear summary"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '8px' }}>
              ✦ AI generated · Verify for accuracy
            </div>
            <p className="mp-explain-result-text">{explainResult}</p>
          </div>
        )}
      </section>

      <section className="mp-section mp-section--parking">
        <div className="mp-section-title">
          Pending Actions
          {proposals.length > 0 && <span className="mp-badge-count">{proposals.length}</span>}
        </div>
        {proposals.length === 0 ? (
          <div className="mp-empty">No pending items captured yet</div>
        ) : (
          <div className="mp-proposal-list">
            {proposals.map((p, i) => (
              <div className="mp-proposal" key={p.id ?? i} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="mp-proposal-label" style={{ opacity: 0.8 }}>
                  {PROPOSAL_LABELS[p.type] ?? 'PROPOSAL'}
                </div>
                <div className="mp-proposal-text">{p.content}</div>

                {/* Accept / Park / Reject Buttons */}
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                  <button
                    onClick={() => handleAction(p, 'accepted')}
                    style={{
                      flex: 1,
                      padding: '6px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      background: p.type === 'parking_lot' ? 'var(--yellow)' : 'var(--green)',
                      color: 'var(--bg-1)',
                      border: 'none',
                      borderRadius: '4px',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                  >
                    {p.type === 'parking_lot' ? (
                      <>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                        </svg>
                        Park
                      </>
                    ) : 'Accept'}
                  </button>
                  {p.type !== 'parking_lot' && (
                    <button
                      onClick={() => handleAction(p, 'park')}
                      style={{
                        padding: '6px 8px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        background: 'rgba(234, 179, 8, 0.2)',
                        color: 'var(--yellow)',
                        border: '1px solid rgba(234, 179, 8, 0.4)',
                        borderRadius: '4px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                      title="Move to parking lot"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                      </svg>
                      Park
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(p, 'rejected')}
                    style={{ flex: 1, padding: '6px', fontSize: '11px', cursor: 'pointer', background: 'transparent', color: 'var(--red)', border: '1px solid var(--red)', borderRadius: '4px', fontWeight: 600 }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
