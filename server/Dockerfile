# ── build stage ──────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── runtime stage ────────────────────────────────────────
FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg python3 python3-pip pipx && \
    pipx install yt-dlp && \
    pip3 install --break-system-packages syncedlyrics && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/main.js"]
