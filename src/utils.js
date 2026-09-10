/**
 * @file utils.js
 * @description Data transformation and formatting utilities for MeetingMind-AI frontend cards, Kanban items, and meeting metadata.
 */

/**
 * Parses the scrum_master field from Meeting.summary.
 * Ollama stores summary data as a raw JSON string inside the JSONB column, requiring unwrapping.
 *
 * @param {string|Object} raw - Raw scrum_master payload from database.
 * @returns {Object|null} Parsed object if valid, or null.
 */
export function parseScrumMaster(raw) {
  if (!raw) return null
  let data = raw
  if (typeof data === 'string') {
    try {
      let clean = data.trim()
      if (clean.startsWith('```')) {
        clean = clean.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '').trim()
      }
      data = JSON.parse(clean)
    } catch { return null }
  }
  return typeof data === 'object' ? data : null
}

/**
 * Strips the platform prefix from DB meeting title ("google_meet:abc-defg-hij" -> "abc-defg-hij").
 *
 * @param {string} title - Raw meeting title string with optional platform prefix.
 * @returns {string} Formatted clean title string.
 */
export function formatMeetingTitle(title) {
  if (!title) return 'Unknown Meeting'
  return title.includes(':') ? title.split(':').slice(1).join(':') : title
}

/**
 * Formats ISO timestamp into short date representation (e.g. "Jul 28, 2026").
 *
 * @param {string} iso - ISO date string.
 * @returns {string} Formatted locale date string.
 */
export function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Maps a raw meeting object from GET /api/meetings into the data shape expected by Dashboard cards.
 *
 * @param {Object} m - Raw meeting record from API backend.
 * @returns {Object} Structured card object for Dashboard display.
 */
export function meetingToCard(m) {
  const sm = parseScrumMaster(m.summary?.scrum_master)
  let durationDisplay = m.status
  if (m.status === 'needs_human_help') durationDisplay = 'Blocked (Lobby)'
  const isSummarizing = Boolean(
    m.is_summarizing ||
    m.status === 'processing'
  )
  return {
    id: m.id,
    title: formatMeetingTitle(m.title),
    date: formatDate(m.created_at),
    duration: durationDisplay,
    reviewed: m.status === 'completed' && !isSummarizing,
    isSummarizing,
    meeting_type: m.meeting_type === 'sprint' ? 'sprint_planning' : (m.meeting_type || 'general'),
    actionItemCount: sm?.to_do?.length ?? 0,
    parkingLotCount: sm?.parking_lot?.length ?? 0,
    summary: isSummarizing
      ? 'Generating AI summary...'
      : sm?.summary ?? (m.status !== 'completed' ? 'Meeting in progress...' : 'No summary available.'),
    topics: m.topics ?? [],
    speakers: m.speakers ?? [],
  }
}

/**
 * Helper to build display string for action items.
 *
 * @param {string|Object} t - Task string or task object.
 * @returns {string} Text label.
 */
const itemLabel = (t) =>
  typeof t === 'string' ? t : `${t.task ?? ''}${t.owner ? ` (${t.owner})` : ''}`

/**
 * Builds GlobalKanban task entries from aggregated team action items.
 *
 * @param {Object} actions - Aggregated action items from API endpoint.
 * @returns {Array<Object>} List of formatted task objects for Kanban columns.
 */
export function buildKanbanTasks(actions) {
  const items = []
  for (const p of (actions.to_do?.accepted ?? [])) {
    let col = 'todo'
    let title = p.content
    if (title.startsWith('[DOING] ')) {
      col = 'doing'
      title = title.substring(8)
    } else if (title.startsWith('[DONE] ')) {
      col = 'done'
      title = title.substring(7)
    } else if (title.startsWith('[TODO] ')) {
      title = title.substring(7)
    }

    items.push({
      id: p.id,
      meetingId: p.meeting_id,
      title: title,
      rawContent: p.content,
      meeting: formatMeetingTitle(p.meeting_title),
      meetingDate: formatDate(p.meeting_date),
      type: 'todo',
      kanban_status: col,
      assignee: p.assignee,
      status: p.status,
      tags: p.tags || [],
      topics: p.topics || [],
    })
  }
  return items
}

/**
 * Builds GlobalParkingLot entries from aggregated team action items.
 *
 * @param {Object} actions - Aggregated action items from API endpoint.
 * @returns {Array<Object>} List of formatted parking lot item objects.
 */
export function buildParkingLotItems(actions) {
  const items = []
  for (const p of (actions.parking_lot?.accepted ?? [])) {
    items.push({
      id: p.id,
      meetingId: p.meeting_id,
      text: p.content,
      meeting: formatMeetingTitle(p.meeting_title),
      date: formatDate(p.meeting_date),
      status: 'open',
      assignee: p.assignee,
      tags: p.tags || [],
      topics: p.topics || [],
    })
  }
  return items
}

/**
 * Builds GlobalSchedule entries from aggregated team action items.
 *
 * @param {Object} actions - Aggregated action items from API endpoint.
 * @returns {Array<Object>} List of formatted schedule item objects.
 */
export function buildScheduleItems(actions) {
  const items = []
  for (const p of (actions.to_schedule?.accepted ?? [])) {
    items.push({
      id: p.id,
      meetingId: p.meeting_id,
      title: p.content,
      meeting: formatMeetingTitle(p.meeting_title),
      type: 'schedule',
      schedule_status: 'pending',
      assignee: p.assignee,
      tags: p.tags || [],
      topics: p.topics || [],
    })
  }
  return items
}

export function buildTaskItems(actions) {
  const items = []
  const sources = [
    { list: actions.to_do?.pending ?? [], type: 'todo', status: 'suggested' },
    { list: actions.to_do?.accepted ?? [], type: 'todo', status: 'approved' },
    { list: actions.parking_lot?.pending ?? [], type: 'parking', status: 'suggested' },
    { list: actions.parking_lot?.accepted ?? [], type: 'parking', status: 'approved' },
    { list: actions.to_schedule?.pending ?? [], type: 'schedule', status: 'suggested' },
    { list: actions.to_schedule?.accepted ?? [], type: 'schedule', status: 'approved' },
    { list: actions.blocker?.pending ?? actions.blockers?.pending ?? [], type: 'blocker', status: 'suggested' },
    { list: actions.blocker?.accepted ?? actions.blockers?.accepted ?? [], type: 'blocker', status: 'approved' },
  ]
  for (const { list, type, status } of sources) {
    for (const p of list) {
      items.push({
        id: p.id,
        meetingId: p.meeting_id,
        title: p.content,
        meeting: formatMeetingTitle(p.meeting_title),
        date: formatDate(p.meeting_date),
        action_type: type,
        status,
        assignee: p.assignee,
        tags: p.tags || [],
        topics: p.topics || [],
      })
    }
  }
  return items
}

export function buildArchiveItems(actions) {
  const items = []
  const sources = [
    { list: actions.to_do?.archived ?? [], type: 'todo' },
    { list: actions.parking_lot?.archived ?? [], type: 'parking_lot' },
    { list: actions.to_schedule?.archived ?? [], type: 'schedule' },
    { list: actions.blocker?.archived ?? actions.blockers?.archived ?? [], type: 'blocker' },
  ]
  for (const { list, type } of sources) {
    for (const p of list) {
      items.push({
        id: p.id,
        meetingId: p.meeting_id,
        title: p.content,
        meeting: formatMeetingTitle(p.meeting_title),
        date: formatDate(p.meeting_date),
        action_type: type,
        assignee: p.assignee,
        tags: p.tags || [],
        topics: p.topics || [],
      })
    }
  }
  return items
}

export function isNotificationTypeActive(prefs, typeKey, role = 'team_member') {
  const pList = Array.isArray(prefs) ? prefs : []
  // Normalize typeKey to ensure it starts with 'type:'
  const canonicalKey = typeKey.startsWith('type:') ? typeKey : `type:${typeKey}`

  // 1. Explicitly turned off with :off
  if (pList.includes(`${canonicalKey}:off`)) return false
  // 2. Explicitly turned on
  if (pList.includes(canonicalKey)) return true

  // 3. If prefs has any positive type: entries, treat it as an allowlist
  const positiveTypes = pList.filter(
    (p) => typeof p === 'string' && p.startsWith('type:') && !p.endsWith(':off')
  )
  if (positiveTypes.length > 0) {
    return false // Not in positive allowlist
  }

  // 4. If prefs has :off entries, anything not marked :off is active
  const hasOffEntries = pList.some(
    (p) => typeof p === 'string' && p.startsWith('type:') && p.endsWith(':off')
  )
  if (hasOffEntries) {
    return true
  }

  // 5. Fallback to role defaults
  const normRole = role === 'admin' ? 'scrum_master' : role === 'member' ? 'team_member' : (role || 'team_member')
  if (normRole === 'scrum_master') return true
  if (normRole === 'product_manager') return ['type:insight', 'type:to_do'].includes(canonicalKey)
  if (normRole === 'team_member') return canonicalKey === 'type:to_do'
  return true
}
