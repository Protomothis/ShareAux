[🇰🇷 한국어](./development.ko.md)

# Development Guide

## Required Tools

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22+ | Server + client runtime |
| PostgreSQL | 16 | Database (Docker recommended) |
| ffmpeg | 6+ | Audio transcoding (fMP4 AAC) |
| media resolver | Latest | Audio URL extraction |
| python3 | 3.10+ | syncedlyrics (lyrics search) |

### macOS

```bash
brew install node ffmpeg python3
pip3 install syncedlyrics
```

### Ubuntu/Debian

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs ffmpeg python3 python3-pip
pip3 install syncedlyrics
```

---

## Project Structure

```
ShareAux/
├── server/          # NestJS backend
│   ├── src/
│   │   ├── auth/        # Authentication (Google OAuth, JWT)
│   │   ├── rooms/       # Room CRUD, WebSocket gateway
│   │   ├── player/      # Playback control, streaming
│   │   ├── queue/       # Queue management
│   │   ├── search/      # Music search
│   │   ├── admin/       # Admin API
│   │   ├── services/    # Shared services (audio, lyrics, translation, etc.)
│   │   ├── entities/    # TypeORM entities
│   │   └── types/       # Shared types
│   ├── dev.js           # Dev server runner
│   └── Dockerfile
├── client/          # Next.js frontend
│   ├── src/
│   │   ├── app/         # App Router pages
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom hooks
│   │   ├── lib/         # Utilities
│   │   ├── api/         # orval auto-generated (do not edit)
│   │   └── types/       # Shared types
│   ├── dev.js           # Dev server runner
│   └── Dockerfile
├── docker-compose.yml
├── .env                 # Environment variables
└── dev.sh               # Dev server batch runner
```

---

## Local Development Setup

### 1. Clone and Install Dependencies

```bash
git clone https://github.com/Protomothis/ShareAux.git
cd ShareAux

cd server && npm install && cd ..
cd client && npm install && cd ..
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Minimum configuration:

```env
DATABASE_URL=postgres://spotiparty:spotiparty123@localhost:5432/spotiparty
JWT_SECRET=your-random-secret-here
CLIENT_URL=http://localhost:3001
```

### 3. Database

```bash
docker compose up db -d
```

Tables are auto-created via TypeORM `synchronize: true`.

### 4. Run Dev Server

```bash
# Option 1: Batch run
./dev.sh up        # DB + server + client
./dev.sh down      # Stop all

# Option 2: Individual (using screen)
screen -dmS srv bash -c "cd server && node dev.js"
screen -dmS cli bash -c "cd client && node dev.js"
```

> **Warning**: Do not run `nest start` or `next dev` directly. Always use `dev.js` to prevent port conflicts and ensure proper child process cleanup on exit.

| Service | Port | URL |
|---------|------|-----|
| Server | 3000 | http://localhost:3000/api |
| Client | 3001 | http://localhost:3001 |
| Swagger | 3000 | http://localhost:3000/api/docs |

### 5. Initial Setup

Visit `http://localhost:3001` in your browser — you'll be redirected to `/setup`. Create an admin account.

---

## Development Workflow

### Code Verification

After modifying files, always verify in this order:

```bash
# Server
cd server
npx prettier --write src/path/to/file.ts
npx tsc --noEmit

# Client
cd client
npx prettier --write src/path/to/file.tsx
npx tsc --noEmit
```

### API Type Generation

When server DTOs change, regenerate client types via Swagger → orval:

```bash
# 1. With server running, download swagger.json
curl http://localhost:3000/api/docs-json > client/swagger.json

# 2. Run orval
cd client && npm run api:generate
```

The `client/src/api/` directory is auto-generated — do not edit manually.

### Logs

Dev server logs are stored in the `.log/` directory at project root:

```
.log/server.log
.log/client.log
```

---

## Key Conventions

### TypeScript

- Strict mode, no `any`
- Server: ESM (`"module": "nodenext"`) — `.js` extension required for all relative imports
- Client: `@/*` → `./src/*` path alias
- No inline types — define named interfaces in `types/` directory

### Server

- Access env vars via `ConfigService` (never use `process.env` directly)
- Use NestJS exception classes (`NotFoundException`, `BadRequestException`, etc.)
- Entity properties in camelCase, DB columns with `@Column({ name: 'snake_case' })`

### Client

- Server Components by default, `"use client"` only when needed
- Use `components/ui/` shadcn primitives (no inline HTML elements)
- zustand (client state) + react-query (server state)
- Import from `motion/react` (not framer-motion)
