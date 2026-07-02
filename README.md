# Silent Pix

Local-first image generation client for ComfyUI workflows.

Silent Pix is designed for long-term personal use:

- PC desktop mode as the main long-running client.
- Phone/browser web mode connecting to the local backend.

This repo is a clean rebuild. The goal is to define stable architecture first, then let agents implement features safely.

---

## Stack

| Area | Decision |
|---|---|
| Monorepo | pnpm workspace |
| Build | Turborepo |
| Language | TypeScript |
| Frontend | SolidJS + Vite |
| Backend | Hono on Node.js |
| Database | SQLite |
| DB tooling | Drizzle |
| Formatting | ESLint + @stylistic |
| Prettier | Not used |
| Runtime files | Filesystem |
| Production data | OS app data directory |
| Dev data | `./.local/data` |

---

## Architecture Summary

```txt
Desktop / Web client
    ↓ REST
Backend server
    ↓
SQLite + filesystem
    ↓
ComfyUI
```

Rules:

- Backend is the source of truth.
- Frontend must not call ComfyUI directly.
- Frontend must not access SQLite directly.
- SQLite stores durable state and metadata.
- Filesystem stores images, thumbnails, uploads, and workflow snapshots.
- Realtime channels are future notifications only, not source of truth.

---

## Repo Structure

```txt
apps/
    web/        SolidJS frontend
    server/     Hono backend
    desktop/    desktop shell placeholder

packages/
    shared/     shared DTOs, schemas, enums, types
    db/         SQLite / Drizzle schema, client, migrations, repositories

docs/
    architecture.md
    conventions.md
```

---

## Runtime Data

Development:

```txt
.local/data/
    silent-pix.sqlite
    storage/
        images/
        thumbnails/
        uploads/
        workflows/
```

Production desktop mode must use the OS app data directory, not the repo.

Examples:

```txt
Windows: %APPDATA%/Silent Pix/
macOS:   ~/Library/Application Support/Silent Pix/
Linux:   ~/.config/Silent Pix/
```

SQLite records should prefer relative paths.

---

## Environment

Copy `.env.example` to `.env`.

```env
NODE_ENV=development

SERVER_HOST=127.0.0.1
SERVER_PORT=3070
WEB_PORT=5173

COMFYUI_BASE_URL=http://127.0.0.1:8188

APP_DATA_DIR=./.local/data
DATABASE_PATH=./.local/data/silent-pix.sqlite
APP_STORAGE_DIR=./.local/data/storage
```

`COMFYUI_BASE_URL` is backend-only.

---

## Scripts

```bash
pnpm dev
pnpm dev:web
pnpm dev:server
pnpm dev:desktop

pnpm build
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm check
pnpm clean
```

---

## Current Phase

Foundation only.

Allowed now:

```txt
- monorepo setup
- TypeScript setup
- ESLint setup
- Hono base server
- SolidJS base app
- SQLite / Drizzle foundation
- docs and AGENTS.md
```

Not allowed yet:

```txt
- task queue
- ComfyUI integration
- SSE / WebSocket
- image generation UI
- workflow editor
- auth
- cloud sync
- multi-user system
```

---

## Docs

Read before feature work:

```txt
docs/architecture.md
docs/conventions.md
AGENTS.md
```

Docs are the architecture contract. Do not bypass them for quick MVP implementation.