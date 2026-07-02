# Codex Plan: Complete Missing Foundation

Read first:

```txt
README.md
docs/architecture.md
docs/conventions.md
AGENTS.md
```

Follow existing docs and configs. Do not rewrite architecture.

---

## Goal

Complete missing foundation files for the existing repo.

Do not implement product features.

---

## Current State

The root scaffold already exists.

Do not recreate or heavily rewrite existing root configs unless required to make the foundation work.

---

## Tasks

Create/complete:

```txt
packages/db/

apps/server/
apps/web/
apps/desktop/

packages/shared/
```

Each app/package must have:

```txt
package.json
tsconfig.json
src/
```

---

## packages/db

Create SQLite + Drizzle foundation.

Include:

```txt
packages/db/
    package.json
    tsconfig.json
    drizzle.config.ts
    migrations/.gitkeep
    src/index.ts
    src/schema.ts
    src/client.ts
    src/repositories/tasks.repo.ts
    src/repositories/images.repo.ts
    src/repositories/app-settings.repo.ts
```

Initial tables only:

```txt
tasks
task_events
images
app_settings
```

Apply SQLite init:

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

No real task queue or ComfyUI behavior.

---

## apps/server

Create minimal Hono server.

```txt
apps/server/
    package.json
    tsconfig.json
    src/index.ts
    src/app.ts
    src/config/env.ts
    src/routes/health.routes.ts
    src/responses/api-response.ts
```

Requirements:

```txt
- load env
- start server from SERVER_HOST / SERVER_PORT
- expose GET /health
- use consistent API response shape
```

No task routes, ComfyUI routes, SSE, WebSocket, auth, or image serving.

---

## apps/web

Create minimal SolidJS + Vite app.

```txt
apps/web/
    package.json
    tsconfig.json
    vite.config.ts
    index.html
    src/main.tsx
    src/App.tsx
    src/styles.css
```

Requirements:

```txt
- basic Silent Pix page
- no feature UI
- no task UI
- no ComfyUI URL exposure
```

---

## apps/desktop

Create placeholder package only.

```txt
apps/desktop/
    package.json
    tsconfig.json
    src/index.ts
```

No Electron/Tauri implementation yet.

---

## packages/shared

Complete as buildable shared package.

```txt
packages/shared/
    package.json
    tsconfig.json
    src/index.ts
```

Only shared contracts. No Node/browser-specific logic.

---

## Rules

Do not add:

```txt
Prettier
Prisma
non-SQLite databases
Redis
Encore.ts
NestJS
tRPC
auth
ComfyUI integration
task queue
SSE/WebSocket
feature UI
```

Do not use cross-package relative imports.

Do not expose `COMFYUI_BASE_URL` to frontend.

---

## Finish

Run:

```bash
pnpm install
pnpm lint:fix
pnpm build
pnpm typecheck
pnpm check
```

Report:

```txt
1. files changed
2. dependencies added
3. commands run and results
4. deviations, if any
```
