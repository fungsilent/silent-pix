# Architecture

Silent Pix is a local-first desktop/web app. The backend owns task state, persistence, and ComfyUI communication.

---

## Source of Truth

```txt
SQLite     = durable state and metadata
Filesystem = images, uploads, thumbnails, workflow snapshots
Memory     = active runtime state only
REST       = actions and queries
Realtime   = notifications only
Frontend   = UI state only
ComfyUI    = execution backend only
```

Rules:

- Backend is the source of truth.
- Frontend must not invent task lifecycle state.
- Realtime events must not be required to recover state.
- Client refresh + REST query must always recover the current state.

---

## App Boundaries

### `apps/web`

Owns UI only.

Allowed:

```txt
- SolidJS UI
- frontend state
- backend API calls
- future realtime client
```

Forbidden:

```txt
- ComfyUI calls
- SQLite access
- filesystem policy
- task lifecycle authority
```

---

### `apps/server`

Owns backend entrypoint.

Allowed:

```txt
- Hono app
- REST routes
- config/env
- server lifecycle
- future realtime endpoints
- calling services/use-cases
```

Forbidden:

```txt
- large domain logic inside routes
- direct DB queries inside routes after repositories exist
- UI logic
```

Preferred flow:

```txt
route → service/use-case → repository → SQLite
```

---

### `apps/desktop`

Owns desktop shell only.

Allowed later:

```txt
- app window
- OS app data path resolution
- backend process startup/connection
```

Forbidden:

```txt
- task lifecycle
- DB schema
- ComfyUI workflow logic
```

Desktop mode is a first-class target.

---

### `packages/shared`

Shared contracts only.

Allowed:

```txt
- DTOs
- enums
- schemas
- shared API types
```

Forbidden:

```txt
- Node-only code
- browser-only code
- DB access
- filesystem access
- Hono logic
```

---

### `packages/db`

Persistence layer.

Allowed:

```txt
- Drizzle schema
- migrations
- SQLite client creation
- repositories
- DB init helpers
```

Forbidden:

```txt
- Hono routes
- UI code
- ComfyUI client
- desktop shell code
```

---

## Backend

Use:

```txt
Hono on Node.js
```

Do not introduce:

```txt
- Encore.ts
- NestJS
- tRPC
- Bun as required runtime
```

Hono must stay thin. Domain logic belongs in services/use-cases.

---

## Database

Use:

```txt
SQLite + Drizzle
```

Do not use:

```txt
- PostgreSQL
- Prisma
- Redis
- cloud database services
```

SQLite stores metadata and durable state only. Image binary data stays on filesystem.

SQLite init:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

---

## Storage

Use filesystem for:

```txt
storage/
    images/
    thumbnails/
    uploads/
    workflows/
```

DB should store relative paths, not absolute paths.

Production data must live in OS app data directory. Dev data may use `./.local/data`.

---

## REST and Realtime

REST:

```txt
- create/read/update task-related resources
- read/update settings
- return authoritative backend state
```

Future SSE/WebSocket:

```txt
- notify task changes
- notify progress
- notify previews
```

Realtime is never the durable source of truth.

---

## ComfyUI Boundary

Only backend talks to ComfyUI.

Frontend must not know:

```txt
- ComfyUI URL
- ComfyUI API shape
- ComfyUI websocket protocol
- ComfyUI internal node IDs
```

Backend translates Silent Pix tasks into ComfyUI execution.

---

## Technical Debt Rules

Forbidden shortcuts:

```txt
- frontend calls ComfyUI
- frontend accesses SQLite
- task state exists only in memory
- image binary stored in SQLite
- production DB stored in repo
- route handlers contain large business logic
- cross-package relative imports
- feature code before ownership is clear
```

If architecture is unclear, update docs before implementation.