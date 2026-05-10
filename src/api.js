// HTTP requests use relative paths — Nginx proxies /api/* to the backend.
// VITE_API_URL is kept as an escape hatch for local dev without Docker.
const BASE = import.meta.env.VITE_API_URL ?? ''

// FastAPI validation errors return detail as an array of objects.
// The backend sometimes double-encodes the detail as a JSON string —
// unwrap it if so before extracting the human-readable message.
function extractError(body, status) {
  let detail = body.detail
  if (!detail) return `HTTP ${status}`

  // Unwrap double-encoded JSON string: detail = '{"detail":[...]}'
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

// Derive the WebSocket base from the current page origin so it also goes
// through Nginx (same host, same port, no CORS).
function wsBase() {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}`
}

export async function startMeeting(platform, nativeId) {
  const res = await fetch(`${BASE}/api/meetings/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, native_id: nativeId }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractError(body, res.status))
  }
  return res.json() // { meeting_id: number }
}

export async function leaveMeeting(meetingId) {
  const res = await fetch(`${BASE}/api/meetings/${meetingId}/leave`, {
    method: 'POST',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractError(body, res.status))
  }
  return res.json()
}

// Opens a persistent WebSocket to the backend ingest endpoint.
// Send transcript chunks with .send(speaker, text).
// Calls onInsight({ role, text }) for each non-IGNORE Ollama summary received.
// Returns { send, close }.
export async function getMeetings() {
  const res = await fetch(`${BASE}/api/meetings`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractError(body, res.status))
  }
  return res.json() // { meetings: [...] }
}

export async function getMeeting(meetingId) {
  const res = await fetch(`${BASE}/api/meetings/${meetingId}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractError(body, res.status))
  }
  return res.json() // { id, title, status, summary, created_at }
}

export async function getTranscript(meetingId) {
  const res = await fetch(`${BASE}/api/meetings/${meetingId}/transcript`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractError(body, res.status))
  }
  return res.json() // { meeting_id, status, chunks: [{id, speaker, text, timestamp}] }
}

export async function renameMeeting(meetingId, title) {
  const res = await fetch(`${BASE}/api/meetings/${meetingId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractError(body, res.status))
  }
  return res.json()
}

export async function deleteMeeting(meetingId) {
  const res = await fetch(`${BASE}/api/meetings/${meetingId}`, { method: 'DELETE' })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(extractError(body, res.status))
  }
  return res.json()
}

export function openInsightSocket(meetingId, { onInsight, onOpen, onClose } = {}) {
  const ws = new WebSocket(`${wsBase()}/api/ws/ingest/${meetingId}`)

  ws.onopen = () => onOpen?.()
  ws.onclose = () => onClose?.()
  ws.onerror = (e) => console.error('[WS] error', e)
  ws.onmessage = ({ data }) => {
    try {
      const msg = JSON.parse(data)
      const summary = msg.summary
      if (!summary) return
      // controller.summarize() returns dict[role -> text]
      if (typeof summary === 'object') {
        for (const [role, text] of Object.entries(summary)) {
          if (text && text.toUpperCase() !== 'IGNORE') onInsight?.({ role, text })
        }
      } else if (typeof summary === 'string' && summary.toUpperCase() !== 'IGNORE') {
        onInsight?.({ role: 'insight', text: summary })
      }
    } catch (e) {
      console.warn('[WS] failed to parse message', e)
    }
  }

  return {
    send(speaker, text) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ speaker, text }))
      }
    },
    close() { ws.close() },
  }
}
