// HTTP requests use relative paths — Nginx proxies /api/* to the backend.
// VITE_API_URL is kept as an escape hatch for local dev without Docker.
const BASE = import.meta.env.VITE_API_URL ?? ''

// FastAPI validation errors return detail as an array of objects.
// Plain errors return detail as a string.
function extractError(body, status) {
  const { detail } = body
  if (!detail) return `HTTP ${status}`
  if (Array.isArray(detail)) {
    const msg = detail[0]?.msg ?? ''
    return msg.replace(/^value error,\s*/i, '')
  }
  return String(detail)
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
    const text = await res.text()
    console.log('[api] raw response text:', text)
    let body
    try { body = JSON.parse(text) } catch { body = {} }
    console.log('[api] parsed body:', body)
    console.log('[api] body.detail:', body.detail)
    console.log('[api] Array.isArray:', Array.isArray(body.detail))
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
