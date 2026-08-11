# Architecture

Silent Pix is a local-first desktop/web app. The backend owns task state, persistence, and ComfyUI communication.

---

## Source of Truth

```txt
SQLite     = durable state and metadata
Filesystem = images, uploads, thumbnails, workflow snapshots
Memory     = active runtime state only
REST       = actions and queries
Realtime   = validated cache-update snapshots
Frontend   = UI state only
ComfyUI    = execution backend only
```

Rules:

- Backend is the source of truth.
- Frontend must not invent task lifecycle state.
- WebSocket events must not be required to recover state.
- Client refresh + REST query must always recover the current state.

---

## App Boundaries

### `apps/web`

Owns UI only.

Allowed:

```txt
- SolidJS UI
- Tailwind CSS styling
- frontend state
- backend API calls
- local WebSocket event client
- static/mock UI data for layout shaping
```

Forbidden:

```txt
- ComfyUI calls
- SQLite access
- filesystem policy
- task lifecycle authority
- durable task/image state
```

Current web structure:

```txt
apps/web/src/
    App.tsx
        app shell, shared Header, and event client lifecycle

    components/
        Header.tsx
            app-level header

        base/
            shared low-level UI primitives, such as Button, Label, Line, Panel, and Tag

        field/
            shared Ark UI-based form/control primitives, such as Editable, Number, Select, Slider, and Text

    pages/generate/
        generate workspace shell

    pages/generate/components/
        task/
            generate-page task list and item UI

        config/
            generate-page detail/config mock UI

        TaskStatus.tsx
            generate-page status display

    temp/
        temporary mock assets/data for UI shaping only
```

`apps/web` uses `@/` as an alias to `apps/web/src`.

Generate page status:

```txt
- layout foundation only
- static/mock task list, task detail, config fields, and LoRA stack placeholders are allowed
- collapsible panels and form controls are UI state only
- page editor state is page-scoped through context
- Zod validates submit/API payload boundaries; there is no generic form abstraction
- no task queue
- no task lifecycle authority
- no ComfyUI calls
- no durable image/task/config state
```

Web state:

```txt
- apps/web uses Solid native stores through `apps/web/src/lib/store.ts`
- the local store wrapper exposes `state`, `set`, `reconcile`, `produce`, and optional flattened actions
- domain actions live on returned store objects, not inside reactive state
- stores must preserve Solid fine-grained reactivity and native `set` path syntax
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
- local WebSocket event endpoint
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
route ??service/use-case ??repository ??SQLite
```

---

### `apps/desktop`

Owns desktop shell only.

Allowed later:

```txt
- app window
- OS app data path resolution
- backend process startup/connection
- local REST/WS connection to the backend
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

Shared REST and WebSocket contracts only.

Event contracts live under `packages/shared/src/event/<module>.ts`, divided by domain module. The aggregate `event.serverEvent` schema is the runtime source of truth for outbound server events.

Allowed:

```txt
- DTOs
- enums
- schemas
- shared API types
- server-to-web WebSocket event Zod schemas and inferred types
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

### `packages/event`

Owns generic WebSocket transport helpers only.

Allowed:

```txt
- browser WebSocket client helper with JSON decoding and reconnect lifecycle
- Node WebSocket server helper with socket collection and JSON broadcast
```

Forbidden:

```txt
- DB access
- Hono routes
- ComfyUI client
- task lifecycle logic
- durable state
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
- return authoritative backend state
- expose health and future resource APIs
```

WebSocket foundation:

```txt
- endpoint: GET /api/event
- local clients only
- server events only
- current business notification: `task.changed` with task lifecycle snapshot fields
- server validates every outbound event through `event.serverEvent.parse()` before broadcast
- connection state comes from WebSocket open, close, and reconnect lifecycle callbacks
```

Realtime is not durable; SQLite remains authoritative and REST restores missed state.

Current frontend event usage:

```txt
- App.tsx owns the local server-event client lifecycle
- `apps/web/src/lib/event.ts` dispatches decoded `Event.ServerEvent` values
- a successful `POST /api/task` response seeds the local feed and detail caches before task selection
- `task.changed` patches matching task feed and detail cache data without another request
- a WebSocket reconnection invalidates `taskKeys.all` once to recover events missed while disconnected
- Header may display connection status
- generate task UI initializes from REST and applies server-validated realtime snapshots
```

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
