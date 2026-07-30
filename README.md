# MeetingMind AI Frontend (UI Zone)

This directory contains the React + Vite frontend for the MeetingMind AI application.

It provides the user interface for:
- Managing teams and meeting records
- Viewing real-time, live AI insights during active meetings
- Reviewing AI-generated meeting summaries, action items, and kanban boards

## 📚 Documentation

Detailed documentation has been centralized in the root `docs/` folder:
- **[Frontend Architecture Guide](../docs/architecture/frontend.md)**
- **[Monorepo Overview & Setup](../docs/README.md)**

## ✨ Features

- **Dashboard:** Stat cards, bot dispatch, meeting search, and topic tagging.
- **Live Meeting View:** Real-time transcript polling and instant AI insights streamed via WebSocket.
- **Post-Meeting Review:** Comprehensive AI summary, transcript playback with speaker avatars, and task approval workflows.
- **Agile Boards:** Global Kanban boards, Parking Lot, and Schedule views spanning across all team meetings.
- **Team Management:** Invite links, member management, and customizable topic tags.

## 🚀 Running Locally

This service is designed to run as part of the `docker-compose.yml` stack defined in the root directory. It is served by Nginx, which also proxies `/api/*` requests to the backend.

```bash
# From the root directory:
docker compose up -d --build frontend
```

The frontend will be available at `http://localhost:3000` (or `https://<server-ip>` for remote deployments).

### Standalone Development Server

For active UI development, you can run the Vite dev server directly:

```bash
npm install
npm run dev
```

*Note: You must create a `.env` file containing `VITE_API_URL=http://localhost:8000` so the Vite server knows where to send API requests.*

## 🔌 API Integration

All API calls are routed through `src/api.js`. When running in Docker, Nginx automatically proxies any request matching `/api/*` to the FastAPI backend defined by the `BACKEND_URL` environment variable. This eliminates CORS issues and hardcoded API URLs.

Key endpoints used include:
- `POST /api/meetings/start` - Dispatches a bot
- `GET /api/meetings/:id/transcript` - Fetches transcripts
- `WS /api/ws/ingest/:id` - WebSocket for live AI insights
- `PATCH /api/meetings/:id/actions/:actionId` - Approve/reject AI proposals

## 🛠 CI/CD

Deployment is automated via GitHub Actions (`.github/workflows/deploy.yml`). Pushes to the `main` branch trigger a workflow that SSHs into the production server, pulls the latest code, rebuilds the frontend container, and restarts it automatically.
