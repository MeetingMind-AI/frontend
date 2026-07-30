/**
 * @file api.js
 * @description HTTP client SDK and WebSocket client for interacting with the MeetingMind-AI backend REST API.
 */

const BASE = import.meta.env.VITE_API_URL ?? ''

/**
 * Constructs the WebSocket base URL based on the current window location protocol and host.
 *
 * @returns {string} WebSocket URL scheme and host (ws: or wss:).
 */
function wsBase() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}`
}

/**
 * Extracts human-readable error detail from API error responses.
 *
 * @param {Object} body - Parsed JSON response body.
 * @param {number} status - HTTP status code.
 * @returns {string} Extracted error message.
 */
function extractError(body, status) {
  let detail = body.detail
  if (!detail) return `HTTP ${status}`
  if (typeof detail === 'string') {
    try {
      const inner = JSON.parse(detail)
      detail = inner.detail ?? inner
    } catch {}
  }
  if (Array.isArray(detail)) {
    const msg = detail[0]?.msg ?? ''
    return msg.replace(/^value error,\s*/i, '')
  }
  return typeof detail === 'string' ? detail : `HTTP ${status}`
}

/**
 * Wrapper around window.fetch including session credentials and error handling.
 *
 * @param {string} path - Relative API endpoint path.
 * @param {Object} [options={}] - Fetch options.
 * @returns {Promise<any>} Parsed JSON response.
 */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractError(body, res.status))
  }
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────────────────────


  export async function getMe() {
    return apiFetch('/api/auth/me')
  }

  export async function login(email, password) {
    return apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  }

  export async function signup(email, name, password, confirmPassword, photoB64 = null) {
    return apiFetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        name,
        password,
        confirm_password: confirmPassword,
        ...(photoB64 ? { photo_b64: photoB64 } : {}),
      }),
    })
  }

  export async function logout() {
    return apiFetch('/api/auth/logout', { method: 'POST' })
  }

  // ── Teams ─────────────────────────────────────────────────────────────────────

  export async function getTeams() {
    return apiFetch('/api/teams')
  }

  export async function createTeam(name) {
    return apiFetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  }

  export async function getTeam(teamId) {
    return apiFetch(`/api/teams/${teamId}`)
  }

  export async function updateTeam(teamId, name) {
    return apiFetch(`/api/teams/${teamId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    })
  }

  export async function leaveTeam(teamId) {
    return apiFetch(`/api/teams/${teamId}/leave`, { method: 'POST' })
  }

  export async function getInviteLink(teamId) {
    return apiFetch(`/api/teams/${teamId}/invite`)
  }

  export async function joinTeam(inviteToken) {
    return apiFetch(`/api/teams/join/${inviteToken}`, { method: 'POST' })
  }

  export async function getMembers(teamId) {
    const data = await apiFetch(`/api/teams/${teamId}/members`)
    return data.members || []
  }

  export async function updateTeamMember(teamId, userId, payload) {
    return apiFetch(`/api/teams/${teamId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  export async function kickMember(teamId, userId) {
    return apiFetch(`/api/teams/${teamId}/members/${userId}`, { method: 'DELETE' })
  }

  // ── Topics ────────────────────────────────────────────────────────────────────

  export async function getTopics(teamId) {
    return apiFetch(`/api/teams/${teamId}/topics`)
  }

  export async function createTopic(teamId, name, color) {
    return apiFetch(`/api/teams/${teamId}/topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    })
  }

  export async function updateTopic(teamId, topicId, name, color) {
    return apiFetch(`/api/teams/${teamId}/topics/${topicId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, color }),
    })
  }

  export async function deleteTopic(teamId, topicId) {
    return apiFetch(`/api/teams/${teamId}/topics/${topicId}`, { method: 'DELETE' })
  }

  export async function getTeamPrompts(teamId) {
    return apiFetch(`/api/teams/${teamId}/prompts`)
  }

  export async function updateTeamPrompt(teamId, promptKey, promptText) {
    return apiFetch(`/api/teams/${teamId}/prompts/${promptKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_text: promptText }),
    })
  }

  export async function resetTeamPrompt(teamId, promptKey) {
    return apiFetch(`/api/teams/${teamId}/prompts/${promptKey}`, { method: 'DELETE' })
  }

  export async function addMeetingTopic(meetingId, topicId) {
    return apiFetch(`/api/meetings/${meetingId}/topics/${topicId}`, { method: 'POST' })
  }

  export async function removeMeetingTopic(meetingId, topicId) {
    return apiFetch(`/api/meetings/${meetingId}/topics/${topicId}`, { method: 'DELETE' })
  }

  // ── Meetings ──────────────────────────────────────────────────────────────────

  export async function startMeeting(platform, nativeId, teamId = null, passcode = '') {
    return apiFetch('/api/meetings/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        platform,
        native_id: nativeId,
        team_id: teamId,
        ...(passcode ? { passcode } : {}),
      }),
    })
  }

  export async function leaveMeeting(meetingId) {
    return apiFetch(`/api/meetings/${meetingId}/leave`, { method: 'POST' })
  }

  export async function getMeetings(teamId = null) {
    const query = teamId ? `?team_id=${teamId}` : ''
    const data = await apiFetch(`/api/meetings${query}`)
    return data.meetings || []
  }

  export async function getMeeting(meetingId) {
    return apiFetch(`/api/meetings/${meetingId}`)
  }

  export async function getTranscript(meetingId) {
    return apiFetch(`/api/meetings/${meetingId}/transcript`)
  }

  export async function explainMeeting(meetingId, mode, lastXMinutes = null) {
    const payload = { mode }
    if (lastXMinutes !== null) payload.last_x_minutes = lastXMinutes
    return apiFetch(`/api/meetings/${meetingId}/explain`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  export async function getActions(meetingId) {
    return apiFetch(`/api/meetings/${meetingId}/actions`)
  }

  export async function getAllActions(teamId = null) {
    const qs = teamId != null ? `?team_id=${teamId}` : ''
    return apiFetch(`/api/actions${qs}`)
  }

  export async function createAction(meetingId, actionType, content, assigneeId = null, tags = null) {
    const body = { action_type: actionType, content }
    if (assigneeId !== null) body.assignee_id = assigneeId
    if (tags !== null) body.tags = tags
    return apiFetch(`/api/meetings/${meetingId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  }

  export async function updateAction(meetingId, actionId, status, content, assigneeId, actionType, tags) {
    const payload = {}
    if (status !== undefined) payload.status = status
    if (content !== undefined) payload.content = content
    if (assigneeId !== undefined) payload.assignee_id = assigneeId
    if (actionType !== undefined) payload.action_type = actionType
    if (tags !== undefined) payload.tags = tags
    return apiFetch(`/api/meetings/${meetingId}/actions/${actionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  export async function deleteAction(meetingId, actionId) {
    return apiFetch(`/api/meetings/${meetingId}/actions/${actionId}`, {
      method: 'DELETE',
    })
  }

  export async function renameMeeting(meetingId, title) {
    return apiFetch(`/api/meetings/${meetingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
  }

  export async function deleteMeeting(meetingId) {
    return apiFetch(`/api/meetings/${meetingId}`, { method: 'DELETE' })
  }

  export async function getEmailPreview(meetingId) {
    return apiFetch(`/api/meetings/${meetingId}/email-preview`)
  }

  export async function sendMeetingEmail(meetingId, recipientIds) {
    return apiFetch(`/api/meetings/${meetingId}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_ids: recipientIds }),
    })
  }

  // ── WebSocket ─────────────────────────────────────────────────────────────────

  export function openInsightSocket(meetingId, { onChunk, onChunksSnapshot, onInsight, onProposal, onOpen, onClose } = {}) {
    const ws = new WebSocket(`${wsBase()}/api/ws/ingest/${meetingId}`)

    ws.onopen = () => onOpen?.()
    ws.onclose = () => onClose?.()
    ws.onerror = (e) => console.error('[WS] error', e)
    ws.onmessage = ({ data }) => {
      try {
        const msg = JSON.parse(data)
        const event = msg.event
        const msgData = msg.data
        if (event === 'transcript_snapshot') {
          onChunksSnapshot?.(msgData.chunks ?? [])
        } else if (event === 'transcript_chunk') {
          onChunk?.(msgData)
        } else if (event === 'insight') {
          onInsight?.({ role: msgData.role, text: msgData.text })
        } else if (event === 'proposal') {
          onProposal?.(msgData)
        }
      } catch (e) {
        console.warn('[WS] failed to parse message', e)
      }
    }

    return { close() { ws.close() } }
  }