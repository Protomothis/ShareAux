[🇰🇷 한국어](./deployment.ko.md)

# Deployment Guide

## Docker Compose (Recommended)

### Prerequisites

- Docker and Docker Compose installed
- (Optional) Domain + reverse proxy (nginx, etc.)

### 1. Clone the Project

```bash
git clone https://github.com/Protomothis/ShareAux.git
cd ShareAux
```

### 2. Configure Environment Variables

```bash
cp .env.example .env
```

Open the `.env` file and configure the following.

#### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://spotiparty:password@db:5432/spotiparty` |
| `JWT_SECRET` | JWT signing secret (random string) | Generate with `openssl rand -hex 32` |
| `CLIENT_URL` | Client access URL | `http://localhost:3001` |

#### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Google login disabled if unset |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | `{CLIENT_URL}/api/auth/google/callback` |
| `GEMINI_API_KEY` | Gemini API key | Lyrics translation disabled if unset |
| `CAPTCHA_ENABLED` | PoW CAPTCHA enabled | `false` |
| `DB_PASSWORD` | PostgreSQL password | `spotiparty123` |

### 3. Run

```bash
docker compose up -d
```

Three containers will start:

| Container | Port | Description |
|-----------|------|-------------|
| `shareaux-db` | 5432 | PostgreSQL |
| `shareaux-server` | 3000 | NestJS API + WebSocket |
| `shareaux-client` | 3001 | Next.js frontend |

Access `http://localhost:3001` in your browser.

### 4. Initial Setup

On first visit, you'll be redirected to `/setup`. Create an admin account.

### 5. Privacy Policy / Terms of Service

ShareAux provides default `/privacy` and `/terms` pages. When self-hosting, modify the content to match your environment.

- File locations: `client/content/privacy/`, `client/content/terms/` (locale-specific MDX files)
- Update operator contact info, data retention policies, and applicable laws
- If using Google OAuth, you may need to submit a privacy policy URL for Google API review. Use your deployed instance's `/privacy` URL

---

## GHCR Images

Use pre-built images without building from source.

```
ghcr.io/protomothis/shareaux-server:latest   # Latest version
ghcr.io/protomothis/shareaux-server:0.1.0    # Specific version
ghcr.io/protomothis/shareaux-client:latest
ghcr.io/protomothis/shareaux-client:0.1.0
```

For stable operation, use specific version tags instead of `latest`.

```yaml
# docker-compose.yml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_DB: spotiparty
      POSTGRES_USER: spotiparty
      POSTGRES_PASSWORD: ${DB_PASSWORD:-spotiparty123}
    ports:
      - '5432:5432'
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U spotiparty']
      interval: 5s
      timeout: 5s
      retries: 5

  server:
    image: ghcr.io/protomothis/shareaux-server:latest
    environment:
      DATABASE_URL: postgres://spotiparty:${DB_PASSWORD:-spotiparty123}@db:5432/spotiparty
      CLIENT_URL: http://localhost:3001
    env_file: ./.env
    ports:
      - '3000:3000'
    depends_on:
      db:
        condition: service_healthy

  client:
    image: ghcr.io/protomothis/shareaux-client:latest
    environment:
      INTERNAL_API_URL: http://server:3000/api
    ports:
      - '3001:3001'
    depends_on:
      - server

volumes:
  pgdata:
```

```bash
docker compose up -d
```

---

## Reverse Proxy

ShareAux runs the client (Next.js) and server (NestJS) on separate ports. To serve from a single domain via reverse proxy, follow these routing rules.

### Route Structure

| Path | Target | Description |
|------|--------|-------------|
| `/` | Client (:3001) | Next.js pages |
| `/api/*` | Server (:3000) | REST API |
| `/ws` | Server (:3000) | WebSocket (audio streaming + real-time events) |

> ⚠️ The client auto-generates API/WS URLs based on `window.location.origin`.
> Therefore `/api` and `/ws` must be accessible from the same domain.

### Environment Variables

When using a reverse proxy, update these values in `.env` to your actual domain:

```env
CLIENT_URL=https://aux.example.com
GOOGLE_CALLBACK_URL=https://aux.example.com/api/auth/google/callback
```

### nginx Example

```nginx
server {
    listen 443 ssl;
    server_name aux.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # WebSocket (audio streaming) — must handle /ws separately
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400s;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Client (Next.js) — all other paths
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Traefik Example (Label-based)

```yaml
services:
  server:
    labels:
      - "traefik.http.routers.shareaux-api.rule=Host(`aux.example.com`) && (PathPrefix(`/api`) || PathPrefix(`/ws`))"
      - "traefik.http.services.shareaux-api.loadbalancer.server.port=3000"
  client:
    labels:
      - "traefik.http.routers.shareaux-client.rule=Host(`aux.example.com`)"
      - "traefik.http.services.shareaux-client.loadbalancer.server.port=3001"
```

### Notes

- Set `proxy_read_timeout` long enough for `/ws` (audio streaming maintains long-lived connections)
- When using HTTPS, WebSocket automatically connects via `wss://`
- Enable WebSocket support when using CDNs like Cloudflare

---

## Updates

```bash
# Using GHCR images
docker compose pull
docker compose up -d

# Building from source
git pull
docker compose build
docker compose up -d
```

### Versions Requiring DB Migration

Some versions include DB schema changes that require migration. SQL scripts are provided in the `migrations/` directory.

```bash
# 1. Always backup first
docker compose exec db pg_dump -U spotiparty spotiparty > backup.sql

# 2. Run migration (e.g., v0.1.2 → v0.1.3)
docker compose exec -T db psql -U spotiparty < migrations/v0.1.2-to-v0.1.3.sql

# 3. Update images
docker compose pull && docker compose up -d
```

> ⚠️ Updating without migration may cause `synchronize: true` to add new columns, but existing data could be lost.

---

## Troubleshooting

### Check Server Logs

```bash
docker logs shareaux-server -f --tail 50
```

### Reset Database

```bash
docker compose down -v   # Delete including volumes
docker compose up -d     # Recreate
```

### Port Conflicts

If default ports (3000, 3001, 5432) are in use, change the port mappings in `docker-compose.yml`.
