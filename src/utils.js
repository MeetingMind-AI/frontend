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
    participants: [],
    reviewed: m.status === 'completed',
    actionItemCount: sm?.to_do?.length ?? 0,
    parkingLotCount: sm?.parking_lot?.length ?? 0,
    summary: sm?.summary ?? (m.status !== 'completed' ? 'Meeting in progress...' : 'No summary available.'),
    tags: [],
  }
}

const itemLabel = (t) =>
  typeof t === 'string' ? t : `${t.task ?? ''}${t.owner ? ` (${t.owner})` : ''}`

// Build GlobalKanban task entries from all meetings
export function buildKanbanTasks(meetings) {
  const items = []
  for (const m of meetings) {
    const sm = parseScrumMaster(m.summary?.scrum_master)
    if (!sm?.to_do?.length) continue
    const title = formatMeetingTitle(m.title)
    const date = formatDate(m.created_at)
    sm.to_do.forEach((t, i) =>
      items.push({ id: `${m.id}-todo-${i}`, title: itemLabel(t), meeting: title, meetingDate: date, type: 'todo', kanban_status: 'todo' })
    )
  }
  return items
}

// Build GlobalParkingLot entries from all meetings
export function buildParkingLotItems(meetings) {
  const items = []
  for (const m of meetings) {
    const sm = parseScrumMaster(m.summary?.scrum_master)
    if (!sm?.parking_lot?.length) continue
    const title = formatMeetingTitle(m.title)
    const date = formatDate(m.created_at)
    sm.parking_lot.forEach((t, i) =>
      items.push({ id: `${m.id}-park-${i}`, text: typeof t === 'string' ? t : (t.task ?? String(t)), meeting: title, date, status: 'open' })
    )
  }
  return items
}

// Build GlobalSchedule entries from all meetings
export function buildScheduleItems(meetings) {
  const items = []
  for (const m of meetings) {
    const sm = parseScrumMaster(m.summary?.scrum_master)
    if (!sm?.pending_to_schedule?.length) continue
    const title = formatMeetingTitle(m.title)
    sm.pending_to_schedule.forEach((t, i) =>
      items.push({ id: `${m.id}-sched-${i}`, title: itemLabel(t), meeting: title, type: 'schedule', schedule_status: 'pending' })
    )
  }
  return items
}
