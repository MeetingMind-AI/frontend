import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { leaveMeeting, openInsightSocket, explainMeeting, getActions, updateAction } from '../api'
import './Live.css'

const PROPOSAL_LABELS = { to_do: 'TO DO', parking_lot: 'PARKING LOT', to_schedule: 'TO SCHEDULE' }

function playProposalSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 660
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.2, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch (_) {}
}

function Live() {
  const navigate = useNavigate()
  const { meetingId } = useParams()
  const [searchParams] = useSearchParams()
  const parsedMeetingId = meetingId ? parseInt(meetingId, 10) : null
  const nativeId = searchParams.get('native')

  const [transcript, setTranscript] = useState(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainTime, setExplainTime] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [wsStatus, setWsStatus] = useState(parsedMeetingId ? 'connecting' : 'disconnected')
  const [toastProposal, setToastProposal] = useState(null)
  const [modal, setModal] = useState(null)
  const [pendingProposals, setPendingProposals] = useState([])
  const [acceptedProposals, setAcceptedProposals] = useState([])

  const meetingTitle = parsedMeetingId ? `Meeting #${parsedMeetingId}` : 'Live Meeting'

  const transcriptEndRef = useRef(null)
  const wsRef = useRef(null)

  const mapChunk = (c) => ({
    id: c.id,
    speaker: c.speaker,
    text: c.text,
    timestamp: new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    role: '',
  })

  useEffect(() => {
    if (!parsedMeetingId) return
    const ws = openInsightSocket(parsedMeetingId, {
      onOpen: () => setWsStatus('connected'),
      onClose: () => setWsStatus('disconnected'),
      onChunksSnapshot: (chunks) => {
        setTranscript(chunks.map(mapChunk))
      },
      onChunk: (chunk) => {
        setTranscript((prev) => {
          if (prev === null) return null
          return [...prev, mapChunk(chunk)]
        })
      },
      onProposal: (proposal) => {
        setPendingProposals((prev) => [...prev, proposal])
        setToastProposal(proposal)
        playProposalSound(proposal.type)
      },
    })
    wsRef.current = ws
    return () => { ws.close(); wsRef.current = null }
  }, [parsedMeetingId])



  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000)
    return () => clearInterval(t)
  }, [])

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

  const handleAcceptProposal = async (proposal) => {
    try {
      await updateAction(parsedMeetingId, proposal.id, 'accepted')
    } catch (e) {
      console.warn('[Live] accept proposal failed:', e)
    }
    setPendingProposals((prev) => prev.filter((p) => p.id !== proposal.id))
    setAcceptedProposals((prev) => [...prev, { ...proposal, status: 'accepted' }])
    setToastProposal(null)
  }

  const handleRejectProposal = async (proposal) => {
    try {
      await updateAction(parsedMeetingId, proposal.id, 'rejected')
    } catch (e) {
      console.warn('[Live] reject proposal failed:', e)
    }
    setPendingProposals((prev) => prev.filter((p) => p.id !== proposal.id))
    setToastProposal(null)
  }

  const handleShowProposals = async () => {
    try {
      const data = await getActions(parsedMeetingId)
      setPendingProposals(Object.values(data).flatMap(t => t.pending ?? []))
      setAcceptedProposals(Object.values(data).flatMap(t => t.accepted ?? []))
    } catch (e) {
      console.warn('[Live] fetch actions failed:', e)
    }
    setModal({ type: 'proposals' })
  }

  const handleExplainTechnical = async () => {
    if (!parsedMeetingId) return
    setExplainLoading(true)
    try {
      const data = await explainMeeting(parsedMeetingId, 'technical', explainTime)
      setModal({ type: 'clarity', title: 'Technical Summary', lines: data.explanation ? [data.explanation] : [] })
    } catch (e) {
      console.error('[Live] explain technical failed:', e)
      setModal({ type: 'clarity', title: 'Error', lines: ['Failed to generate explanation. Please try again.'] })
    } finally {
      setExplainLoading(false)
    }
  }

  const handleExplainBusiness = async () => {
    if (!parsedMeetingId) return
    setExplainLoading(true)
    try {
      const data = await explainMeeting(parsedMeetingId, 'business', explainTime)
      setModal({ type: 'clarity', title: 'Business Summary', lines: data.explanation ? [data.explanation] : [] })
    } catch (e) {
      console.error('[Live] explain business failed:', e)
      setModal({ type: 'clarity', title: 'Error', lines: ['Failed to generate explanation. Please try again.'] })
    } finally {
      setExplainLoading(false)
    }
  }

  const speakerInitials = (name) =>
    name.split(' ').map((n) => n[0]).join('').toUpperCase()

  const speakerColor = (name) => {
    const colors = ['#4f8ef7', '#3fb950', '#bc8cff', '#d29922', '#e3884c', '#f85149']
    let hash = 0
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff
    return colors[hash % colors.length]
  }

  return (
    <div className="live-page">
      <header className="live-header">
        <div className="live-header-left">
          <div className="live-logo">
            <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
              <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#4f8ef7" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
            </svg>
            MeetingMind
          </div>
          <div className="live-meeting-title">{meetingTitle}</div>
        </div>

        <div className="live-header-center">
          <span className="live-live-badge">
            <span className="live-live-dot" /> LIVE
          </span>
          <span className="live-timer">{formatTime(elapsed)}</span>
        </div>

        <div className="live-header-right">
          <button className="live-end-btn" onClick={() => navigate('/')}>
            Home
          </button>
          <button className="live-end-btn" onClick={async () => {
            if (parsedMeetingId) {
              try { await leaveMeeting(parsedMeetingId) } catch {}
            }
            navigate(parsedMeetingId ? `/review/${parsedMeetingId}` : '/review')
          }}>
            End Meeting
          </button>
        </div>
      </header>

      <div className="live-body">
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
            {transcript === null && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '12px', color: 'var(--text-3)', paddingTop: '60px' }}>
                <div className="live-typing" style={{ gap: '5px' }}>
                  <span className="live-typing-dot" style={{ animationDelay: '0ms' }} />
                  <span className="live-typing-dot" style={{ animationDelay: '200ms' }} />
                  <span className="live-typing-dot" style={{ animationDelay: '400ms' }} />
                </div>
                <span style={{ fontSize: '13px' }}>Connecting to transcription...</span>
              </div>
            )}
            {transcript !== null && transcript.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-3)', fontSize: '13px', paddingTop: '60px' }}>
                No transcript captured yet — speak to begin.
              </div>
            )}
            {transcript && transcript.map((msg) => (
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

      <div className="live-clarity-bar">
        <span className="live-clarity-label">Instant Clarity</span>

        <select
          className="live-clarity-select"
          value={explainTime || ''}
          onChange={(e) => setExplainTime(e.target.value ? parseInt(e.target.value, 10) : null)}
        >
          <option value="">Entire Meeting</option>
          <option value="2">Last 2 mins</option>
          <option value="5">Last 5 mins</option>
        </select>

        <button
          className="live-clarity-btn live-clarity-btn--tech"
          onClick={handleExplainTechnical}
          disabled={explainLoading}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
          </svg>
          {explainLoading ? 'Loading…' : 'Explain — Technical'}
        </button>
        <button
          className="live-clarity-btn live-clarity-btn--biz"
          onClick={handleExplainBusiness}
          disabled={explainLoading}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          {explainLoading ? 'Loading…' : 'Explain — Business'}
        </button>

        {parsedMeetingId && (
          <>
          <button
            className="live-clarity-btn live-clarity-btn--proposal"
            onClick={handleShowProposals}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Proposals
            {pendingProposals.length > 0 && (
              <span style={{
                marginLeft: '5px', background: 'var(--yellow)', color: 'var(--bg-1)',
                borderRadius: '99px', padding: '1px 6px', fontSize: '11px', fontWeight: 700,
              }}>
                {pendingProposals.length}
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

      {toastProposal && (
        <div className="live-proposal-overlay">
          <div className={`live-proposal-toast live-proposal-toast--${toastProposal.type}`}>
            <div className="live-proposal-header">
              <div className={`live-proposal-badge live-proposal-badge--${toastProposal.type}`}>
                {PROPOSAL_LABELS[toastProposal.type] ?? 'PARKING LOT'}
              </div>
              <button className="live-proposal-close" onClick={() => setToastProposal(null)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="live-proposal-content">{toastProposal.content}</p>
            <div className="live-proposal-actions">
              <button className="live-proposal-accept" onClick={() => handleAcceptProposal(toastProposal)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Accept
              </button>
              <button className="live-proposal-reject" onClick={() => handleRejectProposal(toastProposal)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="live-modal-backdrop" onClick={() => setModal(null)}>
          <div className="live-modal" onClick={(e) => e.stopPropagation()}>
            <div className="live-modal-header">
              <span className="live-modal-title">
                {modal.type === 'proposals' ? 'Proposals' :
                 modal.title || 'Details'}
              </span>
              <button className="live-modal-close" onClick={() => setModal(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="live-modal-body">
              {modal.type === 'proposals' && (
                <>
                  {pendingProposals.length === 0 && acceptedProposals.length === 0 && (
                    <p className="live-modal-line" style={{ color: 'var(--text-3)' }}>
                      No proposals detected yet.
                    </p>
                  )}
                  {pendingProposals.length > 0 && (
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: 'var(--yellow)', display: 'block', marginBottom: '8px',
                      }}>
                        Pending ({pendingProposals.length})
                      </span>
                      {pendingProposals.map((p) => (
                        <div key={p.id} className="live-proposal-card">
                          <div className="live-proposal-card-top">
                            <span className={`live-proposal-card-badge live-proposal-card-badge--${p.type}`}>
                              {PROPOSAL_LABELS[p.type] ?? 'PARKING LOT'}
                            </span>
                          </div>
                          <p className="live-proposal-card-text">{p.content}</p>
                          <div className="live-proposal-card-actions">
                            <button className="live-proposal-accept live-proposal-accept--sm" onClick={() => handleAcceptProposal(p)}>
                              Accept
                            </button>
                            <button className="live-proposal-reject live-proposal-reject--sm" onClick={() => handleRejectProposal(p)}>
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {acceptedProposals.length > 0 && (
                    <div>
                      <span style={{
                        fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.07em', color: 'var(--green)', display: 'block', marginBottom: '8px',
                      }}>
                        Accepted ({acceptedProposals.length})
                      </span>
                      {acceptedProposals.map((p) => (
                        <div key={p.id} className="live-proposal-card live-proposal-card--accepted">
                          <div className="live-proposal-card-top">
                            <span className={`live-proposal-card-badge live-proposal-card-badge--${p.type}`}>
                              {PROPOSAL_LABELS[p.type] ?? 'PARKING LOT'}
                            </span>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2.5">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                          <p className="live-proposal-card-text">{p.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
              {modal.type === 'clarity' && (
                modal.lines.map((line, i) => (
                  <p key={i} className={`live-modal-line ${line === '' ? 'live-modal-line--spacer' : ''}`}>
                    {line}
                  </p>
                ))
              )}
            </div>
            {modal.type !== 'proposals' && (
              <div className="live-modal-footer">
                <button className="live-modal-dismiss" onClick={() => setModal(null)}>
                  Got it
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Live
