/**
 * @file SummaryProgressIndicator.jsx
 * @description Professional AI reasoning and thinking process component displayed during summary generation and re-summarization.
 */

import { useState, useEffect, useRef } from 'react'
import { getSummaryThoughts, openInsightSocket } from '../api'
import { FormattedMarkdown } from './ThinkingProcess'
import './SummaryProgressIndicator.css'

const SUMMARY_STAGES = [
  {
    id: 'transcript',
    label: 'Transcript Ingestion & Context',
    desc: 'Ingesting timeline, speaker turns, and team memories',
    thought: 'Loading speaker transcript turns... querying Mem0 vector database for relevant team memories and past context.',
    duration: 4000,
  },
  {
    id: 'personas',
    label: 'Tech Lead & PM Independent Analysis',
    desc: 'Parallel initial analysis of technical architecture and product roadmap',
    thought: 'Running Tech Lead persona (evaluating technical constraints and blockers) and Product Manager persona (evaluating user impact and scope).',
    duration: 6000,
  },
  {
    id: 'debate',
    label: 'Multi-Agent Cross-Functional Debate',
    desc: 'Tech Lead / Product Manager persona discussion and trade-off analysis',
    thought: 'Personas deliberating in multi-turn debate: comparing implementation difficulty against timeline urgency and user requirements.',
    duration: 8000,
  },
  {
    id: 'synthesis',
    label: 'Scrum Master Synthesis',
    desc: 'Synthesizing executive summary, action items, and parking lot topics',
    thought: 'Scrum Master compiling final consensus, extracting actionable tickets, identifying parking lot items, and finalizing executive digest.',
    duration: 9000,
  },
]

const PROGRESSIVE_THINKING_STEPS = [
  {
    id: 'step-1',
    minElapsed: 0,
    agent: 'scrum_master',
    title: 'Ingesting Timeline & Speaker Turns',
    text: 'Analyzing meeting chronology and speaker identification. Loading prior project memory vectors from Mem0 database...',
  },
  {
    id: 'step-2',
    minElapsed: 3,
    agent: 'tech_lead',
    title: 'Evaluating Technical Decisions & Architecture',
    text: 'Scanning dialogue for architectural commitments, database schema modifications, refactoring needs, and backend dependencies...',
  },
  {
    id: 'step-3',
    minElapsed: 6,
    agent: 'product_manager',
    title: 'Evaluating Product Scope & UX Priorities',
    text: 'Checking user workflow impact, feature requests, UX friction points, and alignment with current roadmap milestones...',
  },
  {
    id: 'step-4',
    minElapsed: 11,
    agent: 'debate',
    title: 'Multi-Agent Cross-Functional Deliberation',
    text: 'Evaluating trade-offs between technical debt and product release urgency. Reconciling delivery estimates across Tech Lead and Product Manager perspectives...',
  },
  {
    id: 'step-5',
    minElapsed: 17,
    agent: 'scrum_master',
    title: 'Synthesizing Consensus & Action Items',
    text: 'Extracting actionable tickets with assigned owners, prioritizing urgent deliverables, and routing unassigned discussion to the Parking Lot...',
  },
  {
    id: 'step-6',
    minElapsed: 23,
    agent: 'scrum_master',
    title: 'Finalizing Executive Summary Digest',
    text: 'Compiling structured executive digest, key takeaways, and team action items for review...',
  },
]

/**
 * SummaryProgressIndicator component.
 *
 * @param {Object} props
 * @param {number|string} [props.meetingId] - Target meeting ID.
 * @param {string} [props.title='Generating AI Summary & Action Items'] - Header title.
 * @param {string} [props.subtitle='Multi-agent orchestration in progress...'] - Subtitle.
 * @param {number|string} [props.startedAt] - Timestamp when generation started.
 * @param {Function} [props.onStop] - Optional callback to cancel/stop generation.
 * @param {Array} [props.initialThoughts=[]] - Initial thought list.
 */
export default function SummaryProgressIndicator({
  meetingId,
  title = 'Generating AI Summary & Action Items',
  subtitle = 'Multi-agent orchestration in progress...',
  startedAt,
  onStop,
  initialThoughts = [],
}) {
  const getInitialElapsed = () => {
    if (!startedAt) return 0
    const startSec = typeof startedAt === 'string' ? new Date(startedAt).getTime() / 1000 : startedAt
    return Math.max(0, Math.floor(Date.now() / 1000 - startSec))
  }

  const getInitialStageIndex = (initialSec) => {
    let accumulatedMs = 0
    const initialMs = initialSec * 1000
    for (let i = 0; i < SUMMARY_STAGES.length; i++) {
      accumulatedMs += SUMMARY_STAGES[i].duration
      if (initialMs < accumulatedMs || i === SUMMARY_STAGES.length - 1) {
        return i
      }
    }
    return SUMMARY_STAGES.length - 1
  }

  const [elapsed, setElapsed] = useState(getInitialElapsed)
  const [currentStageIndex, setCurrentStageIndex] = useState(() => getInitialStageIndex(getInitialElapsed()))
  const [showLiveThoughts, setShowLiveThoughts] = useState(true)
  const [backendThoughts, setBackendThoughts] = useState(initialThoughts)
  const thoughtsContainerRef = useRef(null)

  // Timer tick
  useEffect(() => {
    const timer = setInterval(() => setElapsed((prev) => prev + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  // Local container-only auto-scroll (does NOT move the browser window)
  useEffect(() => {
    if (thoughtsContainerRef.current) {
      thoughtsContainerRef.current.scrollTop = thoughtsContainerRef.current.scrollHeight
    }
  }, [elapsed, backendThoughts.length])

  // Live Thoughts Streaming (WebSocket + Polling fallback)
  useEffect(() => {
    if (!meetingId) return

    let isMounted = true

    // Initial fetch
    getSummaryThoughts(meetingId)
      .then((res) => {
        if (isMounted && Array.isArray(res.thoughts) && res.thoughts.length > 0) {
          setBackendThoughts(res.thoughts)
        }
      })
      .catch(() => {})

    // Open WebSocket listener for live broadcast
    const socket = openInsightSocket(meetingId, {
      onAgentThought: (thought) => {
        if (!isMounted || !thought) return
        setBackendThoughts((prev) => {
          const exists = prev.some((t) => t.id === thought.id || (t.time === thought.time && t.text === thought.text))
          return exists ? prev : [...prev, thought]
        })
      },
    })

    // Polling interval as reliable fallback
    const pollTimer = setInterval(() => {
      getSummaryThoughts(meetingId)
        .then((res) => {
          if (isMounted && Array.isArray(res.thoughts)) {
            setBackendThoughts((prev) => {
              const newThoughts = res.thoughts.filter(
                (nt) => !prev.some((pt) => pt.id === nt.id || (pt.time === nt.time && pt.text === nt.text))
              )
              return newThoughts.length > 0 ? [...prev, ...newThoughts] : prev
            })
          }
        })
        .catch(() => {})
    }, 1500)

    return () => {
      isMounted = false
      clearInterval(pollTimer)
      try { socket.close() } catch {}
    }
  }, [meetingId])

  // Stage progress timings
  useEffect(() => {
    let accumulatedTime = 0
    const currentElapsedMs = getInitialElapsed() * 1000

    const timeouts = SUMMARY_STAGES.map((stage, idx) => {
      accumulatedTime += stage.duration
      const delay = Math.max(0, accumulatedTime - currentElapsedMs)
      return setTimeout(() => {
        setCurrentStageIndex((prev) => Math.max(prev, idx + 1 < SUMMARY_STAGES.length ? idx + 1 : idx))
      }, delay)
    })

    return () => {
      timeouts.forEach(clearTimeout)
    }
  }, [startedAt])

  const progressPercent = Math.min(
    95,
    Math.round(((currentStageIndex + 0.6) / SUMMARY_STAGES.length) * 100)
  )

  const currentStage = SUMMARY_STAGES[currentStageIndex] || SUMMARY_STAGES[0]

  const [stopping, setStopping] = useState(false)

  const handleStopClick = async (e) => {
    e?.stopPropagation?.()
    if (stopping || !onStop) return
    setStopping(true)
    try {
      await onStop()
    } catch (err) {
      console.warn('[SummaryProgressIndicator] Stop failed:', err)
      setStopping(false)
    }
  }

  // Combine progressive reasoning trace with real backend thoughts
  const visibleProgressive = PROGRESSIVE_THINKING_STEPS.filter((step) => elapsed >= step.minElapsed)
  const combinedThoughts = [...visibleProgressive, ...backendThoughts]

  return (
    <div className="spi-card">
      <div className="spi-header">
        <div className="spi-icon-wrap">
          <div className="spi-spinner" />
          <svg viewBox="0 0 20 20" fill="none" width="22" height="22">
            <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#4f8ef7" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
          </svg>
        </div>
        <div className="spi-titles">
          <h3 className="spi-title">{title}</h3>
          <p className="spi-subtitle">{subtitle}</p>
        </div>
        <div className="spi-header-controls">
          <div className="spi-elapsed-badge">
            <span className="spi-pulse-dot" />
            <span>{elapsed}s elapsed</span>
          </div>
          {onStop && (
            <button
              className={`spi-stop-btn ${stopping ? 'spi-stop-btn--stopping' : ''}`}
              onClick={handleStopClick}
              disabled={stopping}
              title="Cancel and stop summary generation"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              {stopping ? 'Stopping...' : 'Stop'}
            </button>
          )}
        </div>
      </div>

      <div className="spi-progress-bar-wrap">
        <div className="spi-progress-bar-track">
          <div className="spi-progress-bar-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="spi-progress-info">
          <span>Stage {currentStageIndex + 1} of {SUMMARY_STAGES.length}: {currentStage.label}</span>
          <span>{progressPercent}%</span>
        </div>
      </div>

      {/* AI Reasoning Details Box */}
      <div className="spi-thoughts-box">
        <div className="spi-thoughts-header" onClick={() => setShowLiveThoughts(!showLiveThoughts)}>
          <div className="spi-thoughts-header-left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4f8ef7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
            <span className="spi-thoughts-title">AI Details</span>
            <span className="spi-thought-count-pill">
              {combinedThoughts.length} reasoning steps
            </span>
          </div>
          <span className="spi-thoughts-toggle-hint">
            {showLiveThoughts ? 'Hide details' : 'View details'}
          </span>
        </div>
        {showLiveThoughts && (
          <div className="spi-thoughts-content" ref={thoughtsContainerRef}>
            {combinedThoughts.map((t, idx) => {
              const agentLabel =
                t.agent === 'tech_lead'
                  ? 'Tech Lead'
                  : t.agent === 'product_manager'
                  ? 'Product Manager'
                  : t.agent === 'scrum_master'
                  ? 'Scrum Master'
                  : t.agent === 'debate'
                  ? 'Cross-Functional Deliberation'
                  : 'Reasoning Engine'

              return (
                <div key={t.id || idx} className={`spi-thought-entry spi-thought-entry--${t.agent || 'default'}`}>
                  <div className="spi-thought-top-row">
                    <span className="spi-agent-chip">{agentLabel}</span>
                    {t.title && <span className="spi-thought-heading">{t.title}</span>}
                    <span className="spi-thought-clock">{t.time || `~${t.minElapsed || elapsed}s`}</span>
                  </div>
                  <div className="spi-thought-body">
                    <FormattedMarkdown text={t.text} />
                  </div>
                </div>
              )
            })}

            {/* Active Thinking Row */}
            <div className="spi-thinking-active-row">
              <span className="spi-thinking-spinner" />
              <span className="spi-thinking-active-text">
                {currentStageIndex === 0 && 'Analyzing transcript timeline & loading team memories...'}
                {currentStageIndex === 1 && 'Tech Lead & PM analyzing engineering constraints & product scope...'}
                {currentStageIndex === 2 && 'Debating implementation trade-offs and roadmap timing...'}
                {currentStageIndex === 3 && 'Scrum Master compiling final consensus & action items...'}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="spi-stages-list">
        {SUMMARY_STAGES.map((stage, idx) => {
          const isDone = idx < currentStageIndex
          const isActive = idx === currentStageIndex
          const isPending = idx > currentStageIndex

          return (
            <div
              key={stage.id}
              className={`spi-stage-item ${isDone ? 'spi-stage--done' : ''} ${isActive ? 'spi-stage--active' : ''} ${isPending ? 'spi-stage--pending' : ''}`}
            >
              <div className="spi-stage-icon">
                {isDone ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : isActive ? (
                  <span className="spi-active-ping" />
                ) : (
                  <span className="spi-pending-dot" />
                )}
              </div>
              <div className="spi-stage-content">
                <div className="spi-stage-title-row">
                  <span className="spi-stage-label">{stage.label}</span>
                  {isActive && (
                    <span className="spi-active-badge">
                      Processing
                      <span className="spi-typing-dots">
                        <span />
                        <span />
                        <span />
                      </span>
                    </span>
                  )}
                </div>
                <p className="spi-stage-desc">{stage.desc}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
