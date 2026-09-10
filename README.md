# MeetingMind AI Frontend (UI Zone)

This directory contains the React + Vite frontend for the MeetingMind AI application.

It provides the user interface for:
- Managing teams, members, and custom meeting topic taxonomies
- Dispatching AI meeting bots to Google Meet and Microsoft Teams sessions
- Viewing live real-time speech transcription and instant multi-agent AI insights
- Reviewing AI-generated meeting summaries, cross-functional debate records, and action items
- Managing team workflows via cross-meeting Kanban boards, Parking Lot, Schedule, and Global Archive

---

## Documentation Links

Detailed architecture and backend documentation are centralized in the root `docs/` folder:
- **[Frontend Architecture Guide](../docs/architecture/frontend.md)**
- **[Monorepo Overview & Setup](../docs/README.md)**

---

## Application Routes & Pages

| Route | Page Component | Access | Description |
|---|---|---|---|
| `/login` | `Login.jsx` | Public | User authentication and new account registration with avatar upload. |
| `/teams` | `Teams.jsx` | Protected | Team picker interface: list active teams, join teams, or create new teams. |
| `/join/:inviteToken` | `JoinTeam.jsx` | Protected | Invite link entry point allowing users to join a team directly. |
| `/teams/:teamId` | `Dashboard.jsx` | Protected | Team dashboard: meeting statistics, search, bot dispatch, meeting cards with topic tags. |
| `/teams/:teamId/kanban` | `GlobalKanban.jsx` | Protected | Agile Kanban board aggregating accepted action items across all team meetings into `To Do`, `In Progress`, and `Done` columns with assignee assignment and manual task insertion. |
| `/teams/:teamId/parking-lot` | `GlobalParkingLot.jsx` | Protected | Cross-meeting parking lot view for open discussion items, with one-click "Promote to Task" migration onto the Kanban board. |
| `/teams/:teamId/schedule` | `GlobalSchedule.jsx` | Protected | Follow-up tracking view for deferred items pending a calendar date, equipped with inline date pickers. |
| `/teams/:teamId/archive` | `GlobalArchive.jsx` | Protected | Central repository of archived action items and tasks, allowing topic filtering and one-click item restoration. |
| `/teams/:teamId/settings` | `Settings.jsx` | Protected | Comprehensive team configuration with dedicated tabbed views: **General** (rename), **Members** (roles & per-type notification preferences), **Topics** (color-coded meeting taxonomy), **AI Prompts** (owner-editable system prompts for all LLM stages), **Invite Link** (token generation), and **Leave Team**. |
| `/teams/:teamId/live/:meetingId` | `Live.jsx` | Protected | Active meeting monitor featuring real-time Whisper transcript updates, multi-agent thought streams, interactive proposal alerts, Instant Clarity explainer modals, and Document Picture-in-Picture. |
| `/teams/:teamId/review/:meetingId?` | `Review.jsx` | Protected | Post-meeting review workspace containing tabbed AI synthesis (General, Technical, Business), live thinking progress indicators, inline transcript editing with original text preservation and reversion, action item moderation, and sandboxed HTML email previews with multi-recipient dispatch. |
| `/popup` | `MiniPopup.jsx` | Protected | Detached browser popup fallback for the live companion mini-window when the W3C Document Picture-in-Picture API is unsupported. |

---

## Shared Components (`src/components`)

| Component | File Path | Purpose & Capabilities |
|---|---|---|
| `LiveThinkingPanel` | `src/components/LiveThinkingPanel.jsx` | Real-time reasoning feed that displays streaming thoughts from AI personas (Scrum Master, Tech Lead, Product Manager, System) during active meetings. Supports pulse indicators, role color coding, and auto-scrolling to latest turns. |
| `ThinkingProcess` | `src/components/ThinkingProcess.jsx` | Structured multi-agent deliberation viewer that illustrates reasoning stages (Initial Analysis, Cross-functional Discussion, Final Synthesis) with expandable thought traces and markdown formatting. |
| `SummaryProgressIndicator` | `src/components/SummaryProgressIndicator.jsx` | Visual progress card rendered while post-meeting multi-agent LLM analysis is executing. Displays elapsed generation time, animated progress bars, live thinking traces, and an explicit `onStop` cancellation trigger. |
| `SystemStatusTracker` | `src/components/SystemStatusTracker.jsx` | Global infrastructure and hardware diagnostics badge + modal. Displays Ollama runtime mode (Host Native Metal/CUDA vs Docker GPU vs Docker CPU), model VRAM vs RAM allocation, ping latency for Postgres, Redis, Qdrant, and Whisper STT, with tab-visibility-throttled polling (every 30s). |
| `MeetingTopicTags` | `src/components/MeetingTopicTags.jsx` | Reusable topic badge cluster supporting chip rendering, hover remove actions (`×`), and an attached `+ Tag` dropdown with customizable drop-up or drop-down placement. |
| `TeamSetupModal` | `src/components/TeamSetupModal.jsx` | Interactive modal allowing users to create teams and configure initial team details. |
| `UserSetupModal` | `src/components/UserSetupModal.jsx` | Modal dialog allowing users to manage their user profile name and profile picture. |

---

## API Client SDK (`src/api.js`)

All communication between the frontend React application and backend services flows through the centralized API module in `src/api.js`. It wraps `fetch` with standard credentials, error unwrap logic, and WebSocket streaming.

### 1. Authentication (`/api/auth`)
- `getMe()`: Fetches the currently authenticated user profile from the session cookie.
- `updateMe({ name, photoB64 })`: Updates user display name and profile image base64.
- `login(email, password)`: Authenticates user credentials and establishes `mm_session` cookie.
- `signup(email, name, password, confirmPassword, photoB64)`: Registers a new user account.
- `logout()`: Terminates the session cookie.

### 2. Teams & Members (`/api/teams`)
- `getTeams()`: Retrieves all teams the authenticated user belongs to.
- `createTeam(name)`: Creates a new team workspace.
- `getTeam(teamId)`: Fetches team details by ID.
- `updateTeam(teamId, name)`: Renames a team workspace.
- `leaveTeam(teamId)`: Removes the authenticated user from the team.
- `getInviteLink(teamId)`: Generates a sharable invitation token.
- `joinTeam(inviteToken)`: Joins a team using a valid invitation token.
- `getMembers(teamId)`: Lists all members belonging to a team.
- `updateTeamMember(teamId, userId, payload)`: Updates member role (`scrum_master`, `product_manager`, `team_member`) and notification preferences.
- `kickMember(teamId, userId)`: Removes a member from the team (owner/admin only).

### 3. Topics & Prompts (`/api/teams/:id/topics` & `/prompts`)
- `getTopics(teamId)`: Lists all color-coded topic tags created for a team.
- `createTopic(teamId, name, color)`: Creates a new team topic tag.
- `updateTopic(teamId, topicId, name, color)`: Updates topic name and hex color.
- `deleteTopic(teamId, topicId)`: Deletes a topic tag.
- `getTeamPrompts(teamId)`: Fetches customizable system prompt templates for all AI agents.
- `updateTeamPrompt(teamId, promptKey, promptText)`: Updates an agent system prompt override.
- `resetTeamPrompt(teamId, promptKey)`: Resets an agent prompt to default system configuration.
- `addMeetingTopic(meetingId, topicId)`: Associates a topic tag with a meeting record.
- `removeMeetingTopic(meetingId, topicId)`: Disassociates a topic tag from a meeting.

### 4. Meetings & Transcripts (`/api/meetings`)
- `startMeeting(platform, nativeId, teamId, passcode, meetingType)`: Dispatches the headless browser bot to join Google Meet or Microsoft Teams.
- `leaveMeeting(meetingId)`: Requests the bot to disconnect from the active call.
- `getMeetings(teamId)`: Lists all recorded meetings for a team.
- `getMeeting(meetingId)`: Retrieves full meeting record, status, and summary payload.
- `renameMeeting(meetingId, title)`: Updates meeting display title.
- `deleteMeeting(meetingId)`: Permanently deletes a meeting record and associated transcript chunks.
- `getTranscript(meetingId)`: Fetches all transcribed speech chunks with speaker labels and timestamps.
- `createTranscriptChunk(meetingId, { speaker, text, timestamp })`: Manually adds an utterance chunk.
- `updateTranscriptChunk(meetingId, chunkId, { speaker, text })`: Updates an utterance chunk, preserving the original text in the database.
- `revertTranscriptChunk(meetingId, chunkId)`: Restores an edited utterance back to its original Whisper STT text.
- `deleteTranscriptChunk(meetingId, chunkId)`: Deletes a transcript chunk.
- `explainMeeting(meetingId, mode, lastXMinutes)`: Generates an Instant Clarity on-demand explanation (`technical` or `business`).

### 5. Multi-Agent Summaries & Thoughts
- `redoSummary(meetingId)`: Triggers background re-analysis and multi-agent synthesis over the full transcript.
- `stopSummary(meetingId)`: Cancels in-progress LLM summarization.
- `getSummaryThoughts(meetingId)`: Fetches historical thought traces generated during the summary process.

### 6. Actions, Kanban, & Archive (`/api/meetings/:id/actions` & `/api/actions`)
- `getActions(meetingId)`: Retrieves categorized proposals for a specific meeting (`to_do`, `parking_lot`, `to_schedule`, `blocker`).
- `getAllActions(teamId)`: Aggregates actions across all team meetings for Global Kanban, Parking Lot, Schedule, and Archive views.
- `createAction(meetingId, actionType, content, assigneeId, tags, status)`: Creates a new action item manually.
- `updateAction(meetingId, actionId, status, content, assigneeId, actionType, tags)`: Updates status (`accepted`, `pending`, `rejected`, `archived`), text, or assignee.
- `deleteAction(meetingId, actionId)`: Deletes an action item.

### 7. Email Reports (`/api/meetings/:id/email-preview` & `/send-email`)
- `getEmailPreview(meetingId)`: Retrieves compiled HTML email digest.
- `sendMeetingEmail(meetingId, recipientIds)`: Sends the HTML email digest to selected team members.

### 8. Real-time WebSocket Ingest (`/api/ws/ingest/:id`)
- `openInsightSocket(meetingId, callbacks)`: Opens a WebSocket connection streaming real-time events:
  - `transcript_snapshot`: Hydrates past speaker turns on initial connection.
  - `transcript_chunk`: Receives incoming speaker utterances with interim speech stitching.
  - `insight`: Streams live observations from the Scrum Master agent.
  - `proposal`: Streams real-time action proposals detected during the meeting.
  - `agent_thought`: Streams agent deliberation traces.

### 9. System Diagnostics (`/api/system/status`)
- `getSystemStatus()`: Retrieves health, latency, and hardware acceleration status for Ollama and platform dependencies.

---

## Running Locally

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Create a `.env` file in `frontend/` pointing to the backend API:
```env
VITE_API_URL=http://localhost:8000
```

When running under Docker Compose, Nginx serves the production build on port 3000 and proxies `/api/*` requests directly to the backend service.

---

## CI/CD

Deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`). Pushes to the `main` branch trigger a workflow that SSHs into the production server, pulls the latest code, rebuilds the frontend container, and restarts it automatically.
