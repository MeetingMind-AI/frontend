/**
 * @file Live.jsx
 * @description Real-time meeting interface for MeetingMind-AI. Connects via WebSockets to display live ASR transcript streaming, multi-agent AI debate insights, and interactive action item proposals.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { createRoot } from 'react-dom/client'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { leaveMeeting, openInsightSocket, explainMeeting, getActions, updateAction, getMeeting, deleteMeeting, getMembers } from '../api'
import { isNotificationTypeActive } from '../utils'
import { useAuth } from '../contexts/AuthContext'
import MiniPipContent from './MiniPipContent'
import LiveThinkingPanel from '../components/LiveThinkingPanel'
import './Live.css'

/** Label lookup for proposal types. */
const PROPOSAL_LABELS = { to_do: 'TO DO', parking_lot: 'PARKING LOT', to_schedule: 'TO SCHEDULE', blocker: 'BLOCKER' }

/** Set of meeting bot status strings considered active/in-progress. */
const ACTIVE_BOT_STATUSES = new Set([
  'pending',
  'requested',
  'starting',
  'dispatched',
  'joining',
  'waiting',
  'waiting_admission',
  'awaiting_admission',
  'needs_help',
  'needs_human_help',
  'active',
  'in_meeting',
  'connected',
  'stopping',
])

const READY_STATUSES = new Set(['active', 'in_meeting', 'connected'])

const LOADING_STATUS_LABELS = {
  pending:           'Preparing bot',
  requested:         'Bot starting',
  starting:          'Bot starting',
  dispatched:        'Dispatching to meeting',
  joining:           'Sending request to join',
  waiting:           'Awaiting host approval',
  waiting_admission: 'Awaiting host approval',
  awaiting_admission:'Awaiting host approval',
  needs_help:        'Blocked: Needs Host Admission',
  needs_human_help:  'Blocked: Needs Host Admission',
  active:            'Connected',
  in_meeting:        'Bot connected',
  connected:         'Bot connected',
}

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
  const { teamId, meetingId } = useParams()
  const [searchParams] = useSearchParams()
  const parsedMeetingId = meetingId ? parseInt(meetingId, 10) : null
  const nativeId = searchParams.get('native')

  const { user } = useAuth()

  const [transcript, setTranscript] = useState(null)
  const [explainLoading, setExplainLoading] = useState(false)
  const [explainTime, setExplainTime] = useState(2)
  const [elapsed, setElapsed] = useState(0)
  const [meetingType, setMeetingType] = useState('general')
  const [meetingCreatedAt, setMeetingCreatedAt] = useState(null)
  const [userRole, setUserRole] = useState('team_member')
  const [isHostOrOwner, setIsHostOrOwner] = useState(false)
  const userRoleRef = useRef('team_member')
  const isHostOrOwnerRef = useRef(false)
  useEffect(() => { userRoleRef.current = userRole }, [userRole])
  useEffect(() => { isHostOrOwnerRef.current = isHostOrOwner }, [isHostOrOwner])

  const [wsStatus, setWsStatus] = useState(parsedMeetingId ? 'connecting' : 'disconnected')
  const [botStatus, setBotStatus] = useState(null)
  const botStatusRef = useRef(null)
  const hasBeenActiveRef = useRef(false)
  const [statusHistory, setStatusHistory] = useState([])
  const [loadingPhase, setLoadingPhase] = useState(parsedMeetingId ? 'loading' : 'done')
  const [toastProposal, setToastProposal] = useState(null)
  const [modal, setModal] = useState(null)
  const [pendingProposals, setPendingProposals] = useState([])
  const [acceptedProposals, setAcceptedProposals] = useState([])
  const [pipError, setPipError] = useState(null)
  const [showThinkingPanel, setShowThinkingPanel] = useState(false)
  const [liveThoughts, setLiveThoughts] = useState([])

  /**
   * Ref holding the Set of notification type keys the current user is allowed
   * to see. Populated from their team membership notification_preferences.
   * Null means "all allowed" (no restrictions set).
   * Keys match the NOTIFICATION_TYPES defined in Settings: insight, to_do,
   * parking_lot, to_schedule, blocker.
   */
  const notifAllowedRef = useRef(null)

  // Fetch member notification preferences to know which event types to show
  useEffect(() => {
    if (!teamId || !user?.id) return
    getMembers(teamId)
      .then((members) => {
        const me = members.find((m) => m.id === user.id)
        if (!me) return
        const role = me.role === 'admin' ? 'scrum_master' : me.role === 'member' ? 'team_member' : (me.role || 'team_member')
        setUserRole(role)
        userRoleRef.current = role
        const isLead = Boolean(me.is_owner || role === 'scrum_master')
        setIsHostOrOwner(isLead)
        isHostOrOwnerRef.current = isLead
        const prefs = me.notification_preferences || []
        const ALL_TYPES = ['insight', 'to_do', 'parking_lot', 'to_schedule', 'blocker']
        const allowed = ALL_TYPES.filter((t) => isNotificationTypeActive(prefs, `type:${t}`, role))
        notifAllowedRef.current = new Set(allowed)
      })
      .catch(() => {})
  }, [teamId, user?.id])

  /** Returns true if the given notification type key is permitted for this user */
  const isNotifAllowed = useCallback((typeKey) => {
    if (notifAllowedRef.current === null) return true // no restrictions
    return notifAllowedRef.current.has(typeKey)
  }, [])

  /** Returns true if the current user role should receive intrusive toast alert and chime */
  const shouldAlertUserForProposal = useCallback((proposal) => {
    if (!proposal) return false
    const role = userRoleRef.current
    const isHost = isHostOrOwnerRef.current
    const pType = (proposal.type || proposal.action_type || 'to_do').toLowerCase()
    const pContent = (proposal.content || '').toLowerCase()
    const pTags = Array.isArray(proposal.tags) ? proposal.tags.map((t) => String(t).toLowerCase()) : []

    // If the user's notification preferences suppress this type, do not alert
    if (notifAllowedRef.current !== null && !notifAllowedRef.current.has(pType)) {
      return false
    }

    // Direct assignment check: ANY user assigned to a proposal receives an alert
    if (user) {
      if (proposal.assignee_id && Number(proposal.assignee_id) === Number(user.id)) {
        return true
      }
      if (proposal.assignee && user.name && proposal.assignee.toLowerCase() === user.name.toLowerCase()) {
        return true
      }
      if (user.name && pContent.includes(user.name.toLowerCase())) {
        return true
      }
    }

    // 1. Scrum Master / Host: receives toast alerts for all operational proposals
    if (isHost || role === 'scrum_master') {
      return ['to_do', 'parking_lot', 'to_schedule', 'blocker'].includes(pType)
    }

    // 2. Product Manager: receives insights, business, and scope proposals
    if (role === 'product_manager') {
      if (['insight', 'to_do'].includes(pType)) return true
      if (pTags.includes('business') || pTags.includes('scope')) return true
      if (pContent.includes('business') || pContent.includes('scope') || pContent.includes('feature') || pContent.includes('requirement')) return true
      return false
    }

    // 3. Team Member (Developer): kept quiet by default unless assigned (handled above)
    return false
  }, [user])

  const addThought = useCallback((thought) => {
    setLiveThoughts((prev) => [
      ...prev.slice(-150),
      {
        id: `th-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        ...thought,
      },
    ])
  }, [])

  const meetingTitle = parsedMeetingId ? `Meeting #${parsedMeetingId}` : 'Live Meeting'

  const transcriptEndRef = useRef(null)
  const wsRef = useRef(null)
  const channelRef = useRef(null)
  const pipWindowRef = useRef(null)
  const pipRootRef = useRef(null)
  const pendingProposalsRef = useRef([])
  const actionHandlersRef = useRef({ accept: null, reject: null })

  const mapChunk = (c) => ({
    id: c.id,
    speaker: c.speaker,
    text: c.text,
    rawTimestamp: c.timestamp,
    timestamp: new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    role: '',
    is_final: c.is_final !== undefined ? c.is_final : true,
  })


  useEffect(() => {
    if (!parsedMeetingId) return
    const ws = openInsightSocket(parsedMeetingId, {
      onOpen: () => {
        setWsStatus('connected')
        addThought({
          agent: 'system',
          title: 'Meeting Stream Connected',
          text: 'Live transcription channel established. Multi-agent monitor listening to context.',
        })
        // Catch up on proposals that were generated before the WS connected
        getActions(parsedMeetingId).then((actions) => {
          const allPending = [
            ...(actions.to_do?.pending ?? []),
            ...(actions.parking_lot?.pending ?? []),
            ...(actions.to_schedule?.pending ?? []),
            ...(actions.blocker?.pending ?? actions.blockers?.pending ?? []),
          ]
            .map(p => ({ ...p, type: p.type || p.action_type }))
          setPendingProposals(allPending)
          
          const allAccepted = [
            ...(actions.to_do?.accepted ?? []),
            ...(actions.parking_lot?.accepted ?? []),
            ...(actions.to_schedule?.accepted ?? []),
            ...(actions.blocker?.accepted ?? actions.blockers?.accepted ?? []),
          ]
            .map(p => ({ ...p, type: p.type || p.action_type }))
          setAcceptedProposals(allAccepted)
          
          if (allPending.length > 0) {
            const latest = allPending[allPending.length - 1]
            if (shouldAlertUserForProposal(latest)) {
              setToastProposal(latest)
              playProposalSound(latest.type)
            }
          }
        })
      },
      onClose: () => {
        setWsStatus('disconnected')
        addThought({
          agent: 'system',
          title: 'Meeting Stream Disconnected',
          text: 'Live transcription connection closed.',
        })
      },
      onChunksSnapshot: (chunks) => {
        setTranscript(chunks.map(mapChunk))
        if (chunks.length > 0) {
          addThought({
            agent: 'system',
            title: 'Transcript Snapshot Loaded',
            text: `Loaded ${chunks.length} past speaker turns from database session.`,
          })
        }
      },
      onChunk: (chunk) => {
        setTranscript((prev) => {
          if (prev === null) return [mapChunk(chunk)]
          const mapped = mapChunk(chunk)
          
          // 1. Direct ID match
          const idx = prev.findIndex((c) => c.id !== undefined && mapped.id !== undefined && String(c.id) === String(mapped.id))
          if (idx >= 0) {
            const next = [...prev]
            next[idx] = mapped
            return next
          }

          // 2. Direct speaker and timestamp match
          const tsIdx = prev.findIndex((c) => c.speaker === mapped.speaker && (c.rawTimestamp === mapped.rawTimestamp || c.timestamp === mapped.timestamp))
          if (tsIdx >= 0) {
            const next = [...prev]
            next[tsIdx] = mapped
            return next
          }

          // 3. Continuation/extension of previous chunk by same speaker (interim speech expansion)
          if (prev.length > 0) {
            const last = prev[prev.length - 1]
            if (last.speaker === mapped.speaker) {
              const lastClean = (last.text || '').trim().toLowerCase()
              const mappedClean = (mapped.text || '').trim().toLowerCase()
              if (mappedClean.startsWith(lastClean) || lastClean.endsWith('...') || lastClean.length < 15) {
                if (mapped.text.length >= last.text.length) {
                  const next = [...prev]
                  next[next.length - 1] = mapped
                  return next
                }
              }
            }
          }

          return [...prev, mapped]
        })

        const textPreview = chunk.text && chunk.text.length > 70 ? `${chunk.text.slice(0, 70)}…` : chunk.text
        addThought({
          agent: 'system',
          title: `Utterance Received: ${chunk.speaker || 'Speaker'}`,
          text: `Captured: "${textPreview}"`,
          metadata: { speaker: chunk.speaker, grounding: true },
        })
      },
      onInsight: (insight) => {
        if (!isNotifAllowed('insight')) return
        addThought({
          agent: insight.role || 'scrum_master',
          title: 'Live Context Insight',
          text: insight.text,
          metadata: { grounding: true },
        })
      },
      onProposal: (proposal) => {
        setPendingProposals((prev) => {
          if (prev.some(p => p.id === proposal.id || (p.content === proposal.content && p.type === proposal.type))) {
            return prev
          }
          return [...prev, proposal]
        })
        if (shouldAlertUserForProposal(proposal)) {
          setToastProposal(proposal)
          playProposalSound(proposal.type)
        }
        channelRef.current?.postMessage({ type: 'proposal', proposal })
        addThought({
          agent: 'scrum_master',
          title: `Proposal Identified: [${(proposal.type || 'TO DO').toUpperCase()}]`,
          text: `Extracted proposal: "${proposal.content}". Prompting participants for approval.`,
          metadata: { action: (proposal.type || 'TO DO').toUpperCase(), grounding: true },
        })
      },
      onAgentThought: (thoughtData) => {
        addThought({
          agent: thoughtData.agent || 'scrum_master',
          title: thoughtData.title || 'Agent Reasoning',
          text: thoughtData.text,
          metadata: { speaker: thoughtData.speaker, action: thoughtData.action, grounding: thoughtData.grounding },
        })
      },
    })
    wsRef.current = ws
    return () => { ws.close(); wsRef.current = null }
  }, [parsedMeetingId, addThought, isNotifAllowed, shouldAlertUserForProposal])



  const meetingCreatedAtRef = useRef(meetingCreatedAt)
  useEffect(() => { meetingCreatedAtRef.current = meetingCreatedAt }, [meetingCreatedAt])

  useEffect(() => {
    const t = setInterval(() => {
      if (meetingCreatedAtRef.current) {
        const startMs = new Date(meetingCreatedAtRef.current).getTime()
        setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
      } else {
        setElapsed((e) => e + 1)
      }
    }, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!parsedMeetingId) return
    getMeeting(parsedMeetingId).then((data) => {
      if (data?.status === 'completed' || data?.is_summarizing) {
        navigate(`/teams/${teamId}/review/${parsedMeetingId}`)
        return
      }
      if (data?.meeting_type) {
        setMeetingType(data.meeting_type)
      }
      if (data?.created_by === user?.id) {
        setIsHostOrOwner(true)
        isHostOrOwnerRef.current = true
      }
      if (data?.created_at) {
        setMeetingCreatedAt(data.created_at)
        meetingCreatedAtRef.current = data.created_at
        const startMs = new Date(data.created_at).getTime()
        setElapsed(Math.max(0, Math.floor((Date.now() - startMs) / 1000)))
      }
      if (data?.status) {
        setBotStatus(data.status)
        botStatusRef.current = data.status
      }
    }).catch(() => {})
  }, [parsedMeetingId, teamId, navigate, user?.id])

  useEffect(() => {
    if (!parsedMeetingId) return
    const t = setInterval(() => {
      if (['completed', 'failed'].includes(botStatusRef.current)) return
      getMeeting(parsedMeetingId)
        .then((data) => {
          if (data?.meeting_type) {
            setMeetingType(data.meeting_type)
          }
          if (data?.status) {
            setBotStatus(data.status)
            botStatusRef.current = data.status
          }
          if (data?.status === 'completed' || data?.is_summarizing) {
            navigate(`/teams/${teamId}/review/${parsedMeetingId}`)
          }
        })
        .catch(() => {})
    }, 2000)
    return () => clearInterval(t)
  }, [parsedMeetingId, teamId, navigate])

  useEffect(() => {
    if (!botStatus || !parsedMeetingId) return
    if (ACTIVE_BOT_STATUSES.has(botStatus)) {
      hasBeenActiveRef.current = true
      return
    }
    if (botStatus === 'completed') {
      navigate(`/teams/${teamId}/review/${parsedMeetingId}`)
    }
  }, [botStatus, parsedMeetingId, teamId, navigate])

  useEffect(() => {
    if (!botStatus || !parsedMeetingId) return
    setStatusHistory((prev) => {
      const last = prev[prev.length - 1]
      if (last?.status === botStatus) return prev
      return [...prev, { status: botStatus }]
    })
    if (READY_STATUSES.has(botStatus) || botStatus === 'completed' || botStatus === 'failed') {
      setLoadingPhase('fading')
      const t = setTimeout(() => setLoadingPhase('done'), 700)
      return () => clearTimeout(t)
    }
  }, [botStatus, parsedMeetingId])

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  const canModerate = Boolean(isHostOrOwner || userRole === 'scrum_master')

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

  const handleParkProposal = async (proposal) => {
    try {
      await updateAction(parsedMeetingId, proposal.id, 'accepted', undefined, undefined, 'parking_lot')
    } catch (e) {
      console.warn('[Live] park proposal failed:', e)
    }
    setPendingProposals((prev) => prev.filter((p) => p.id !== proposal.id))
    setAcceptedProposals((prev) => [...prev, { ...proposal, type: 'parking_lot', status: 'accepted' }])
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

  // 1. Keep a stable reference to our action handlers so the event listener always uses the latest version
  useEffect(() => {
    actionHandlersRef.current = { accept: handleAcceptProposal, reject: handleRejectProposal, park: handleParkProposal }
  }, [handleAcceptProposal, handleRejectProposal, handleParkProposal])

  // 2. Establish the two-way sync channel
  useEffect(() => {
    if (!parsedMeetingId) return
    const ch = new BroadcastChannel(`meeting-${parsedMeetingId}`)
    channelRef.current = ch

    // Listen for commands coming from the PiP window
    ch.onmessage = (e) => {
      if (e.data.type === 'action_proposal') {
        if (e.data.action === 'accepted') actionHandlersRef.current.accept?.(e.data.proposal)
        if (e.data.action === 'park') actionHandlersRef.current.park?.(e.data.proposal)
        if (e.data.action === 'rejected') actionHandlersRef.current.reject?.(e.data.proposal)
      }
    }
    return () => { ch.close(); channelRef.current = null }
  }, [parsedMeetingId])

  // 3. Broadcast timer updates to PiP window
  useEffect(() => {
    channelRef.current?.postMessage({
      type: 'sync_timer',
      elapsed,
      meetingType,
    })
  }, [elapsed, meetingType])

  // 3. Push state updates TO the PiP window whenever pendingProposals changes on the main page
  useEffect(() => {
    channelRef.current?.postMessage({ type: 'sync_proposals', pending: pendingProposals })
  }, [pendingProposals])

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
    const windowLabel = explainTime ? `last ${explainTime} minutes` : 'entire meeting'
    addThought({
      agent: 'tech_lead',
      title: 'Instant Clarity: Technical Lens Activated',
      text: `Ingesting transcript context for ${windowLabel}. Dissecting architectural trade-offs, engineering blockers, and system dependencies...`,
    })
    try {
      const data = await explainMeeting(parsedMeetingId, 'technical', explainTime)
      addThought({
        agent: 'tech_lead',
        title: 'Instant Clarity: Technical Synthesis Complete',
        text: `Synthesized technical explanation based on ${windowLabel} transcript turns.`,
        metadata: { grounding: true },
      })
      setModal({
        type: 'clarity',
        title: 'Technical Summary',
        lines: data.explanation ? [data.explanation] : [],
        reasoning: `Extracted architectural details, engineering dependencies, and code blockers from the ${windowLabel} conversation timeline.`,
      })
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
    const windowLabel = explainTime ? `last ${explainTime} minutes` : 'entire meeting'
    addThought({
      agent: 'product_manager',
      title: 'Instant Clarity: Business Lens Activated',
      text: `Ingesting transcript context for ${windowLabel}. Dissecting customer ROI, feature requirements, user workflow impact, and delivery milestones...`,
    })
    try {
      const data = await explainMeeting(parsedMeetingId, 'business', explainTime)
      addThought({
        agent: 'product_manager',
        title: 'Instant Clarity: Business Synthesis Complete',
        text: `Synthesized business explanation based on ${windowLabel} transcript turns.`,
        metadata: { grounding: true },
      })
      setModal({
        type: 'clarity',
        title: 'Business Summary',
        lines: data.explanation ? [data.explanation] : [],
        reasoning: `Evaluated customer problem statements, UX considerations, and roadmap alignment from the ${windowLabel} conversation timeline.`,
      })
    } catch (e) {
      console.error('[Live] explain business failed:', e)
      setModal({ type: 'clarity', title: 'Error', lines: ['Failed to generate explanation. Please try again.'] })
    } finally {
      setExplainLoading(false)
    }
  }

  // Keep a ref so openPip can read the latest proposals without stale closure
  useEffect(() => { pendingProposalsRef.current = pendingProposals }, [pendingProposals])

  const openPip = useCallback(async (fromBlur = false) => {
    if (!parsedMeetingId) return
    if (!fromBlur) setPipError(null)

    // Already open — bring it to front
    if (pipWindowRef.current && !pipWindowRef.current.closed) {
      pipWindowRef.current.focus()
      return
    }

    const allPendingProposals = pendingProposalsRef.current

    // Document PiP requires secure context (https or localhost)
    if (!('documentPictureInPicture' in window)) {
      // Fallback: regular popup via window.open()
      localStorage.setItem(`mini-popup-${parsedMeetingId}`, JSON.stringify({ proposals: allPendingProposals }))
      const popup = window.open(
        `/popup?meetingId=${parsedMeetingId}&teamId=${teamId}`,
        `mini-${parsedMeetingId}`,
        'popup=yes,width=380,height=560,resizable=yes,top=80,left=80',
      )
      if (popup) {
        pipWindowRef.current = popup
      } else {
        setPipError('Popup blocked — allow popups for this site')
      }
      return
    }

    try {
      // Open the always-on-top PiP window
      const pipWindow = await documentPictureInPicture.requestWindow({
        width: 380,
        height: 560,
      })
      pipWindowRef.current = pipWindow

      // Copy stylesheets from the opener document (Google Developers approach)
      ;[...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join('')
          const style = document.createElement('style')
          style.textContent = cssRules
          pipWindow.document.head.appendChild(style)
        } catch {
          // Cross-origin sheet: link it by href instead
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.type = styleSheet.type
          link.media = styleSheet.media
          link.href = styleSheet.href
          pipWindow.document.head.appendChild(link)
        }
      })

      // PiP-specific baseline styles
      const baseStyle = document.createElement('style')
      baseStyle.textContent = `
        @media all and (display-mode: picture-in-picture) {
          body { margin: 0; background: #0d1117; }
        }
      `
      pipWindow.document.head.appendChild(baseStyle)

      // Render React content into the PiP document
      const container = pipWindow.document.createElement('div')
      pipWindow.document.body.appendChild(container)

      // Capture main window reference before entering PiP context
      const mainWindow = window
      const root = createRoot(container)
      pipRootRef.current = root

      root.render(
        <MiniPipContent
          meetingId={parsedMeetingId}
          initialProposals={allPendingProposals}
          meetingType={meetingType}
          createdAt={meetingCreatedAt}
          initialElapsed={elapsed}
          onGoBack={() => {
            pipWindow.close()
            mainWindow.focus()  // focus opener per Google Developers reference
          }}
        />,
      )

      // Cleanup when PiP window is closed (per Google Developers reference)
      pipWindow.addEventListener('pagehide', () => {
        root.unmount()
        pipWindowRef.current = null
        pipRootRef.current = null
      })
    } catch (e) {
      if (e.name === 'NotAllowedError') {
        // Expected when called without a direct user gesture (e.g. blur event)
        return
      }
      if (!fromBlur) setPipError(e.message || 'Failed to open PiP')
      console.error('[Live] documentPictureInPicture.requestWindow() failed:', e)
    }
  }, [parsedMeetingId, teamId, meetingType, meetingCreatedAt, elapsed])

  // Try to open PiP automatically when user switches to another window/app.
  // The blur event is not a formal user gesture, so requestWindow() may throw
  // NotAllowedError — openPip() catches it silently. Works in Chrome 148+.
  useEffect(() => {
    if (!parsedMeetingId) return
    const handleBlur = () => openPip(true)
    window.addEventListener('blur', handleBlur)
    return () => window.removeEventListener('blur', handleBlur)
  }, [parsedMeetingId, openPip])

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
          <div className="live-logo" onClick={() => navigate(`/teams/${teamId}`)} style={{ cursor: 'pointer' }}>
            <svg viewBox="0 0 20 20" fill="none" width="20" height="20">
              <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#4f8ef7" strokeWidth="1.5" />
              <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
            </svg>
            MeetingMind
          </div>
          <div className="live-meeting-title">{meetingTitle}</div>
          {(() => {
            const config = {
              daily_standup: {
                label: 'Daily Stand-up',
                color: '#f59e0b',
                bg: 'rgba(245, 158, 11, 0.12)',
                icon: (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                ),
              },
              sprint_planning: {
                label: 'Sprint Sync',
                color: '#8b5cf6',
                bg: 'rgba(139, 92, 246, 0.12)',
                icon: (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                  </svg>
                ),
              },
              general: {
                label: 'General',
                color: '#64748b',
                bg: 'rgba(100, 116, 139, 0.12)',
                icon: (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ),
              },
            }[meetingType] || null

            if (!config) return null
            return (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: config.color,
                  background: config.bg,
                  border: `1px solid ${config.color}44`,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  marginLeft: '8px',
                }}
              >
                {config.icon}
                {config.label}
              </span>
            )
          })()}
        </div>

        <div className="live-header-center">
          <span className="live-live-badge">
            <span className="live-live-dot" /> LIVE
          </span>
          {meetingType === 'daily_standup' ? (() => {
            const remaining = 900 - elapsed
            const isOvertime = remaining < 0
            const isWarning = !isOvertime && remaining <= 180
            const displaySecs = isOvertime ? Math.abs(remaining) : Math.max(0, remaining)
            const m = Math.floor(displaySecs / 60)
            const s = displaySecs % 60
            const formatted = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`

            return (
              <div
                className="live-standup-timer-hud"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 700,
                  fontVariantNumeric: 'tabular-nums',
                  background: isOvertime
                    ? 'rgba(239, 68, 68, 0.15)'
                    : isWarning
                    ? 'rgba(245, 158, 11, 0.15)'
                    : 'rgba(16, 185, 129, 0.15)',
                  border: `1px solid ${
                    isOvertime
                      ? 'rgba(239, 68, 68, 0.4)'
                      : isWarning
                      ? 'rgba(245, 158, 11, 0.4)'
                      : 'rgba(16, 185, 129, 0.4)'
                  }`,
                  color: isOvertime ? 'var(--red, #ef4444)' : isWarning ? 'var(--yellow, #f59e0b)' : 'var(--green, #10b981)',
                }}
                title={isOvertime ? 'Standup has exceeded 15-minute timebox' : `${formatted} remaining in 15m timebox`}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Standup:
                </span>
                <span>{isOvertime ? `+${formatted} overtime` : `${formatted} remaining`}</span>
              </div>
            )
          })() : (
            <span className="live-timer">{formatTime(elapsed)}</span>
          )}
        </div>

        <div className="live-header-right">
          <button
            className={`live-header-btn live-header-btn--thoughts ${showThinkingPanel ? 'live-header-btn--active' : ''}`}
            onClick={() => setShowThinkingPanel(!showThinkingPanel)}
            title="Toggle AI Multi-Agent Details Panel"
          >
            <span className="live-brain-dot" />
            <span>✦ AI Details</span>
            {liveThoughts.length > 0 && (
              <span className="live-thoughts-pill">{liveThoughts.length}</span>
            )}
          </button>

          {parsedMeetingId && (
            <>
              <button className="live-pip-btn" onClick={openPip} title="Open floating mini panel (stays on top)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="3" width="20" height="18" rx="2" />
                  <rect x="13" y="12" width="8" height="7" rx="1" fill="currentColor" stroke="none" />
                </svg>
                Pop out
              </button>
              {pipError && (
                <span style={{ fontSize: '11px', color: 'var(--red)', maxWidth: '120px' }}>
                  {pipError}
                </span>
              )}
            </>
          )}
          <button className="live-end-btn" onClick={() => navigate('/')}>
            Home
          </button>
          <button className="live-end-btn" onClick={async () => {
            if (parsedMeetingId) {
              try { await leaveMeeting(parsedMeetingId) } catch {}
            }
            navigate(parsedMeetingId ? `/teams/${teamId}/review/${parsedMeetingId}` : `/teams/${teamId}`)
          }}>
            Finish transcription
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
            {transcript && transcript.map((msg, i) => {
              const isFirst = i === 0 || transcript[i - 1].speaker !== msg.speaker
              return (
                <div className={`live-msg${isFirst ? '' : ' live-msg--continuation'}`} key={msg.id}>
                  {isFirst ? (
                    <div className="live-msg-avatar" style={{ background: speakerColor(msg.speaker) }}>
                      {speakerInitials(msg.speaker)}
                    </div>
                  ) : (
                    <div className="live-msg-avatar-spacer" />
                  )}
                  <div className="live-msg-body">
                    {isFirst && (
                      <div className="live-msg-meta">
                        <span className="live-msg-speaker">{msg.speaker}</span>
                        <span className="live-msg-role">{msg.role}</span>
                        <span className="live-msg-time">{msg.timestamp}</span>
                      </div>
                    )}
                    <div className="live-msg-text" style={{ color: msg.is_final ? 'inherit' : 'var(--text-3)' }}>{msg.text}</div>
                  </div>
                </div>
              )
            })}
            <div ref={transcriptEndRef} />
          </div>
        </div>

        <LiveThinkingPanel
          thoughts={liveThoughts}
          isOpen={showThinkingPanel}
          onClose={() => setShowThinkingPanel(false)}
          isListening={wsStatus === 'connected'}
        />
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
            className={`live-clarity-btn live-clarity-btn--thoughts ${showThinkingPanel ? 'live-clarity-btn--active' : ''}`}
            onClick={() => setShowThinkingPanel(!showThinkingPanel)}
            title="View live multi-agent AI details and deliberation stream"
          >
            <span className="live-brain-dot" />
            AI Details
            {liveThoughts.length > 0 && (
              <span className="live-thoughts-pill" style={{ marginLeft: '4px' }}>
                {liveThoughts.length}
              </span>
            )}
          </button>

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
              {canModerate ? (
                toastProposal.type === 'parking_lot' ? (
                  <button
                    className="live-proposal-accept"
                    style={{ background: 'var(--yellow)', color: '#000', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleAcceptProposal(toastProposal)}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                    </svg>
                    Move to Parking Lot
                  </button>
                ) : (
                  <>
                    <button className="live-proposal-accept" onClick={() => handleAcceptProposal(toastProposal)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Accept
                    </button>
                    <button
                      className="live-proposal-park"
                      style={{
                        background: 'rgba(234, 179, 8, 0.18)',
                        border: '1px solid rgba(234, 179, 8, 0.4)',
                        color: 'var(--yellow)',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                      onClick={() => handleParkProposal(toastProposal)}
                      title="Park this discussion topic offline"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                      </svg>
                      Park
                    </button>
                    <button className="live-proposal-reject" onClick={() => handleRejectProposal(toastProposal)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                      Reject
                    </button>
                  </>
                )
              ) : (
                <>
                  <button className="live-proposal-accept" onClick={() => handleAcceptProposal(toastProposal)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Accept & Commit
                  </button>
                  <button className="live-proposal-reject" onClick={() => setToastProposal(null)}>
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {loadingPhase !== 'done' && (
        <div className={`live-loading-overlay${loadingPhase === 'fading' ? ' live-loading-overlay--out' : ''}`}>
          <div className="live-loading-content">
            <div className="live-loading-logo-wrap">
              <div className="live-loading-spinner" />
              <svg viewBox="0 0 20 20" fill="none" width="44" height="44">
                <polygon points="10,1 19,5.5 19,14.5 10,19 1,14.5 1,5.5" fill="none" stroke="#4f8ef7" strokeWidth="1.5" />
                <circle cx="10" cy="10" r="2.5" fill="#4f8ef7" />
              </svg>
            </div>
            <div className="live-loading-brand">MeetingMind</div>
            <div className="live-loading-tagline">Your AI assistant is joining the meeting</div>
            <div className="live-loading-steps">
              {statusHistory.length === 0 && (
                <div className="live-loading-step live-loading-step--active">
                  <span className="live-loading-step-dot">
                    <span className="live-loading-step-pulse" />
                  </span>
                  <span className="live-loading-step-label">Initializing…</span>
                </div>
              )}
              {statusHistory.map((item, idx) => {
                const isLast = idx === statusHistory.length - 1
                const isDone = !isLast || READY_STATUSES.has(item.status)
                const label = LOADING_STATUS_LABELS[item.status] || item.status.replace(/_/g, ' ')
                return (
                  <div
                    key={idx}
                    className={`live-loading-step${isDone ? ' live-loading-step--done' : ' live-loading-step--active'}`}
                  >
                    <span className="live-loading-step-dot">
                      {isDone ? (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <span className="live-loading-step-pulse" />
                      )}
                    </span>
                    <span className="live-loading-step-label">{label}</span>
                  </div>
                )
              })}
            </div>
            <button className="live-loading-cancel-btn" onClick={async () => {
              try { await deleteMeeting(parsedMeetingId) } catch {}
              navigate(`/teams/${teamId}`)
            }}>
              Cancel
            </button>
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
                            {canModerate ? (
                              <>
                                <button
                                  className="live-proposal-accept live-proposal-accept--sm"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                  onClick={() => handleAcceptProposal(p)}
                                >
                                  {p.type === 'parking_lot' ? (
                                    <>
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10" />
                                        <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                                      </svg>
                                      Move to Parking Lot
                                    </>
                                  ) : 'Accept'}
                                </button>
                                {p.type !== 'parking_lot' && (
                                  <button
                                    className="live-proposal-park live-proposal-park--sm"
                                    style={{
                                      background: 'rgba(234, 179, 8, 0.18)',
                                      border: '1px solid rgba(234, 179, 8, 0.4)',
                                      color: 'var(--yellow)',
                                      padding: '5px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                    onClick={() => handleParkProposal(p)}
                                  >
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <circle cx="12" cy="12" r="10" />
                                      <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                                    </svg>
                                    Park
                                  </button>
                                )}
                                <button className="live-proposal-reject live-proposal-reject--sm" onClick={() => handleRejectProposal(p)}>
                                  Reject
                                </button>
                              </>
                            ) : (
                              (p.assignee_id && Number(p.assignee_id) === Number(user?.id)) ||
                              (p.assignee && user?.name && p.assignee.toLowerCase() === user.name.toLowerCase()) ||
                              (user?.name && (p.content || '').toLowerCase().includes(user.name.toLowerCase())) ? (
                                <button className="live-proposal-accept live-proposal-accept--sm" onClick={() => handleAcceptProposal(p)}>
                                  Accept & Commit
                                </button>
                              ) : (
                                <span style={{ fontSize: '11px', color: 'var(--text-3)', fontStyle: 'italic' }}>
                                  Pending Moderator Review
                                </span>
                              )
                            )}
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
                <>
                  <div className="live-ai-disclaimer" style={{ fontSize: '11px', color: 'var(--text-3)', padding: '6px 10px', background: 'var(--bg-3)', borderRadius: '6px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="16" x2="12" y2="12"/>
                      <line x1="12" y1="8" x2="12.01" y2="8"/>
                    </svg>
                    <span>✦ AI generated insight &middot; Verify critical information</span>
                  </div>
                  {modal.lines.map((line, i) => (
                    <p key={i} className={`live-modal-line ${line === '' ? 'live-modal-line--spacer' : ''}`}>
                      {line}
                    </p>
                  ))}
                  {modal.reasoning && (
                    <div className="live-clarity-reasoning-toggle">
                      <div className="live-clarity-reasoning-btn">
                        <span>✦ AI Reasoning Details</span>
                      </div>
                      <div className="live-clarity-reasoning-content">
                        {modal.reasoning}
                      </div>
                    </div>
                  )}
                </>
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
