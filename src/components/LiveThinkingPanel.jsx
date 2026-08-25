/**
 * @file LiveThinkingPanel.jsx
 * @description Real-time live AI Details & Multi-Agent Deliberation side panel for live meetings.
 * Shows the live thoughts, grounding checks, and reasoning steps of AI agent personas as speech is transcribed.
 */

import { useState, useEffect, useRef } from 'react'
import { FormattedMarkdown } from './ThinkingProcess'
import './LiveThinkingPanel.css'

/**
 * LiveThinkingPanel component.
 *
 * @param {Object} props
 * @param {Array} props.thoughts - Array of thought objects { id, time, agent, title, text, type }.
 * @param {boolean} props.isOpen - Whether the panel is currently open.
 * @param {Function} props.onClose - Close callback.
 * @param {boolean} [props.isListening=true] - Whether WebSocket is currently listening.
 */
export default function LiveThinkingPanel({
  thoughts = [],
  isOpen,
  onClose,
  isListening = true,
}) {
  const [activeFilter, setActiveFilter] = useState('all')
  const [autoScroll, setAutoScroll] = useState(true)
  const feedEndRef = useRef(null)

  const filteredThoughts = thoughts.filter((t) => {
    if (activeFilter === 'all') return true
    return t.agent === activeFilter
  })

  useEffect(() => {
    if (autoScroll && feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [thoughts, autoScroll, isOpen])

  if (!isOpen) return null

  return (
    <aside className="ltp-panel" aria-label="AI Live Details">
      <div className="ltp-header">
        <div className="ltp-header-title-row">
          <div className="ltp-brain-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </div>
          <div>
            <h3 className="ltp-title">AI Live Details</h3>
            <p className="ltp-subtitle">Multi-Agent Real-time Deliberation Stream</p>
          </div>
        </div>

        <div className="ltp-header-actions">
          {isListening && (
            <div className="ltp-live-pulse-badge">
              <span className="ltp-live-dot" />
              <span>Live Monitor</span>
            </div>
          )}
          <button className="ltp-close-btn" onClick={onClose} title="Close details panel">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="ltp-filters">
        <button
          className={`ltp-filter-btn ${activeFilter === 'all' ? 'ltp-filter-btn--active' : ''}`}
          onClick={() => setActiveFilter('all')}
        >
          All ({thoughts.length})
        </button>
        <button
          className={`ltp-filter-btn ltp-filter-btn--sm ${activeFilter === 'scrum_master' ? 'ltp-filter-btn--active' : ''}`}
          onClick={() => setActiveFilter('scrum_master')}
        >
          Scrum Master
        </button>
        <button
          className={`ltp-filter-btn ltp-filter-btn--tech ${activeFilter === 'tech_lead' ? 'ltp-filter-btn--active' : ''}`}
          onClick={() => setActiveFilter('tech_lead')}
        >
          Tech Lead
        </button>
        <button
          className={`ltp-filter-btn ltp-filter-btn--pm ${activeFilter === 'product_manager' ? 'ltp-filter-btn--active' : ''}`}
          onClick={() => setActiveFilter('product_manager')}
        >
          Product Manager
        </button>
      </div>

      {/* Thought Stream Feed */}
      <div className="ltp-feed">
        {filteredThoughts.length === 0 ? (
          <div className="ltp-empty">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <p className="ltp-empty-title">Waiting for speech input...</p>
            <p className="ltp-empty-desc">
              As participants speak, the AI agent personas will deliberate, verify grounding, and track action items live here.
            </p>
          </div>
        ) : (
          filteredThoughts.map((t) => {
            const agentClass = t.agent ? `ltp-card--${t.agent}` : 'ltp-card--default'
            return (
              <div key={t.id} className={`ltp-thought-card ${agentClass}`}>
                <div className="ltp-thought-header">
                  <div className="ltp-agent-tag">
                    {t.agent === 'scrum_master' && 'Scrum Master'}
                    {t.agent === 'tech_lead' && 'Tech Lead'}
                    {t.agent === 'product_manager' && 'Product Manager'}
                    {!['scrum_master', 'tech_lead', 'product_manager'].includes(t.agent) && 'Multi-Agent Engine'}
                  </div>
                  <span className="ltp-time">{t.time}</span>
                </div>

                {t.title && <h4 className="ltp-thought-title">{t.title}</h4>}
                <p className="ltp-thought-text"><FormattedMarkdown text={t.text} /></p>

                {t.metadata && (
                  <div className="ltp-thought-meta">
                    {t.metadata.speaker && (
                      <span className="ltp-meta-pill">Speaker: {t.metadata.speaker}</span>
                    )}
                    {t.metadata.action && (
                      <span className="ltp-meta-pill ltp-meta-pill--action">Action: {t.metadata.action}</span>
                    )}
                    {t.metadata.grounding && (
                      <span className="ltp-meta-pill ltp-meta-pill--grounding">✓ Grounded</span>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
        <div ref={feedEndRef} />
      </div>

      {/* Footer info bar */}
      <div className="ltp-footer">
        <label className="ltp-autoscroll-toggle">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
          />
          <span>Auto-scroll with live stream</span>
        </label>
        <span className="ltp-counter">{filteredThoughts.length} entries recorded</span>
      </div>
    </aside>
  )
}
