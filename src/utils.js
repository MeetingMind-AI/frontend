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
 * Kanban column assignment is encoded directly in the action item's `content` string
 * using bracket prefixes written by the backend when a card is moved between columns:
 *   - No prefix or '[TODO] '  → 'todo'  column (default / backlog)
 *   - '[DOING] '              → 'doing' column (in progress)
 *   - '[DONE] '               → 'done'  column (completed)
 * The prefix is stripped before the title is displayed so users only see clean text.
 *
 * @param {Object} actions - Aggregated action items from API endpoint.
 * @returns {Array<Object>} List of formatted task objects for Kanban columns.
 */
export function buildKanbanTasks(actions) {
  const items = []
  for (const p of (actions.to_do?.accepted ?? [])) {
    let col = 'todo'
    let title = p.content
    // Parse the embedded column prefix to determine the current Kanban lane.
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
 * Parking lot items are discussion points or decisions that were raised during a
 * meeting but deliberately deferred — they are "parked" for a future session rather
 * than actioned immediately.  Only 'accepted' (human-approved) items are shown here;
 * pending (AI-suggested) items remain in the meeting's action review pane until confirmed.
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
 * To-schedule items are follow-up meetings, demos, or calls that were agreed upon
 * during a meeting but need a calendar slot assigned.  They differ from to-do items
 * in that they require a time commitment from attendees rather than individual task work.
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

/**
 * Transforms categorized meeting action items into a flattened task list for review and display.
 * Maps both pending (AI-suggested) and accepted (user-approved) items across all action
 * buckets (to-do, parking lot, scheduling follow-ups, and blockers).
 * Handles schema variations where blockers may be keyed under 'blocker' or 'blockers'.
 *
 * @param {Object} actions - Aggregated action categories returned by GET /api/meetings/:id/actions.
 * @param {Object} [actions.to_do] - Action items categorized as to-dos.
 * @param {Object} [actions.parking_lot] - Action items categorized as parking lot topics.
 * @param {Object} [actions.to_schedule] - Action items categorized as follow-ups to schedule.
 * @param {Object} [actions.blocker] - Blocker items (singular key variant).
 * @param {Object} [actions.blockers] - Blocker items (plural key variant).
 * @returns {Array<Object>} Normalized task items with status ('suggested' | 'approved') and metadata.
 */
export function buildTaskItems(actions) {
  const items = []
  // Pair each action list with its domain type and approval status mapping:
  // - pending  -> 'suggested' (requires human confirmation)
  // - accepted -> 'approved'  (confirmed by scrum master / host)
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

/**
 * Builds a flat list of archived items across all action categories for the Global Archive view.
 * Collects items marked as archived from to-do, parking lot, schedule, and blocker buckets,
 * preserving meeting associations and tags to enable restoration.
 *
 * @param {Object} actions - Action categories payload containing archived sublists.
 * @returns {Array<Object>} Formatted archive card objects ready for display and restoration.
 */
export function buildArchiveItems(actions) {
  const items = []
  // Aggregate archived items across all domain action categories
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

/**
 * Evaluates whether a notification type is active for a team member based on user preferences and role defaults.
 *
 * Evaluation Precedence:
 * 1. Explicit negative override: If preferences contain `${canonicalKey}:off`, notification is suppressed.
 * 2. Explicit positive match: If preferences contain `canonicalKey`, notification is enabled.
 * 3. Positive allowlist mode: If preferences contain ANY positive `type:*` tokens, preferences operate as an
 *    exclusive allowlist. Any notification type not explicitly listed is suppressed.
 * 4. Blocklist mode: If preferences contain only `:off` tokens, any unsuppressed type is considered active.
 * 5. Role fallback defaults: When no preferences are specified, fallback rules apply:
 *    - 'scrum_master' / 'admin': all notifications active.
 *    - 'product_manager': 'type:insight' and 'type:to_do' active.
 *    - 'team_member' / 'member': 'type:to_do' active (developer focus).
 *
 * @param {string[]|null|undefined} prefs - Array of preference tokens (e.g. ['type:insight', 'type:to_do:off']).
 * @param {string} typeKey - Target notification type identifier (e.g. 'insight' or 'type:insight').
 * @param {string} [role='team_member'] - Team member role used when preferences are unspecified.
 * @returns {boolean} True if the notification type should trigger alerts/toasts for this user.
 */
export function isNotificationTypeActive(prefs, typeKey, role = 'team_member') {
  const pList = Array.isArray(prefs) ? prefs : []
  // Normalize typeKey to ensure it starts with 'type:' (e.g. 'insight' -> 'type:insight')
  const canonicalKey = typeKey.startsWith('type:') ? typeKey : `type:${typeKey}`

  // 1. Explicitly turned off with :off (highest priority override)
  if (pList.includes(`${canonicalKey}:off`)) return false

  // 2. Explicitly turned on in user preferences
  if (pList.includes(canonicalKey)) return true

  // 3. Positive allowlist mode:
  // If the user specified one or more positive type: entries, treat their preference list
  // as an explicit allowlist. Any type not explicitly present in the allowlist is disabled.
  const positiveTypes = pList.filter(
    (p) => typeof p === 'string' && p.startsWith('type:') && !p.endsWith(':off')
  )
  if (positiveTypes.length > 0) {
    return false // Not in positive allowlist
  }

  // 4. Blocklist mode:
  // If preferences contain only :off suppression tokens and no positive types,
  // anything that was NOT explicitly marked with :off is considered active by default.
  const hasOffEntries = pList.some(
    (p) => typeof p === 'string' && p.startsWith('type:') && p.endsWith(':off')
  )
  if (hasOffEntries) {
    return true
  }

  // 5. Role fallback defaults:
  // Normalize role aliases ('admin' maps to 'scrum_master', 'member' to 'team_member')
  const normRole = role === 'admin' ? 'scrum_master' : role === 'member' ? 'team_member' : (role || 'team_member')
  if (normRole === 'scrum_master') return true
  if (normRole === 'product_manager') return ['type:insight', 'type:to_do'].includes(canonicalKey)
  if (normRole === 'team_member') return canonicalKey === 'type:to_do'
  return true
}

/**
 * Detects whether the current browser supports the W3C Document Picture-in-Picture API,
 * identifying unsupported browsers (such as Safari, Firefox, or insecure contexts)
 * and providing a user-friendly error message recommending Chrome or Edge.
 *
 * @returns {{ isSupported: boolean, isSafari: boolean, isFirefox: boolean, browserName: string, message: string|null }}
 */
export function getBrowserPipSupport() {
  const isSupported = typeof window !== 'undefined' && 'documentPictureInPicture' in window
  if (isSupported) {
    return { isSupported: true, isSafari: false, isFirefox: false, browserName: 'Supported Browser', message: null }
  }

  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''
  const isSafari = Boolean(
    /^((?!chrome|android).)*safari/i.test(ua) ||
    (typeof navigator !== 'undefined' && navigator.vendor && navigator.vendor.includes('Apple'))
  )
  const isFirefox = Boolean(/firefox|fxios/i.test(ua))
  const isChrome = Boolean(/chrome|crios/i.test(ua) && !/edg/i.test(ua))
  const isEdge = Boolean(/edg/i.test(ua))

  let browserName = 'your current browser'
  let message = 'Document Picture-in-Picture is not supported in your browser. Please change your browser to Google Chrome or Microsoft Edge (version 116+) to use the floating overlay.'

  if (isSafari) {
    browserName = 'Safari'
    message = 'Document Picture-in-Picture is not supported in Safari. Please change your browser to Google Chrome or Microsoft Edge to get the floating PiP document.'
  } else if (isFirefox) {
    browserName = 'Firefox'
    message = 'Document Picture-in-Picture is not supported in Firefox. Please change your browser to Google Chrome or Microsoft Edge to get the floating PiP document.'
  } else if (typeof window !== 'undefined' && !window.isSecureContext) {
    browserName = isChrome ? 'Chrome (Insecure)' : isEdge ? 'Edge (Insecure)' : 'Insecure Context'
    message = 'Document Picture-in-Picture requires a secure HTTPS connection. Please access this site via HTTPS or switch to Google Chrome/Edge.'
  }

  return { isSupported: false, isSafari, isFirefox, isChrome, isEdge, browserName, message }
}
