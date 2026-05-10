import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { mockTranscript, mockPreviousParkingLot } from '../mockData'
import { leaveMeeting, openInsightSocket } from '../api'
import { useDemoMode } from '../DemoContext'
import './Live.css'

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.25, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.7)
  } catch (_) {}
}

const CLARITY_CONTENT = {
  technical: {
    title: 'Technical Summary',
    lines: [
      'Context: Estimation disagreement on the analytics dashboard feature.',
      '',
      'Technical Points:',
      '  • WebSocket client integration is the main complexity driver',
      '  • Backend API is already deployed and stable (not a blocker)',
      '  • Reconnection logic, state management, and loading states add scope',
      '  • David estimates 5pts; Bob estimates 3pts — gap reflects different assumptions about error handling',
      '',
      'Key risk: Underestimating WebSocket edge cases could cause mid-sprint scope creep.',
    ],
  },
  business: {
    title: 'Business Summary',
    lines: [
      'For non-technical stakeholders:',
      '',
      'The team is debating how much work is needed for the analytics dashboard.',
      'One person thinks it\'s simpler (3 units), another thinks it\'s more complex (5 units).',
      '',
      'Business impact:',
      '  • The dashboard is the #1 enterprise customer request this quarter',
      '  • Underestimating it risks a mid-sprint slip and delayed delivery',
      '  • A team vote (planning poker) is being run to resolve this objectively',
    ],
  },
}

function Live() {
  const navigate = useNavigate()
  const { meetingId } = useParams()
  const parsedMeetingId = meetingId ? parseInt(meetingId, 10) : null
  const { demo } = useDemoMode()

  const [transcript, setTranscript] = useState(demo ? mockTranscript.slice(0, 4) : [])
  const [bannerOpen, setBannerOpen] = useState(true)
  const [conflict, setConflict] = useState(false)
  const [autoMode, setAutoMode] = useState(false)
  const [clarityModal, setClarityModal] = useState(null)
  const [elapsed, setElapsed] = useState(549) // start at ~9 min into meeting
  const [liveInsights, setLiveInsights] = useState([])
  const [wsStatus, setWsStatus] = useState(parsedMeetingId ? 'connecting' : 'disconnected')

  const MAX_INSIGHTS = 50

  const transcriptEndRef = useRef(null)
  const transcriptIdxRef = useRef(4)
  const sentCountRef = useRef(0)
  const autoModeRef = useRef(false)
  const wsRef = useRef(null)

  useEffect(() => {
    autoModeRef.current = autoMode
  }, [autoMode])

  // Open backend WebSocket for AI insights
  useEffect(() => {
    if (!parsedMeetingId) return
    const ws = openInsightSocket(parsedMeetingId, {
      onOpen: () => setWsStatus('connected'),
      onClose: () => setWsStatus('disconnected'),
      onInsight: ({ role, text }) =>
        setLiveInsights((prev) => {
          const next = [...prev, { role, text }]
          return next.length > MAX_INSIGHTS ? next.slice(-MAX_INSIGHTS) : next
        }),
    })
    wsRef.current = ws
    return () => { ws.close(); wsRef.current = null }
  }, [parsedMeetingId])

  // Send new transcript entries to backend as they arrive
  useEffect(() => {
    if (!wsRef.current) return
    while (sentCountRef.current < transcript.length) {
      const entry = transcript[sentCountRef.current]
      wsRef.current.send(entry.speaker, entry.text)
      sentCountRef.current++
    }
  }, [transcript])

  // Meeting clock
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Simulate live transcript additions (demo mode only)
  useEffect(() => {
    if (!demo) return
    const t = setInterval(() => {
      if (transcriptIdxRef.current < mockTranscript.length) {
        setTranscript((prev) => [...prev, mockTranscript[transcriptIdxRef.current]])
        transcriptIdxRef.current++
      }
    }, 3500)
    return () => clearInterval(t)
  }, [demo])

  // Conflict detection trigger
  useEffect(() => {
    const t = setTimeout(() => {
      if (!autoModeRef.current) {
        setConflict(true)
        playBeep()
      }
    }, 11000)
    return () => clearTimeout(t)
  }, [])

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const formatTime = (s) => {
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const sec = s % 60
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const handleConflictAccept = () => {
    setConflict(false)
  }

  const handleConflictReject = () => {
    setConflict(false)
  }

  const speakerInitials = (name) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()

  const speakerColor = (name) => {
    const colors = ['#4f8ef7', '#3fb950', '#bc8cff', '#d29922', '#e3884c', '#f85149']
    let hash = 0
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
    return colors[hash % colors.length]
  }

  return (
    <div className="live-page">
      {/* ── Header ── */}
      <header className="live-header">
        <div className="live-header-left">
          <div className="live-logo">
            <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
              <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#4f8ef7" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
            </svg>
            MeetingMind
          </div>
          <div className="live-meeting-title">Sprint 14 Planning</div>
        </div>

        <div className="live-header-center">
          <span className="live-live-badge">
            <span className="live-live-dot" /> LIVE
          </span>
          <span className="live-timer">{formatTime(elapsed)}</span>
          <div className="live-participants">
            {['Alice Chen', 'Bob Martinez', 'Carol Singh', 'David Kim'].map((name) => (
              <div
                key={name}
                className="live-avatar"
                style={{ background: speakerColor(name) }}
                title={name}
              >
                {speakerInitials(name)}
              </div>
            ))}
          </div>
        </div>

        <div className="live-header-right">
          <div className="live-auto-toggle">
            <span className="live-auto-label">Auto Mode</span>
            <button
              className={`live-toggle ${autoMode ? 'live-toggle--on' : ''}`}
              onClick={() => setAutoMode((v) => !v)}
              title="Automatically accept parking lot suggestions"
            >
              <span className="live-toggle-knob" />
            </button>
          </div>
          <button className="live-end-btn" onClick={async () => {
            if (parsedMeetingId) {
              try { await leaveMeeting(parsedMeetingId) } catch {}
            }
            navigate('/review')
          }}>
            End Meeting
          </button>
        </div>
      </header>

      {/* ── Previous Parking Lot Banner (demo only) ── */}
      {demo && bannerOpen && (
        <div className="live-banner">
          <div className="live-banner-top">
            <div className="live-banner-title">
              <span className="live-banner-icon">⚠</span>
              Unresolved from last meeting
              <span className="live-banner-count">{mockPreviousParkingLot.length}</span>
            </div>
            <button className="live-banner-close" onClick={() => setBannerOpen(false)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="live-banner-items">
            {mockPreviousParkingLot.map((item, i) => (
              <div className="live-banner-item" key={i}>
                <span className="live-banner-p">P</span>
                {item}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Panels ── */}
      <div className="live-body">
        {/* Panel B — Transcript */}
        <div className="live-transcript">
          <div className="live-panel-header">
            <span className="live-panel-title">Live Transcript</span>
            <div className="live-typing">
              <span className="live-typing-dot" style={{ animationDelay: '0ms' }} />
              <span className="live-typing-dot" style={{ animationDelay: '200ms' }} />
              <span className="live-typing-dot" style={{ animationDelay: '400ms' }} />
              <span>Transcribing</span>
            </div>
          </div>
          <div className="live-transcript-feed">
            {transcript.map((msg) => (
              <div className="live-msg" key={msg.id}>
                <div className="live-msg-avatar" style={{ background: speakerColor(msg.speaker) }}>
                  {speakerInitials(msg.speaker)}
                </div>
                <div className="live-msg-body">
                  <div className="live-msg-meta">
                    <span className="live-msg-speaker">{msg.speaker}</span>
                    <span className="live-msg-role">{msg.role}</span>
                    <span className="live-msg-time">{msg.timestamp}</span>
                  </div>
                  <div className="live-msg-text">{msg.text}</div>
                </div>
              </div>
            ))}
            <div ref={transcriptEndRef} />
          </div>
        </div>

      </div>

      {/* Panel D — Clarity Bar */}
      <div className="live-clarity-bar">
        <span className="live-clarity-label">Instant Clarity</span>
        <button className="live-clarity-btn live-clarity-btn--tech" onClick={() => setClarityModal(CLARITY_CONTENT.technical)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
          </svg>
          Explain — Technical
        </button>
        <button className="live-clarity-btn live-clarity-btn--biz" onClick={() => setClarityModal(CLARITY_CONTENT.business)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          Explain — Business
        </button>
        {parsedMeetingId && (
          <>
          <button
            className="live-clarity-btn live-clarity-btn--ai"
            onClick={() => setClarityModal({ type: 'insights' })}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            AI Insights
            {liveInsights.length > 0 && (
              <span style={{
                marginLeft: '5px', background: 'var(--accent)', color: '#fff',
                borderRadius: '99px', padding: '1px 6px', fontSize: '11px', fontWeight: 600,
              }}>
                {liveInsights.length}
              </span>
            )}
          </button>
          <div className="live-ws-status">
            <span className={`live-ws-dot live-ws-dot--${wsStatus}`} />
            {wsStatus === 'connected' ? 'AI connected' : wsStatus === 'connecting' ? 'Connecting…' : 'AI offline'}
          </div>
          </>
        )}
      </div>

      {/* Panel E — Conflict Detection Toast */}
      {conflict && (
        <div className="live-conflict-overlay">
          <div className="live-conflict-toast">
            <div className="live-conflict-header">
              <div className="live-conflict-pulse" />
              <div>
                <div className="live-conflict-title">Derailment Detected</div>
              </div>
            </div>
            <p className="live-conflict-desc">Propose to send this topic to the Parking Lot?</p>
            <div className="live-conflict-topic">
              <div className="live-conflict-topic-name">Analytics Dashboard Estimation</div>
              <div className="live-conflict-topic-desc">3pt vs 5pt disagreement — needs async vote</div>
            </div>
            <div className="live-conflict-actions">
              <button className="live-conflict-accept" onClick={handleConflictAccept}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Accept — Park it
              </button>
              <button className="live-conflict-reject" onClick={handleConflictReject}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Reject — Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clarity Modal */}
      {clarityModal && (
        <div className="live-modal-backdrop" onClick={() => setClarityModal(null)}>
          <div className="live-modal" onClick={(e) => e.stopPropagation()}>
            <div className="live-modal-header">
              <span className="live-modal-title">
                {clarityModal.type === 'insights' ? 'Live AI Insights' : clarityModal.title}
              </span>
              <button className="live-modal-close" onClick={() => setClarityModal(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="live-modal-body">
              {clarityModal.type === 'insights' ? (
                liveInsights.length === 0 ? (
                  <p className="live-modal-line" style={{ color: 'var(--text-3)' }}>
                    No insights yet — they'll appear as the transcript is processed.
                  </p>
                ) : (
                  liveInsights.map((ins, i) => (
                    <div key={i} style={{ marginBottom: '12px' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 600, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: 'var(--accent)', display: 'block',
                        marginBottom: '3px',
                      }}>
                        {ins.role.replace(/_/g, ' ')}
                      </span>
                      <p className="live-modal-line">{ins.text}</p>
                    </div>
                  ))
                )
              ) : (
                clarityModal.lines.map((line, i) => (
                  <p key={i} className={`live-modal-line ${line === '' ? 'live-modal-line--spacer' : ''}`}>
                    {line}
                  </p>
                ))
              )}
            </div>
            <div className="live-modal-footer">
              <button className="live-modal-dismiss" onClick={() => setClarityModal(null)}>
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Live
