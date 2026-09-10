/**
 * @file QuickstartModal.jsx
 * @description Interactive onboarding mini-tutorial introducing MeetingMind AI's multi-agent architecture,
 * meeting bot launcher, live Picture-in-Picture / Instant Clarity features, and post-meeting Agile Kanban sync.
 */

import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import './QuickstartModal.css'

/**
 * QuickstartModal component.
 *
 * @param {Object} props
 * @param {Function} props.onClose - Callback when modal is closed or completed.
 * @param {number} [props.initialStep=1] - Starting slide step (1 to 4).
 */
export default function QuickstartModal({ onClose, initialStep = 1 }) {
  const { user } = useAuth()
  const [step, setStep] = useState(initialStep)

  const handleFinish = () => {
    onClose?.()
  }

  const handleClose = () => {
    onClose?.()
  }

  return (
    <div className="qsm-backdrop" onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div className="qsm-modal">
        {/* Header */}
        <div className="qsm-header">
          <div className="qsm-logo-wrap">
            <svg viewBox="0 0 20 20" fill="none" width="22" height="22">
              <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#4f8ef7" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
            </svg>
            <div>
              <span className="qsm-brand">MeetingMind AI</span>
              <span className="qsm-sub">Quickstart Guide & Tour</span>
            </div>
          </div>
          <button className="qsm-close-btn" onClick={handleClose} title="Close guide">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Step Tabs */}
        <div className="qsm-steps">
          <button
            type="button"
            className={`qsm-step-tab ${step === 1 ? 'qsm-step-tab--active' : ''} ${step > 1 ? 'qsm-step-tab--done' : ''}`}
            onClick={() => setStep(1)}
          >
            <span className="qsm-step-number">1</span>
            <span className="qsm-step-title">AI Agents</span>
          </button>
          <button
            type="button"
            className={`qsm-step-tab ${step === 2 ? 'qsm-step-tab--active' : ''} ${step > 2 ? 'qsm-step-tab--done' : ''}`}
            onClick={() => setStep(2)}
          >
            <span className="qsm-step-number">2</span>
            <span className="qsm-step-title">Dispatch Bot</span>
          </button>
          <button
            type="button"
            className={`qsm-step-tab ${step === 3 ? 'qsm-step-tab--active' : ''} ${step > 3 ? 'qsm-step-tab--done' : ''}`}
            onClick={() => setStep(3)}
          >
            <span className="qsm-step-number">3</span>
            <span className="qsm-step-title">Live PiP & Clarity</span>
          </button>
          <button
            type="button"
            className={`qsm-step-tab ${step === 4 ? 'qsm-step-tab--active' : ''}`}
            onClick={() => setStep(4)}
          >
            <span className="qsm-step-number">4</span>
            <span className="qsm-step-title">Review & Kanban</span>
          </button>
        </div>

        {/* Body */}
        <div className="qsm-body">
          {/* SLIDE 1: Multi-Agent Team */}
          {step === 1 && (
            <div className="qsm-slide">
              <div className="qsm-slide-header">
                <span className="qsm-tag">BOLAA Framework</span>
                <h2 className="qsm-slide-title">Meet Your Multi-Agent AI Team</h2>
                <p className="qsm-slide-desc">
                  Instead of a single generic summary, MeetingMind AI deploys three specialized local AI personas that deliberate in real-time.
                </p>
              </div>

              <div className="qsm-personas-grid">
                <div className="qsm-persona-card qsm-persona--tech">
                  <div className="qsm-persona-badge">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="16 18 22 12 16 6" />
                      <polyline points="8 6 2 12 8 18" />
                    </svg>
                    <span>Tech Lead</span>
                  </div>
                  <h4 className="qsm-persona-title">Architecture & Code</h4>
                  <p className="qsm-persona-text">
                    Scrutinizes technical debt, evaluates database schema and API changes, and surfaces architectural trade-offs.
                  </p>
                </div>

                <div className="qsm-persona-card qsm-persona--pm">
                  <div className="qsm-persona-badge">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                    <span>Product Manager</span>
                  </div>
                  <h4 className="qsm-persona-title">Scope & User Value</h4>
                  <p className="qsm-persona-text">
                    Champions user stories, customer impact, sprint deliverables, and business feasibility across teams.
                  </p>
                </div>

                <div className="qsm-persona-card qsm-persona--sm">
                  <div className="qsm-persona-badge">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                    </svg>
                    <span>Scrum Master</span>
                  </div>
                  <h4 className="qsm-persona-title">Synthesis & Actions</h4>
                  <p className="qsm-persona-text">
                    Moderates the debate, drives cross-functional consensus, and extracts structured action items and blockers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 2: Bot Dispatch & Meeting Modes */}
          {step === 2 && (
            <div className="qsm-slide">
              <div className="qsm-slide-header">
                <span className="qsm-tag">Sensor Zone</span>
                <h2 className="qsm-slide-title">Dispatching the Meeting Bot</h2>
                <p className="qsm-slide-desc">
                  Bring your local AI assistant into any call with zero third-party telemetry.
                </p>
              </div>

              <div className="qsm-flow-steps">
                <div className="qsm-flow-item">
                  <div className="qsm-flow-num">1</div>
                  <div className="qsm-flow-content">
                    <h4>Paste Meeting Link</h4>
                    <p>Supports <strong>Google Meet</strong> and <strong>Microsoft Teams</strong> directly from the team dashboard.</p>
                  </div>
                </div>

                <div className="qsm-flow-item">
                  <div className="qsm-flow-num">2</div>
                  <div className="qsm-flow-content">
                    <h4>Select Meeting Mode</h4>
                    <div className="qsm-modes-preview">
                      <div className="qsm-mode-pill">
                        <strong>🎯 Sprint Planning</strong>: Focuses on story points, backlog sizing, and task breakdowns.
                      </div>
                      <div className="qsm-mode-pill">
                        <strong>⚡ General Sync</strong>: Streamlines standups, blockers, and quick operational alignment.
                      </div>
                    </div>
                  </div>
                </div>

                <div className="qsm-flow-item">
                  <div className="qsm-flow-num">3</div>
                  <div className="qsm-flow-content">
                    <h4>Local Offline Transcription</h4>
                    <p>The headless bot joins your call, captures audio, and processes speech-to-text locally via Whisper. Your audio never leaves your machine.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: Live Superpowers */}
          {step === 3 && (
            <div className="qsm-slide">
              <div className="qsm-slide-header">
                <span className="qsm-tag">In-Call Experience</span>
                <h2 className="qsm-slide-title">Live Picture-in-Picture & Instant Clarity</h2>
                <p className="qsm-slide-desc">
                  Never lose track of the conversation or get stuck on complex terminology during meetings.
                </p>
              </div>

              <div className="qsm-features-row">
                <div className="qsm-feature-box">
                  <div className="qsm-feature-icon" style={{ color: 'var(--accent, #4f8ef7)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <rect x="12" y="9" width="8" height="6" rx="1" fill="rgba(79, 142, 247, 0.3)" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                  </div>
                  <h3>Document Picture-in-Picture</h3>
                  <p>
                    Pop out a native Chrome floating HUD that stays on top of your video call. Follow the live streaming transcript with speaker attributions in real time.
                  </p>
                </div>

                <div className="qsm-feature-box">
                  <div className="qsm-feature-icon" style={{ color: 'var(--purple, #a855f7)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3>Instant Clarity Engine</h3>
                  <p>
                    Heard an unfamiliar acronym or technical topic? Click <strong>"Explain Technical"</strong> or <strong>"Explain Business"</strong> for on-demand answers from the 60-second transcript cache.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 4: Review & Kanban Sync */}
          {step === 4 && (
            <div className="qsm-slide">
              <div className="qsm-slide-header">
                <span className="qsm-tag">Agile Operations</span>
                <h2 className="qsm-slide-title">Review, Auditing & Kanban Sync</h2>
                <p className="qsm-slide-desc">
                  Turn hours of meeting conversation into structured, verifiable deliverables for your team.
                </p>
              </div>

              <div className="qsm-summary-grid">
                <div className="qsm-summary-item">
                  <div className="qsm-item-dot" style={{ background: '#4f8ef7' }} />
                  <div>
                    <h4>Live Debate Stream</h4>
                    <p>Watch the Tech Lead and PM personas deliberate trade-offs, debate scope, and converge on solutions before generating the report.</p>
                  </div>
                </div>

                <div className="qsm-summary-item">
                  <div className="qsm-item-dot" style={{ background: '#d29922' }} />
                  <div>
                    <h4>Transcript Audit & Rollback</h4>
                    <p>Notice a misheard speaker or technical phrase? Edit the transcript directly, view the full audit history, or rollback changes before re-summarizing.</p>
                  </div>
                </div>

                <div className="qsm-summary-item">
                  <div className="qsm-item-dot" style={{ background: '#3fb950' }} />
                  <div>
                    <h4>One-Click Kanban Triage</h4>
                    <p>Approved action items automatically populate your team’s <strong>Global Kanban</strong>, <strong>Parking Lot</strong>, and <strong>Schedule</strong> with assignees and tags.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="qsm-footer">
          <div className="qsm-step-indicator">
            Step {step} of 4
          </div>

          <div className="qsm-btn-group">
            {step > 1 ? (
              <button
                type="button"
                className="qsm-btn qsm-btn--ghost"
                onClick={() => setStep((s) => s - 1)}
              >
                ← Back
              </button>
            ) : (
              <button
                type="button"
                className="qsm-btn qsm-btn--ghost"
                onClick={handleClose}
              >
                Skip Tour
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                className="qsm-btn qsm-btn--primary"
                onClick={() => setStep((s) => s + 1)}
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                className="qsm-btn qsm-btn--primary"
                onClick={handleFinish}
              >
                Get Started with MeetingMind
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
