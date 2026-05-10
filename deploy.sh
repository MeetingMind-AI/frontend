#!/bin/bash
set -e

CONTAINER="meetingmind-frontend"
IMAGE="meetingmind-frontend"
PORT="3000"
BACKEND_URL="${BACKEND_URL:-http://172.17.0.1:8000}"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building image..."
docker build -t "$IMAGE" .

echo "==> Stopping old container (if running)..."
docker stop "$CONTAINER" 2>/dev/null || true
docker rm   "$CONTAINER" 2>/dev/null || true

echo "==> Starting new container..."
docker run -d \
  -p "$PORT:80" \
  -e BACKEND_URL="$BACKEND_URL" \
  --name "$CONTAINER" \
  --restart unless-stopped \
  "$IMAGE"

echo "==> Done. Frontend running at http://localhost:$PORT"
echo "    Backend URL (inside container): $BACKEND_URL"
