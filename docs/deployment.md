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
| `CLIENT_URL` | Client access URL | `http://localhost:8080` |

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

Four containers will start:

| Container | Port | Description |
|-----------|------|-------------|
| `shareaux-gateway` | 8080 | Caddy reverse proxy (single entry point) |
| `shareaux-db` | — | PostgreSQL |
| `shareaux-server` | — | NestJS API + WebSocket |
| `shareaux-client` | — | Next.js frontend |

Access `http://localhost:8080` in your browser.

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

Since v0.1.17, ShareAux includes a built-in Caddy gateway that handles all internal routing. You only need to expose **a single port** to your reverse proxy — no path-based routing required.

### How It Works

```
External Proxy → shareaux-gateway:8080 → routes internally:
  /api/*  → server:3000
  /ws     → server:3000 (WebSocket auto-detected)
  /*      → client:3001
```

### External Reverse Proxy Setup

Your external reverse proxy (nginx, Traefik, Caddy, Pangolin, etc.) only needs to forward all traffic to the gateway port. No path splitting needed.

#### nginx Example

```nginx
server {
    listen 443 ssl;
    server_name aux.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400s;
    }
}
```

#### Traefik Example

```yaml
services:
  gateway:
    labels:
      - "traefik.http.routers.shareaux.rule=Host(`aux.example.com`)"
      - "traefik.http.services.shareaux.loadbalancer.server.port=80"
```

### Environment Variables

When using a custom domain, update `.env`:

```env
CLIENT_URL=https://aux.example.com
GOOGLE_CALLBACK_URL=https://aux.example.com/api/auth/google/callback
```

### Changing the Gateway Port

Default is 8080. To change, edit `docker-compose.ghcr.yml`:

```yaml
gateway:
  ports:
    - '3200:80'  # Change 3200 to your preferred port
```

### Notes

- WebSocket upgrade is handled automatically by the internal Caddy gateway
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
