# MeetingMind — Frontend

React + Vite frontend for MeetingMind AI. Served in production by Nginx inside Docker, with all `/api/*` requests proxied to the FastAPI backend.

---

## Local development

```bash
npm install
npm run dev        # starts Vite dev server at http://localhost:5173
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

`BACKEND_URL` is the address Nginx uses **inside the container** to reach the backend. If the backend is exposed on the host, use `http://172.17.0.1:8000`. If both containers share a Docker network, use the container name: `http://meetingmind_backend:8000`.

---

## CI/CD — automatic deploy on push to `main`

Every push to `main` triggers `.github/workflows/deploy.yml`, which SSHs into the server, pulls the latest code, rebuilds the image, and restarts the container.

### Required GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

| Secret | Value |
|--------|-------|
| `SSH_HOST` | Server IP or hostname |
| `SSH_USER` | SSH username (e.g. `khoury`) |
| `SSH_PRIVATE_KEY` | Contents of the private key that has access to the server |
| `BACKEND_URL` | Backend address reachable from inside the Nginx container (e.g. `http://172.17.0.1:8000`) |

### Manual deploy

SSH into the server and run:

```bash
cd /opt/meetingmind-ai/frontend
git pull origin main
docker build -t meetingmind-frontend .
docker stop meetingmind-frontend && docker rm meetingmind-frontend
docker run -d -p 3000:80 -e BACKEND_URL=http://172.17.0.1:8000 \
  --name meetingmind-frontend --restart unless-stopped meetingmind-frontend
```

---

## Demo mode

A **Demo Mode** toggle in the sidebar loads sample data across all pages so every feature can be tested without a live meeting. Toggle it off for real use — the app will show the actual state from the backend.

Demo mode is stored in `localStorage` and persists across refreshes.

---

## Branches

| Branch | Description |
|--------|-------------|
| `main` | Current React/Vite app |
| `flask-legacy` | Original Flask + SocketIO frontend (replaced) |
