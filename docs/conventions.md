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

## Types and Contracts

Find the existing definition before writing a type. Do not hand-write a copy of
something a library or `packages/shared` already declares.

Rules:

```txt
- library shapes come from the library's own exported types
- payload validation comes from the shared Zod schema, not hand-written narrowing
- a hand-written structural subset is a silent duplicate: it goes stale without ever failing to compile
- if the existing definition is awkward to use, prove it with a compile before replacing it
```

Examples:

```ts
// no — a hand-written subset of the client library's response
type TreatyResult<T> = { data: T | null, error: { status: unknown, value: unknown } | null }

// yes — the library already declares both
Treaty.TreatyResponse<Record<number, unknown>>
Treaty.Error<Treaty.TreatyResponse<Record<number, unknown>>>
```

```ts
// no — re-implements appApi.errorResponse by hand
if (typeof value !== 'object' || value === null || !('error' in value)) return undefined

// yes — validate with the contract itself
const body = appApi.errorResponse.safeParse(value)
```

A declared type describes the contract, not runtime reality. Eden types a route's
error as `status: 422 | 500`, but a transport failure produces `status: 503` with an
`Error` in `value` — neither is in the declared union. So reusing the library type
does not remove the need to narrow untrusted values; it only removes the duplicate.

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

Inside `apps/web/src`, use the web source alias:

```ts
import { Button } from '@/components/base/Button'
import { TaskList } from '@/pages/generate/components/task/TaskList'
```

Do not use relative imports inside `apps/web/src`:

```ts
import { Button } from '../../../components/base/Button'
```

Rules:

```txt
- no cross-package relative imports
- no relative imports inside `apps/web/src`; use `@/`
- no importing another package's src directly
- avoid circular package dependencies
```

---

## Package Ownership

```txt
apps/web
    UI and browser client only.
    App-level chrome lives in `apps/web/src/components`.
    Shared low-level UI primitives live in `apps/web/src/components/base`.
    Shared form/control primitives live in `apps/web/src/components/field`.
    Page-specific UI lives under that page folder, e.g. `apps/web/src/pages/generate/components`.

apps/server
    Hono server, routes, env, lifecycle.

apps/desktop
    desktop shell and startup model.

packages/shared
    shared contracts only.

packages/event
    event contracts and WebSocket helpers only.

packages/db
    persistence only.
```

Do not mix ownership.

---

## Backend Pattern

Use:

```txt
route ??service/use-case ??repository ??database
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

## Events

Use `packages/shared/src/event/<module>.ts` for server-to-web event contracts and `packages/event` for generic WebSocket transport helpers.

Rules:

```txt
- aggregate outbound events through `event.serverEvent`
- server validates every outbound event before broadcast
- browser connection helpers live in `packages/event/src/client.ts`
- Node WebSocket server helpers live in `packages/event/src/server.ts`
- `task.changed` carries fields required to patch existing list and detail query caches
- application events must not exist purely for transport; a heartbeat must carry user-visible state
- `health.snapshot` doubles as the liveness signal; the client treats silence of *valid* events as connection loss
- the client must validate every inbound event; an event that fails validation is not evidence the connection is alive
- the heartbeat interval lives in `packages/shared`; both sides derive their timers from it
- when the connection is lost the client must treat health as unknown, never reuse the last snapshot
- no DB imports
- no Hono imports
- validated WebSocket snapshots update query caches directly; REST `/health` remains for bootstrap and external checks
```

---

## Web UI

Use:

```txt
- SolidJS components
- Tailwind CSS utilities
- clsx for conditional class composition
- lucide-solid for icons
- flex layout as the default layout primitive
```

Rules:

```txt
- shared low-level primitives go in `apps/web/src/components/base`
- shared form/control primitives go in `apps/web/src/components/field`
- app-level chrome such as `Header` lives in `apps/web/src/components` and is used from `App.tsx`
- page-specific components go in `apps/web/src/pages/<page>/components`
- a `components` folder holds components only
- page-scoped non-component logic sits at the page root, beside that page's store
- logic that carries no page-specific knowledge goes in `apps/web/src/lib`, even when only one page uses it today
- generate task-list components live in `apps/web/src/pages/generate/components/task`
- generate detail/config components live in `apps/web/src/pages/generate/components/config`
- page components should not own app-level header layout
- generate page mock data may exist only as UI placeholder data
- mock UI data must not become backend state or task lifecycle authority
- web state uses Solid native stores through `apps/web/src/lib/store.ts`
- store consumers read native Solid store proxies directly from `store.state`
- domain actions may be flattened onto returned stores but must not live inside reactive state
- page editor state should be page-scoped through context
- Zod validates submit/API payload boundaries; do not add a generic form abstraction
- prefer `classes`/named class slots for reusable components when one `class` string is too vague
```

Current component roles:

```txt
components/Header.tsx
    App-level header.

components/base/Button.tsx
    Base button primitive.

components/base/Label.tsx
    Compact display label/pill.

components/base/Line.tsx
    Shared line/separator primitive.

components/base/Panel.tsx
    Collapsible panel and scrollable panel-content primitives. Panel owns collapsed state and passes state/actions to children.

components/base/Badge.tsx
    Small badge/tag primitive.

components/field/*
    Shared Ark UI-based form/control primitives. Keep them generic and reusable; page-specific label groups, rows, and mock data belong in page components.

lib/*
    Non-component browser logic with no page-specific knowledge: class merging, stores, event dispatch, error mapping, image zoom/pan.

pages/generate/store.ts, pages/generate/issue.ts
    Generate-page-wide non-component logic: form state and the issue model feeding the issue chip.

pages/generate/components/task/*
    Generate-page-only task list and task item UI.

pages/generate/components/config/*
    Generate-page-only task detail, config field layout, and LoRA stack UI.

pages/generate/components/TaskStatus.tsx
    Generate-page-only status display.
```

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
- hand-written copies of library types or shared schemas
```
