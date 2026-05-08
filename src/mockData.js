export const mockTranscript = [
  {
    id: 1,
    speaker: 'Alice Chen',
    role: 'Scrum Master',
    text: "Good morning everyone. Let's kick off Sprint 14 planning. We have 8 story points carried over from last sprint that we need to account for.",
    timestamp: '09:01:04',
  },
  {
    id: 2,
    speaker: 'Bob Martinez',
    role: 'Backend Dev',
    text: "Yeah, the API refactor took longer than expected. We had some unexpected edge cases with the authentication flow — token refresh under concurrent requests.",
    timestamp: '09:01:32',
  },
  {
    id: 3,
    speaker: 'Carol Singh',
    role: 'PM',
    text: "From a business perspective, this delay is directly impacting our Q2 commitments. We need a concrete timeline before we leave this meeting.",
    timestamp: '09:02:15',
  },
  {
    id: 4,
    speaker: 'Alice Chen',
    role: 'Scrum Master',
    text: "Understood, Carol. Bob, can you give us a realistic estimate? What are we talking — workaround or full fix?",
    timestamp: '09:02:45',
  },
  {
    id: 5,
    speaker: 'Bob Martinez',
    role: 'Backend Dev',
    text: "There are two options. A workaround — adding retry logic and exponential backoff — that's about 2 days. The full solution, refactoring the token lifecycle, is closer to 2 weeks.",
    timestamp: '09:03:12',
  },
  {
    id: 6,
    speaker: 'David Kim',
    role: 'Frontend Dev',
    text: "I vote for the full solution. We've been shipping workarounds for 6 months. The technical debt is actively slowing down every feature we ship now.",
    timestamp: '09:03:48',
  },
  {
    id: 7,
    speaker: 'Carol Singh',
    role: 'PM',
    text: "David, I hear you, but the deadline is in 3 weeks. Two weeks on one unplanned item means everything else is at risk. That's not acceptable to the business.",
    timestamp: '09:04:20',
  },
  {
    id: 8,
    speaker: 'Bob Martinez',
    role: 'Backend Dev',
    text: "What if we parallelize it? I own the core auth refactor, David handles the edge case tests and integration. We could potentially cut the timeline to 10 days.",
    timestamp: '09:05:01',
  },
  {
    id: 9,
    speaker: 'Alice Chen',
    role: 'Scrum Master',
    text: "That's an interesting proposal. Let's park the parallelization discussion and come back to it — I want to get through story estimation first. Let's move to the dashboard feature.",
    timestamp: '09:05:33',
  },
  {
    id: 10,
    speaker: 'David Kim',
    role: 'Frontend Dev',
    text: "For the new analytics dashboard, I'm estimating 5 story points. The real-time WebSocket data sync alone adds significant complexity.",
    timestamp: '09:06:00',
  },
  {
    id: 11,
    speaker: 'Carol Singh',
    role: 'PM',
    text: "The dashboard is the single most-requested feature from our enterprise customers this quarter. Whatever we need to do to ship it, we do it.",
    timestamp: '09:06:45',
  },
  {
    id: 12,
    speaker: 'Bob Martinez',
    role: 'Backend Dev',
    text: "Hold on — the backend API for the dashboard is already done and deployed. The frontend work should be maybe 3 points, not 5.",
    timestamp: '09:07:12',
  },
  {
    id: 13,
    speaker: 'David Kim',
    role: 'Frontend Dev',
    text: "Bob, with respect, the backend being done doesn't make the frontend simpler. WebSocket client state management, reconnection logic, loading states — that's not 3 points.",
    timestamp: '09:07:55',
  },
  {
    id: 14,
    speaker: 'Carol Singh',
    role: 'PM',
    text: "Okay, we've been going back and forth on this for 4 minutes. Can we just vote? Planning poker, right now.",
    timestamp: '09:08:30',
  },
  {
    id: 15,
    speaker: 'Alice Chen',
    role: 'Scrum Master',
    text: "Agreed. Let's do it. Everyone show your estimate on three. One, two, three...",
    timestamp: '09:09:05',
  },
]

export const mockPreviousParkingLot = [
  'API rate limiting strategy — deferred from Sprint 13 planning, requires architectural decision on quota model',
  'Q3 on-call rotation update — was blocked on headcount confirmation from HR',
  'REST vs GraphQL migration decision — requires cross-team stakeholder alignment meeting',
]

export const mockAgentChats = {
  scrum_master: [
    {
      id: 1,
      role: 'agent',
      text: "I'm monitoring this session for process health, sprint velocity risks, and team dynamics. The 8-point carry-over from Sprint 13 is already flagged as a velocity concern.",
    },
    {
      id: 2,
      role: 'user',
      text: 'Are we at risk of not completing the sprint?',
    },
    {
      id: 3,
      role: 'agent',
      text: "Yes, there's a moderate-to-high risk. Here's my read:\n\n• 8pt carry-over eats into Sprint 14 capacity immediately\n• The API debate (workaround vs full fix) is unresolved and time is being lost in discussion\n• Estimation disagreement on the dashboard (3 vs 5pt) needs a forcing function — planning poker is the right call\n\nRecommendation: time-box the API decision to 5 minutes, force a team vote, and document the outcome as a parking lot item with an owner.",
    },
  ],
  pm: [
    {
      id: 1,
      role: 'agent',
      text: "I'm tracking business impact, stakeholder concerns, and delivery risks. Carol's Q2 commitment flag is already logged as a high-priority signal.",
    },
    {
      id: 2,
      role: 'user',
      text: 'What are the business risks from this sprint?',
    },
    {
      id: 3,
      role: 'agent',
      text: "Two critical business risks identified:\n\n1. Q2 Commitment Gap — If the API full fix takes 2 weeks, only 1 week remains for all other Q2 deliverables. This is a red flag that should be escalated to leadership before committing the team.\n\n2. Dashboard Slip Risk — The dashboard is the top enterprise-requested feature. Any delay directly impacts renewal conversations with at least 3 key accounts.\n\nSuggested action: Request a 30-min leadership sync before the sprint officially kicks off to align on the API trade-off.",
    },
  ],
  dev: [
    {
      id: 1,
      role: 'agent',
      text: "I'm analyzing technical feasibility, architecture trade-offs, and implementation complexity based on what's being discussed.",
    },
    {
      id: 2,
      role: 'user',
      text: 'Explain the API auth issue in simple terms',
    },
    {
      id: 3,
      role: 'agent',
      text: "The auth edge cases Bob described are almost certainly token refresh race conditions — a classic concurrency bug.\n\nWorkaround: Add retry logic + exponential backoff. Ships in 2 days, but you're treating the symptom not the cause. Future load will re-expose it.\n\nFull fix: Refactor the token lifecycle into a proper state machine with mutex locks on refresh. Solid, but ~2 weeks of focused work.\n\nBob's parallelization proposal is technically sound — the core auth flow and the edge case test suite are orthogonal concerns. With clear interface contracts defined upfront, 10 days is plausible. I'd recommend requiring a written interface doc before the parallel work starts.",
    },
  ],
}

export const mockPostMeetingTasks = [
  {
    id: 1,
    title: 'Decide on API refactor approach: workaround vs full solution',
    type: 'schedule',
    status: 'suggested',
  },
  {
    id: 2,
    title: 'Update Q3 on-call rotation schedule',
    type: 'todo',
    status: 'suggested',
  },
  {
    id: 3,
    title: 'Schedule stakeholder alignment: REST vs GraphQL migration',
    type: 'schedule',
    status: 'suggested',
  },
  {
    id: 4,
    title: 'Bob & David: Write interface contracts for parallel API work',
    type: 'todo',
    status: 'suggested',
  },
  {
    id: 5,
    title: 'Re-run planning poker for dashboard feature (team async vote)',
    type: 'todo',
    status: 'suggested',
  },
  {
    id: 6,
    title: 'Prepare Q2 commitment gap brief for leadership sync',
    type: 'todo',
    status: 'suggested',
  },
  {
    id: 7,
    title: 'API rate limiting strategy — carry forward to Sprint 15 planning',
    type: 'parking',
    status: 'suggested',
  },
  {
    id: 8,
    title: 'Evaluate WebSocket client libraries for dashboard real-time sync',
    type: 'todo',
    status: 'approved',
  },
  {
    id: 9,
    title: 'Document Sprint 13 retrospective findings',
    type: 'todo',
    status: 'approved',
  },
]

export const mockPreviousMeetings = [
  {
    id: 1,
    title: 'Sprint 14 Planning',
    date: 'May 5, 2026',
    duration: '47 min',
    participants: ['Alice Chen', 'Bob Martinez', 'Carol Singh', 'David Kim'],
    reviewed: false,
    actionItemCount: 9,
    parkingLotCount: 1,
    summary: 'Sprint carry-over discussion, dashboard estimation conflict, Q2 commitment risk raised and escalated.',
    tags: ['planning', 'sprint'],
  },
  {
    id: 2,
    title: 'Q2 Business Review',
    date: 'Apr 28, 2026',
    duration: '62 min',
    participants: ['Carol Singh', 'Eve Wilson', 'Frank Lee'],
    reviewed: true,
    actionItemCount: 5,
    parkingLotCount: 2,
    summary: 'Q2 progress against OKRs reviewed. Marketing pipeline at 78% target. Engineering at 65%.',
    tags: ['business', 'okr'],
  },
  {
    id: 3,
    title: 'Sprint 13 Retrospective',
    date: 'Apr 21, 2026',
    duration: '38 min',
    participants: ['Alice Chen', 'Bob Martinez', 'David Kim', 'Grace Park'],
    reviewed: true,
    actionItemCount: 7,
    parkingLotCount: 3,
    summary: 'Team velocity dropped 15% due to unplanned API work. Process improvements proposed for estimation.',
    tags: ['retrospective', 'sprint'],
  },
  {
    id: 4,
    title: 'Architecture Design Review',
    date: 'Apr 15, 2026',
    duration: '90 min',
    participants: ['Bob Martinez', 'David Kim', 'Henry Zhao', 'Carol Singh'],
    reviewed: true,
    actionItemCount: 12,
    parkingLotCount: 4,
    summary: 'Microservices migration plan reviewed. Database sharding strategy finalized for Q3 rollout.',
    tags: ['technical', 'architecture'],
  },
  {
    id: 5,
    title: 'Sprint 13 Planning',
    date: 'Apr 7, 2026',
    duration: '51 min',
    participants: ['Alice Chen', 'Bob Martinez', 'Carol Singh', 'David Kim'],
    reviewed: true,
    actionItemCount: 8,
    parkingLotCount: 0,
    summary: '35 story points committed. API refactor added to sprint mid-session following PM escalation.',
    tags: ['planning', 'sprint'],
  },
  {
    id: 6,
    title: 'Product Roadmap Sync',
    date: 'Mar 30, 2026',
    duration: '44 min',
    participants: ['Carol Singh', 'Eve Wilson', 'Alice Chen'],
    reviewed: true,
    actionItemCount: 4,
    parkingLotCount: 1,
    summary: 'H1 roadmap confirmed. Feature freeze set for May 15. Mobile features formally deferred to H2.',
    tags: ['roadmap', 'product'],
  },
]

// kanban_status: 'todo' | 'doing' | 'done'  (only for type='todo')
// schedule_status: 'pending' | 'scheduled'   (only for type='schedule')
export const mockAllKanbanTasks = [
  { id: 101, title: 'Decide on API refactor approach: workaround vs full solution', type: 'schedule', schedule_status: 'pending', meeting: 'Sprint 14 Planning', meetingDate: 'May 5, 2026' },
  { id: 102, title: 'Update Q3 on-call rotation schedule', type: 'todo', kanban_status: 'todo', meeting: 'Sprint 14 Planning', meetingDate: 'May 5, 2026' },
  { id: 103, title: 'Schedule stakeholder alignment: REST vs GraphQL migration', type: 'schedule', schedule_status: 'pending', meeting: 'Sprint 14 Planning', meetingDate: 'May 5, 2026' },
  { id: 104, title: 'Bob & David: Write interface contracts for parallel API work', type: 'todo', kanban_status: 'doing', meeting: 'Sprint 14 Planning', meetingDate: 'May 5, 2026' },
  { id: 105, title: 'Prepare Q2 commitment gap brief for leadership sync', type: 'todo', kanban_status: 'todo', meeting: 'Sprint 14 Planning', meetingDate: 'May 5, 2026' },
  { id: 201, title: 'Schedule weekly check-in: Engineering vs Marketing targets', type: 'schedule', schedule_status: 'scheduled', scheduledDate: 'May 13, 2026', meeting: 'Q2 Business Review', meetingDate: 'Apr 28, 2026' },
  { id: 202, title: 'Prepare mid-Q2 OKR progress report for board', type: 'todo', kanban_status: 'done', meeting: 'Q2 Business Review', meetingDate: 'Apr 28, 2026' },
  { id: 301, title: 'Document sprint velocity drop root cause analysis', type: 'todo', kanban_status: 'done', meeting: 'Sprint 13 Retrospective', meetingDate: 'Apr 21, 2026' },
  { id: 302, title: 'Update estimation process — add buffer for unknowns', type: 'todo', kanban_status: 'doing', meeting: 'Sprint 13 Retrospective', meetingDate: 'Apr 21, 2026' },
  { id: 401, title: 'Define database sharding implementation timeline', type: 'schedule', schedule_status: 'scheduled', scheduledDate: 'Apr 29, 2026', meeting: 'Architecture Design Review', meetingDate: 'Apr 15, 2026' },
  { id: 402, title: 'Draft microservices migration RFC for team review', type: 'todo', kanban_status: 'todo', meeting: 'Architecture Design Review', meetingDate: 'Apr 15, 2026' },
  { id: 501, title: 'Update H1 roadmap to reflect mobile deferral', type: 'todo', kanban_status: 'done', meeting: 'Product Roadmap Sync', meetingDate: 'Mar 30, 2026' },
]

export const mockAllParkingLotItems = [
  { id: 1, text: 'REST vs GraphQL migration decision — cross-team stakeholder alignment needed', meeting: 'Sprint 14 Planning', date: 'May 5, 2026', status: 'open' },
  { id: 2, text: 'Dashboard story point estimation disagreement (3pt vs 5pt) — needs async vote', meeting: 'Sprint 14 Planning', date: 'May 5, 2026', status: 'open' },
  { id: 3, text: 'Marketing attribution model revamp — blocked on data team availability', meeting: 'Q2 Business Review', date: 'Apr 28, 2026', status: 'open' },
  { id: 4, text: 'Engineering headcount plan for Q3 — waiting on finance sign-off', meeting: 'Q2 Business Review', date: 'Apr 28, 2026', status: 'resolved' },
  { id: 5, text: 'Sprint ceremony cadence change proposal — 2-week vs 3-week sprints', meeting: 'Sprint 13 Retrospective', date: 'Apr 21, 2026', status: 'open' },
  { id: 6, text: 'Code review SLA — define expected turnaround per PR size', meeting: 'Sprint 13 Retrospective', date: 'Apr 21, 2026', status: 'resolved' },
  { id: 7, text: 'Cross-team dependency on design system v3 — timeline unclear', meeting: 'Sprint 13 Retrospective', date: 'Apr 21, 2026', status: 'resolved' },
  { id: 8, text: 'Database sharding approach: horizontal vs vertical — needs PoC', meeting: 'Architecture Design Review', date: 'Apr 15, 2026', status: 'open' },
  { id: 9, text: 'Frontend framework upgrade (React 18 → 19) — breaking changes audit needed', meeting: 'Architecture Design Review', date: 'Apr 15, 2026', status: 'open' },
  { id: 10, text: 'API versioning strategy — no consensus reached', meeting: 'Architecture Design Review', date: 'Apr 15, 2026', status: 'resolved' },
  { id: 11, text: 'Third-party analytics vendor evaluation', meeting: 'Architecture Design Review', date: 'Apr 15, 2026', status: 'open' },
  { id: 12, text: 'Mobile feature reprioritization for H2 roadmap', meeting: 'Product Roadmap Sync', date: 'Mar 30, 2026', status: 'resolved' },
]

export const mockMeetingSummary = {
  title: 'Sprint 14 Planning',
  date: 'May 5, 2026',
  duration: '47 minutes',
  participants: ['Alice Chen — Scrum Master', 'Bob Martinez — Backend Dev', 'Carol Singh — PM', 'David Kim — Frontend Dev'],
  keyDecisions: [
    'API refactor decision deferred — parallelization proposal (Bob + David) to be evaluated async with a written interface contract.',
    'Dashboard feature estimation unresolved — team to complete async planning poker vote before sprint starts.',
    'Q2 commitment risk formally escalated — PM to schedule leadership sync within 24 hours.',
  ],
  unresolvedItems: [
    'API workaround (2 days) vs full solution (2 weeks) — owner: Bob & David',
    'Dashboard story point estimation: 3pt (Bob) vs 5pt (David) — needs vote',
  ],
  nextSteps:
    'Leadership sync required before Sprint 14 officially kicks off. Bob and David to submit parallelization plan with interface contracts by EOD today.',
}
