# MeetingMind — Frontend

React + Vite frontend for MeetingMind AI. Served in production by Nginx inside Docker, with all `/api/*` requests proxied to the FastAPI backend.

---

## What it does

MeetingMind dispatches an AI bot into a Google Meet session. The bot transcribes the meeting in real time, and an Ollama-powered AI pipeline generates a structured report: action items, parking lot topics, and follow-ups to schedule. Everything is reviewable and editable in the app after the meeting ends.

---

## Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard — meeting list, stats, dispatch bot |
| `/live/:id` | Live meeting view — real-time transcript and AI insights |
| `/review/:id` | Post-meeting review — approve/edit AI suggestions, view transcript |
| `/kanban` | Workspace — cross-meeting task board (To-Do / Doing / Done) |
| `/parking-lot` | Parking Lot — deferred topics across all meetings |
| `/schedule` | To Schedule — follow-ups pending a date |

---

## Features

**Dashboard**
- Stat cards: total meetings, pending review, action items, parking lot count
- Dispatch bot by pasting a Google Meet URL
- Filter meetings by All / Needs Review / Reviewed
- Search meetings by title
- Rename meetings inline (hover card, click pencil)
- Delete meetings with confirmation (hover card, click trash)

**Live view**
- Transcript feed polling every 5 seconds
- Real-time AI insights via WebSocket (Ollama scrum master persona)
- Connection status indicator
- End Meeting removes the bot and navigates to the review

**Review page**
- Click the meeting title in the header to rename it
- Copy Summary button copies the full AI output to clipboard
- AI summary with action items, parking lot, and pending-to-schedule
- Participant chips extracted from transcript
- Task board: approve, reject, or edit each AI suggestion; drag between columns
- Full transcript with speaker avatars and timestamps

**Kanban / Parking Lot / To Schedule**
- Data aggregated across all meetings from the AI final report
- Filter by meeting
- Drag-and-drop on Kanban board
- Toggle parking lot items open/resolved
- Date picker for scheduling follow-ups

**Demo mode**
- Sidebar toggle loads sample data across all pages
- Persists in `localStorage`; switching off clears mock data immediately

---

## Backend integration

All API calls go through `src/api.js`. In Docker, Nginx proxies `/api/*` to the backend — no CORS, no baked-in URLs. `BACKEND_URL` is set at container start.

| Method | Endpoint | Used by |
|--------|----------|---------|
| `POST` | `/api/meetings/start` | Dashboard dispatch |
| `POST` | `/api/meetings/:id/leave` | Live — End Meeting |
| `GET` | `/api/meetings` | Dashboard, sidebar, Kanban, Parking Lot, Schedule |
| `GET` | `/api/meetings/:id` | Review page |
| `GET` | `/api/meetings/:id/transcript` | Review page |
| `PATCH` | `/api/meetings/:id` | Rename (Dashboard + Review) |
| `DELETE` | `/api/meetings/:id` | Delete from Dashboard |
| `WS` | `/api/ws/ingest/:id` | Live — real-time AI insights |

---

## Local development

```bash
npm install
npm run dev        # Vite dev server at http://localhost:5173
```

To point at a local backend, create a `.env` file:

```
VITE_API_URL=http://localhost:8000
```

Without this the app sends API requests to the same origin (works in Docker, not in bare `npm run dev`).

---

## Docker

Build and run locally:

```bash
docker build -t meetingmind-frontend .

docker run -d \
  -p 3000:80 \
  -e BACKEND_URL=http://<backend-host>:8000 \
  --name meetingmind-frontend \
  --restart unless-stopped \
  meetingmind-frontend
```

`BACKEND_URL` is the address Nginx uses inside the container to reach the backend. If the backend runs on the host, use `http://172.17.0.1:8000`. If both containers share a Docker network, use the container name: `http://meetingmind_backend:8000`.

---

## CI/CD

Every push to `main` triggers `.github/workflows/deploy.yml`, which SSHs into the server, pulls the latest code, rebuilds the image, and restarts the container.

**Required GitHub Secrets**

| Secret | Value |
|--------|-------|
| `SSH_HOST` | Server IP or hostname |
| `SSH_USER` | SSH username |
| `SSH_PRIVATE_KEY` | Private key with server access |
| `BACKEND_URL` | Backend address reachable from inside the Nginx container |

**Manual deploy**

SSH into the server and run:

```bash
cd /opt/meetingmind-ai/frontend
bash deploy.sh
```

---

## Recent changes

- All pages now pull from the real backend (was fully mock data before)
- Rename meetings inline — hover card and click pencil, or click the title on the Review page
- Delete meetings with confirmation from Dashboard
- Search bar on Dashboard to filter meetings by title
- Copy Summary button on Review page (summary + action items + parking lot)
- Demo mode now clears immediately when switched off
- Fixed duplicate transcript entries in Live view

---

## Branches

| Branch | Description |
|--------|-------------|
| `main` | Current React/Vite app |
| `flask-legacy` | Original Flask + SocketIO frontend (replaced) |
