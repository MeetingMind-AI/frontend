# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

# ── Stage 2: serve ───────────────────────────────────────────────────────────
FROM nginx:alpine

# Generate a self-signed cert for HTTPS (dev/POC only — not for production)
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/ssl \
    && openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/CN=meetingmind-local" \
    && apk del openssl

COPY --from=builder /app/dist /usr/share/nginx/html

# Place config as a template — nginx:alpine's entrypoint runs envsubst on
# /etc/nginx/templates/*.template and writes the result to /etc/nginx/conf.d/
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Only substitute BACKEND_URL; leave nginx variables ($host, $uri, etc.) untouched
ENV NGINX_ENVSUBST_TEMPLATE_VARS=BACKEND_URL

# Backend address — override at runtime with:
#   docker run -e BACKEND_URL=http://<host>:8000 ...
ENV BACKEND_URL=http://localhost:8000

EXPOSE 80 443

# CMD inherited from nginx:alpine — runs envsubst then starts nginx
