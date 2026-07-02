# Conventions

Concise repo rules for humans and agents.

---

## TypeScript

Rules:

```txt
- strict TypeScript
- avoid any
- use unknown for untrusted values
- validate external input
- explicit types at package boundaries
- inferred types allowed inside local implementation
```

---

## Formatting

No Prettier.

Use ESLint + `@stylistic/eslint-plugin`.

Style:

```txt
- 4-space indent
- single quotes
- no semicolons
- strict spacing
- ignored args/vars/caught errors start with _
```

---

## Imports

Use workspace package imports.

Correct:

```ts
import { TaskStatus } from '@silent-pix/shared'
```

Wrong:

```ts
import { TaskStatus } from '../../packages/shared/src'
```

Rules:

```txt
- no cross-package relative imports
- no importing another package's src directly
- avoid circular package dependencies
```

---

## Package Ownership

```txt
apps/web
    UI and browser client only.

apps/server
    Hono server, routes, env, lifecycle.

apps/desktop
    desktop shell and startup model.

packages/shared
    shared contracts only.

packages/db
    persistence only.
```

Do not mix ownership.

---

## Backend Pattern

Use:

```txt
route → service/use-case → repository → database
```

Route handles:

```txt
- params/body
- validation
- service call
- HTTP response
```

Service handles:

```txt
- business rules
- orchestration
- lifecycle decisions
```

Repository handles:

```txt
- DB reads/writes
- transactions
- persistence details
```

---

## API Shape

Success:

```json
{
    "ok": true,
    "data": {}
}
```

Error:

```json
{
    "ok": false,
    "error": {
        "code": "ERROR_CODE",
        "message": "Human readable message"
    }
}
```

Do not leak raw internal errors.

---

## Env

Required dev defaults:

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

Rules:

```txt
- COMFYUI_BASE_URL is backend-only
- frontend env must not expose ComfyUI
- production desktop mode overrides data paths
- do not assume cwd is repo root
```

---

## Database

Use SQLite + Drizzle.

Rules:

```txt
- migrations for schema changes
- repositories own query details
- explicit transactions for multi-write consistency
- no image binary in DB
- no Prisma
- no PostgreSQL
- no Redis in base architecture
```

---

## File Storage

Filesystem stores:

```txt
images
thumbnails
uploads
workflow snapshots
```

SQLite stores:

```txt
id
task id
kind
relative path
width
height
mime
size bytes
timestamps
```

Prefer relative paths.

---

## Naming

Use clear names:

```txt
taskId
imageId
workflowId
createdAt
updatedAt
startedAt
finishedAt
errorMessage
relativePath
```

Allowed abbreviations:

```txt
id
url
api
db
dto
env
```

---

## File Naming

Suggested patterns:

```txt
*.schema.ts
*.repo.ts
*.service.ts
*.routes.ts
*.client.ts
*.config.ts
*.types.ts
```

Avoid vague files:

```txt
utils.ts
helpers.ts
common.ts
misc.ts
```

---

## Docs Update Rule

Update docs when changing:

```txt
- package ownership
- data flow
- task lifecycle
- persistence model
- env policy
- realtime strategy
- desktop startup model
- ComfyUI boundary
```

If it affects AI implementation behavior, also update `AGENTS.md`.

---

## Forbidden Shortcuts

```txt
- frontend calls ComfyUI
- frontend accesses SQLite
- route handlers contain large business logic
- task state stored only in memory
- image binary stored in SQLite
- production data stored in repo
- Prettier added
- Prisma added
- PostgreSQL added
- Redis added
- cross-package relative imports
```