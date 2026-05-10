#!/bin/bash
set -e

CONTAINER="meetingmind-frontend"
BACKEND_URL="${BACKEND_URL:-http://172.17.0.1:8000}"

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building image..."
docker build -t meetingmind-frontend .

echo "==> Restarting container..."
docker stop "$CONTAINER" 2>/dev/null || true
docker rm   "$CONTAINER" 2>/dev/null || true

docker run -d \
  -p 3000:80 \
  -e BACKEND_URL="$BACKEND_URL" \
  --name "$CONTAINER" \
  --restart unless-stopped \
  meetingmind-frontend

echo "==> Done. Running containers:"
docker ps --filter name="$CONTAINER" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
