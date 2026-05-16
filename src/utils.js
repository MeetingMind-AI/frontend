// Parses the scrum_master field from Meeting.summary — Ollama stores it as
// a raw JSON string inside the JSONB column, so we need to unwrap it.
export function parseScrumMaster(raw) {
  if (!raw) return null
  let data = raw
  if (typeof data === 'string') {
    try { data = JSON.parse(data) } catch { return null }
  }
  return typeof data === 'object' ? data : null
}

// Strip the platform prefix from the DB title ("google_meet:abc-defg-hij" -> "abc-defg-hij")
export function formatMeetingTitle(title) {
  if (!title) return 'Unknown Meeting'
  return title.includes(':') ? title.split(':').slice(1).join(':') : title
}

export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

// Map a raw meeting object from GET /api/meetings into the shape Dashboard cards expect
export function meetingToCard(m) {
  const sm = parseScrumMaster(m.summary?.scrum_master)
  return {
    id: m.id,
    title: formatMeetingTitle(m.title),
    date: formatDate(m.created_at),
    duration: m.status,
    reviewed: m.status === 'completed',
    actionItemCount: sm?.to_do?.length ?? 0,
    parkingLotCount: sm?.parking_lot?.length ?? 0,
    summary: sm?.summary ?? (m.status !== 'completed' ? 'Meeting in progress...' : 'No summary available.'),
    tags: [],
  }
}

const itemLabel = (t) =>
  typeof t === 'string' ? t : `${t.task ?? ''}${t.owner ? ` (${t.owner})` : ''}`

// Build GlobalKanban task entries from all actions
export function buildKanbanTasks(actions) {
  const items = []
  for (const p of (actions.to_do?.accepted ?? [])) {
    items.push({
      id: p.id,
      title: p.content,
      meeting: formatMeetingTitle(p.meeting_title),
      meetingDate: formatDate(p.meeting_date),
      type: 'todo',
      kanban_status: 'todo',
    })
  }
  return items
}

// Build GlobalParkingLot entries from all actions
export function buildParkingLotItems(actions) {
  const items = []
  for (const p of (actions.parking_lot?.accepted ?? [])) {
    items.push({
      id: p.id,
      text: p.content,
      meeting: formatMeetingTitle(p.meeting_title),
      date: formatDate(p.meeting_date),
      status: 'open',
    })
  }
  return items
}

// Build GlobalSchedule entries from all actions
export function buildScheduleItems(actions) {
  const items = []
  for (const p of (actions.to_schedule?.accepted ?? [])) {
    items.push({
      id: p.id,
      meeting_id: p.meeting_id,
      title: p.content,
      meeting: formatMeetingTitle(p.meeting_title),
      type: 'schedule',
      schedule_status: p.scheduled_date ? 'scheduled' : 'pending',
      scheduledDate: p.scheduled_date || null,
    })
  }
  return items
}
