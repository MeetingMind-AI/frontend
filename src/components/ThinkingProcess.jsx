/**
 * @file ThinkingProcess.jsx
 * @description Collapsible AI Details component.
 * Displays the intermediate persona analyses (Tech Lead, PM), cross-functional debate rounds, and Scrum Master synthesis rationale.
 */

import { useState } from 'react'
import { parseScrumMaster } from '../utils'
import './ThinkingProcess.css'

/**
 * Helper to render basic markdown bold and italic formatting without raw asterisks.
 */
export function FormattedMarkdown({ text }) {
  if (!text || typeof text !== 'string') return null

  // Split by markdown bold (**...**)
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
          const inner = part.slice(2, -2)
          return <strong key={index}>{inner}</strong>
        }
        // Split by italic (*...*)
        const italicParts = part.split(/(\*[^*]+\*)/g)
        return italicParts.map((subPart, subIdx) => {
          if (subPart.startsWith('*') && subPart.endsWith('*') && subPart.length >= 3) {
            return <em key={`${index}-${subIdx}`}>{subPart.slice(1, -1)}</em>
          }
          return subPart
        })
      })}
    </>
  )
}

/**
 * ThinkingProcess component.
 *
 * @param {Object} props
 * @param {Object} props.summary - Meeting summary object containing tech_lead, product_manager, scrum_master.
 * @param {Array} [props.discussionLog=[]] - Multi-agent debate history log.
 * @param {boolean} [props.defaultOpen=false] - Whether dropdown is expanded by default.
 * @param {number} [props.elapsedSeconds] - Optional duration the AI took to reason.
 */
export default function ThinkingProcess({
  summary,
  discussionLog = [],
  defaultOpen = false,
  elapsedSeconds,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [activeFilter, setActiveFilter] = useState('all')

  if (!summary && (!discussionLog || discussionLog.length === 0)) {
    return null
  }

  const tl = parseScrumMaster(summary?.tech_lead)
  const pm = parseScrumMaster(summary?.product_manager)
  const sm = parseScrumMaster(summary?.scrum_master)

  const hasDebate = Array.isArray(discussionLog) && discussionLog.length > 0

  return (
    <div className={`tp-wrapper ${isOpen ? 'tp-wrapper--open' : ''}`}>
      {/* Accordion Toggle Bar */}
      <button
        type="button"
        className="tp-toggle-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="tp-toggle-left">
          <div className="tp-brain-icon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
            </svg>
          </div>
          <span className="tp-title">
            AI Details
          </span>
          <span className="tp-stage-count-pill">
            {hasDebate ? '4 Persona Stages + Deliberation' : '3 Persona Stages'}
          </span>
          {elapsedSeconds && (
            <span className="tp-timing-tag">Generated in ~{elapsedSeconds}s</span>
          )}
        </div>

        <div className="tp-toggle-right">
          <span className="tp-toggle-label">{isOpen ? 'Hide AI details' : 'View AI details'}</span>
          <svg
            className={`tp-chevron ${isOpen ? 'tp-chevron--open' : ''}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Expanded Details Body */}
      {isOpen && (
        <div className="tp-body">
          {/* Persona Filter Chips */}
          <div className="tp-filters">
            <button
              type="button"
              className={`tp-filter-pill ${activeFilter === 'all' ? 'tp-filter-pill--active' : ''}`}
              onClick={() => setActiveFilter('all')}
            >
              All Stages
            </button>
            <button
              type="button"
              className={`tp-filter-pill ${activeFilter === 'tech_lead' ? 'tp-filter-pill--active' : ''}`}
              onClick={() => setActiveFilter('tech_lead')}
            >
              Tech Lead Assessment
            </button>
            <button
              type="button"
              className={`tp-filter-pill ${activeFilter === 'product_manager' ? 'tp-filter-pill--active' : ''}`}
              onClick={() => setActiveFilter('product_manager')}
            >
              Product Manager Scope
            </button>
            {hasDebate && (
              <button
                type="button"
                className={`tp-filter-pill ${activeFilter === 'debate' ? 'tp-filter-pill--active' : ''}`}
                onClick={() => setActiveFilter('debate')}
              >
                Cross-Functional Deliberation
              </button>
            )}
            <button
              type="button"
              className={`tp-filter-pill ${activeFilter === 'scrum_master' ? 'tp-filter-pill--active' : ''}`}
              onClick={() => setActiveFilter('scrum_master')}
            >
              Scrum Master Synthesis
            </button>
          </div>

          <div className="tp-timeline">
            {/* Stage 1: Tech Lead Analysis */}
            {(activeFilter === 'all' || activeFilter === 'tech_lead') && tl && (
              <div className="tp-step-card tp-step--tech">
                <div className="tp-step-header">
                  <div className="tp-agent-badge tp-agent--tech">
                    <span>Tech Lead</span>
                  </div>
                  <span className="tp-step-name">Technical & Architectural Assessment</span>
                </div>
                <div className="tp-step-inner">
                  <div className="tp-thought-block">
                    <p className="tp-thought-label">Architectural Assessment:</p>
                    {tl.architecture?.length > 0 ? (
                      <ul className="tp-thought-list">
                        {tl.architecture.map((a, i) => (
                          <li key={i}><FormattedMarkdown text={a} /></li>
                        ))}
                      </ul>
                    ) : (
                      <p className="tp-thought-empty">No major architectural deviations identified in transcript.</p>
                    )}
                  </div>

                  <div className="tp-thought-block">
                    <p className="tp-thought-label">Technical Decisions & Rationale:</p>
                    {tl.technical_decisions?.length > 0 ? (
                      <ul className="tp-thought-list">
                        {tl.technical_decisions.map((d, i) => (
                          <li key={i}>
                            <strong><FormattedMarkdown text={d.decision} /></strong>
                            {d.rationale && <span className="tp-rationale"> — Rationale: <FormattedMarkdown text={d.rationale} /></span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="tp-thought-empty">No explicit technical decision mandates detected.</p>
                    )}
                  </div>

                  {tl.engineering_blockers?.length > 0 && (
                    <div className="tp-thought-block tp-thought-block--warn">
                      <p className="tp-thought-label">Identified Engineering Blockers:</p>
                      <ul className="tp-thought-list">
                        {tl.engineering_blockers.map((b, i) => (
                          <li key={i}>
                            <FormattedMarkdown text={b.blocker} /> {b.owner ? `(Assigned: ${b.owner})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stage 2: Product Manager Analysis */}
            {(activeFilter === 'all' || activeFilter === 'product_manager') && pm && (
              <div className="tp-step-card tp-step--pm">
                <div className="tp-step-header">
                  <div className="tp-agent-badge tp-agent--pm">
                    <span>Product Manager</span>
                  </div>
                  <span className="tp-step-name">Customer Scope & Roadmap Evaluation</span>
                </div>
                <div className="tp-step-inner">
                  <div className="tp-thought-block">
                    <p className="tp-thought-label">Feature Scope & Customer Requests:</p>
                    {pm.feature_requests?.length > 0 ? (
                      <ul className="tp-thought-list">
                        {pm.feature_requests.map((f, i) => (
                          <li key={i}>
                            <strong><FormattedMarkdown text={f.feature} /></strong>
                            {f.requester && <span className="tp-rationale"> (Source: {f.requester})</span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="tp-thought-empty">No new feature scope additions requested.</p>
                    )}
                  </div>

                  <div className="tp-thought-block">
                    <p className="tp-thought-label">UX Topics & Workflows:</p>
                    {pm.ux_topics?.length > 0 ? (
                      <ul className="tp-thought-list">
                        {pm.ux_topics.map((u, i) => (
                          <li key={i}>
                            <strong><FormattedMarkdown text={u.topic} /></strong>
                            {u.description && <span className="tp-rationale"> — <FormattedMarkdown text={u.description} /></span>}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="tp-thought-empty">No UX friction points raised.</p>
                    )}
                  </div>

                  {pm.roadmap_alignment?.length > 0 && (
                    <div className="tp-thought-block">
                      <p className="tp-thought-label">Roadmap Alignment & Milestones:</p>
                      <ul className="tp-thought-list">
                        {pm.roadmap_alignment.map((r, i) => (
                          <li key={i}>
                            <FormattedMarkdown text={r.task} /> {r.owner ? `(${r.owner})` : ''}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stage 3: Cross-Functional Persona Debate Log */}
            {(activeFilter === 'all' || activeFilter === 'debate') && hasDebate && (
              <div className="tp-step-card tp-step--debate">
                <div className="tp-step-header">
                  <div className="tp-agent-badge tp-agent--debate">
                    <span>Cross-Functional Deliberation</span>
                  </div>
                  <span className="tp-step-name">Alignment & Trade-off Deliberation</span>
                </div>
                <div className="tp-step-inner">
                  {discussionLog.map((entry, rIdx) => (
                    <div key={rIdx} className="tp-debate-round">
                      <div className="tp-debate-round-header">
                        Round {entry.round ?? rIdx + 1} Deliberation
                      </div>
                      {entry.tech_lead && (
                        <div className="tp-debate-turn tp-debate-turn--tl">
                          <span className="tp-turn-speaker">Tech Lead Persona:</span>
                          <p className="tp-turn-text"><FormattedMarkdown text={entry.tech_lead} /></p>
                        </div>
                      )}
                      {entry.product_manager && (
                        <div className="tp-debate-turn tp-debate-turn--pm">
                          <span className="tp-turn-speaker">Product Manager Persona:</span>
                          <p className="tp-turn-text"><FormattedMarkdown text={entry.product_manager} /></p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stage 4: Scrum Master Final Synthesis Logic */}
            {(activeFilter === 'all' || activeFilter === 'scrum_master') && sm && (
              <div className="tp-step-card tp-step--sm">
                <div className="tp-step-header">
                  <div className="tp-agent-badge tp-agent--sm">
                    <span>Scrum Master</span>
                  </div>
                  <span className="tp-step-name">Master Synthesis & Action Prioritization</span>
                </div>
                <div className="tp-step-inner">
                  <div className="tp-thought-block">
                    <p className="tp-thought-label">Executive Synthesis Summary:</p>
                    <p className="tp-synthesis-text"><FormattedMarkdown text={sm.summary} /></p>
                  </div>
                  <div className="tp-thought-block">
                    <p className="tp-thought-label">Action Items ({sm.to_do?.length || 0}):</p>
                    {sm.to_do?.length > 0 ? (
                      <ul className="tp-thought-list">
                        {sm.to_do.map((t, i) => (
                          <li key={i}>
                            <FormattedMarkdown text={typeof t === 'string' ? t : `${t.task}${t.owner ? ` [${t.owner}]` : ''}`} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="tp-thought-empty">No action items extracted.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
