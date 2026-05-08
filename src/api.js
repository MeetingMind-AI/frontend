const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function startMeeting(platform, nativeId) {
  const res = await fetch(`${BASE}/api/meetings/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform, native_id: nativeId }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `HTTP ${res.status}`)
  }
  return res.json() // { meeting_id: number }
}

export async function leaveMeeting(meetingId) {
  const res = await fetch(`${BASE}/api/meetings/${meetingId}/leave`, {
    method: 'POST',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

// Opens a persistent WebSocket to the backend ingest endpoint.
// Send transcript chunks with .send(speaker, text).
// Calls onInsight({ role, text }) for each non-IGNORE Ollama summary received.
// Returns { send, close }.
export function openInsightSocket(meetingId, { onInsight, onOpen, onClose } = {}) {
  const wsBase = BASE.replace(/^https/, 'wss').replace(/^http/, 'ws')
  const ws = new WebSocket(`${wsBase}/api/ws/ingest/${meetingId}`)

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
    } catch {}
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
