# Conventions

Repo conventions for humans and agents. `architecture.md` describes current
structure and known gaps; `../AGENTS.md` contains implementation constraints.
Keep these documents aligned; label current exceptions rather than inventing
parallel rules.

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

Find the existing definition before writing a type. Library boundaries use the
library's public types; shared REST/event boundaries use inferred Zod output
types. Do not copy those contracts into competing hand-written definitions.
A component may define its own narrow props contract. Shared fields do not make
that independent UI contract an invalid duplicate.

For internal Eden APIs, preserve route-derived types and narrow declared errors
by status. Construct application errors from `(status, code, message)` without
re-parsing typed inputs, successes, or declared error bodies. Preserve domain
error evidence when its consumer needs it.

Transport failures and unexpected response shapes need separate handling. They
are not declared route outcomes. Validate untrusted data at that boundary when
needed; do not widen every internal error to `unknown` to justify parsing again.
ComfyUI responses, imported files, and other external inputs require runtime
validation. Server-only integration schemas stay with their adapter.

In `apps/web/src/api/api.client.ts`, `unwrap` receives the request-inferred
Eden error union and reads declared error fields directly. Its optional mapper
is for domain evidence such as the Workflow mapping `issues`; it does not copy
or re-parse a route union. In `apps/server/src/lib/comfy/comfy.client.ts`,
`readJson` and `parseJson` return `unknown`, and the adapter's local Zod schemas
validate prompt/history HTTP values and WebSocket envelopes before use.
Normal ComfyUI execution lifecycle and node outputs come from validated
ComfyUI WebSocket events. REST `history/:promptId` is queried only to recover a
pending prompt whose socket disconnected; prompt submission, image download,
and history deletion remain REST. This protocol stays inside the backend
Comfy adapter and is not a `packages/event` or shared event contract.
`ComfyClient.execute()` requires `onCompleted` and `onFailed` terminal callbacks
and returns `void`: callbacks are invoked in lifecycle order without awaiting
one another. Callback errors are logged without changing lifecycle state or
recursively dispatching `onFailed`; explicit REST rejection fails, while an
ambiguous submission transport failure continues when matching WebSocket
evidence exists.

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

## Accessibility Scope

Dedicated accessibility support is not part of Silent Pix's product scope.

Rules:

```txt
- do not add repo-owned aria-* attributes
- do not add role or tabIndex solely for assistive technology or keyboard accessibility
- do not add screen-reader-only content, including sr-only labels
- do not add live regions, accessibility-specific copy, dependencies, lint rules, or tests
- keep ordinary interaction behavior and markup required by browser or component APIs
- do not replace Ark UI or remove accessibility behavior generated internally by third-party components solely to enforce this scope
```

The restriction applies to code owned by this repository. Accessibility behavior
inside transitive dependencies is not a supported product feature and does not need
to be removed.

---

## Imports

Use workspace package imports.

Correct:

```ts
import type { TaskApi } from '@silent-pix/shared'

type Status = TaskApi.TaskStatus
```

Wrong:

```ts
import type { TaskApi } from '../../packages/shared/src'
```

Inside `apps/web/src`, use the web source alias:

```ts
import { Button } from '#/components/base/Button'
import { TaskList } from '#/pages/generate/components/task/list/TaskList'
```

Do not use relative imports inside `apps/web/src`:

```ts
import { Button } from '../../../components/base/Button'
```

Rules:

```txt
- no cross-package relative imports
- no relative imports inside `apps/web/src`; use `#/`
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
    Elysia app, middleware, domain routes/services, server env, lifecycle.

apps/desktop
    desktop shell and startup model; `script/dev.ts` owns the Tauri dev URL merge from shared Web endpoint env.

packages/shared
    Canonical domain values/validation under `contract/`; REST under `api/`; events under `event/`.
    Workflow definitions live under `contract/workflow/{resource,graph,config}.ts`.

packages/event
    Generic browser client and type-keyed EventServer transport helpers only; the
    Elysia /api/event adapter belongs in apps/server/src/module/event; domain events belong in shared, and Workflow projections belong in the Workflow module.

packages/db
    SQLite client, Drizzle schema/migrations, maintenance scripts.

packages/env
    Node-only base env and path resolution for server and DB scripts.
```

Do not mix ownership.

### Shared module layout

```txt
packages/shared/src/
    contract/<domain>.ts or contract/<domain>/*
                           canonical reusable values/resources and validation
    api/<domain>...       REST query coercion, params, requests, responses
    api/app.ts            WebSocket handshake query contract (`clientId`)
    event/<domain>.ts     server-to-web envelopes
    index.ts             explicit public catalogs/type exports
```

API and event modules may reference canonical contracts; canonical contracts
must not depend on transport modules. Group by domain, not schema role, and do
not extract fragments merely because two Zod expressions look alike.

Workflow graph, mapping, and resource definitions currently live under
`contract/workflow/{resource,graph,config}.ts`, grouped by domain while keeping
their distinct responsibilities; this layout does not prescribe file splits
for other domains.
Database columns may use a canonical value type when the JSON shape matches
exactly; DB row/storage types remain DB-owned.

REST schemas use explicit `xxxApi` catalogs and types use `XxxApi` namespaces.
Canonical values may be exposed through a consuming API catalog when externally
needed; that exposure does not transfer domain ownership. Avoid duplicate aliases.
Existing `Comfy`/`config` catalogs and flat `ConfigSchema`, `GeneratorField`, and
`Mapping` exports remain explicit compatibility exceptions. Do not add parallel
exports or rename public contracts merely to make every module look alike.

Only externally consumed symbols belong in the public surface. List catalog
members explicitly; do not spread or export-star runtime schemas. Keep schema
and logic sections before inferred types, using the shared comment categories
specified in AGENTS.md.

Source aliases are `#/` except within shared, which uses `#shared/`. The distinct
shared prefix avoids a known collision when tsx applies the entry package's
paths to loaded shared files. Preserve it until an alternative is validated
across development, typechecking, and production package resolution.

---

## Backend Pattern

Use:

```txt
route -> service -> Drizzle -> database
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

Services query Drizzle directly and own transaction/batch boundaries. Do not
add a repository layer. Keep related operations in their domain; split only
for a distinct responsibility or isolated complexity.

Workflow mapping validation is a service invariant. A module-local
`checkMapping()` runs inside `workflowService.create()` and
`workflowService.update()` before any Drizzle write; update performs it before
lookup, archive, and revision checks so an invalid mapping keeps its 422
precedence. The route passes request data to the mutation, maps the service
failure's `issues` to the existing 422 response, and publishes
`workflow.changed` only after the mutation and response load succeed.

The server lifecycle owns a `DatabaseClient` instance named `databaseClient`.
It exposes the Drizzle `Database` as `databaseClient.database`, plus `check`
and `close`; only startup, health, and shutdown use those lifecycle methods.
`databaseMiddleware` injects `databaseClient` into Elysia route context. Domain
routes pass `databaseClient.database` to services, and transaction-compatible
leaf capabilities accept only their precise narrow `Pick<Database, ...>`
capability. Do not use raw SQLite or Drizzle `sql` in server domain code.

Task creation uses the complete `WorkflowModel` returned by
`workflowService.findWorkflow()`, whose existing `castWorkflowModel()` call is
the DB row-to-domain conversion boundary. The task stores that model's `id` and
`revision`, and the same model must flow into generation; generation must not
re-read the current Workflow. This protects the task's recorded revision from a
Workflow update between create and execution. The model is process-local, so
legacy `workflowRevision = 0` rows remain unknown rather than being backfilled.

`taskExecution.generate()` owns task generation's ComfyUI orchestration,
callback wiring, output ingest and rollback, Task status/error mapping, its
generation-only completion transaction, and lifecycle publication. It loads a
canonical snapshot and publishes its lifecycle event directly at the call site.
Keep the dependency one-way:
`task.service.ts` owns resource queries, business operations, startup recovery,
snapshots, and public options and must not import the execution module.
The route launches generation as a detached, untracked Promise. Its
`ComfyClient.execute(): void` call installs lifecycle callbacks, and their
output finalization is likewise detached, untracked, and not drained by
shutdown; tracking and cancellation are not part of this boundary.

At startup, `createApp()` awaits `taskService.failInterruptedTasks()` after
`serverStore.init()` opens SQLite and before the first `ComfyClient.start()`.
The single guarded update changes persisted `queued` and `running` tasks to
`failed` with `errorCode = SERVER_RESTARTED` and an explanatory message. It does
not resume tasks or publish recovery events; clients obtain the durable result
through subsequent REST initial/recovery synchronization. The route-launched
generation Promise and the callbacks started by `execute(): void` remain
untracked, so graceful shutdown does not drain them and late finalization
against a closed DB remains a known unsupported lifecycle case.

An optional model module can own:

```txt
- DB row -> domain model conversion
- domain types and cohesive resource projections
```

A model file is optional. It may parse persisted JSON with a canonical contract
and own cohesive domain conversions, including resource projections when that
is its explicit responsibility. `image.model.ts` currently owns image resource
projection. Keep mappings local or domain-owned; avoid a generic mapper layer.

### Response shaping

The domain service owns response data and query semantics; the route selects
HTTP statuses. Choose the smallest response path that supplies the required
fields:

- Return/project the mutation result when it already contains the response.
- Use a domain `get<X>Response` read when joined or computed fields are needed.
- Share a domain projection when it has the same semantic responsibility across
  callers; do not duplicate it merely because it has only two consumers.

A separate read is not mandatory and does not guarantee an atomic snapshot with
the mutation. Decide which state the response represents when concurrent writes
matter. Related detail/event/mutation projections must stay consistent, but
need not have identical fields. Do not add a generic mapper or repository layer.

---

## API Shape

Success returns the resource itself. No envelope.

```json
{ "id": "...", "name": "...", "status": "done" }
```

The HTTP status carries success or failure. Errors carry a code the client can
branch on:

```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human readable message"
    }
}
```

Declare Zod schemas for request inputs and each supported JSON response status.
Binary image 200 and bodyless 304 responses use native `Response`; document
Content-Type, cache headers, sha256 ETag, and body semantics rather than invent
a JSON envelope/schema for bytes. JSON error responses still use shared schemas.
Do not leak raw internal errors.

### Multipart

A request that may carry a file keeps every other field inside one object.
The following illustrates the transport shape, not the complete validation:

```ts
z.object({
    payload: createTaskPayload,
    referenceImage: z.file().optional(),
})
```

Task create must accept exactly three cases: no reference, stored image id, or
uploaded File. The shared union schema rejects id plus File before the service
boundary. Web sends `name: null`; it does not inherit the source task name.

Eden switches to `FormData` as soon as it sees a `File`, and `FormData` values
are strings. Primitive arrays are appended element by element, so an empty
one appends nothing and the field disappears; `null` and numbers arrive as `"null"` and
`"0"`. A single object is stringified whole, so everything inside it survives.
Only the file belongs at the top level.

With the current Eden/Elysia integration, the JSON-encoded `payload` is parsed
back into an object before the handler sees it. Declare it as one - a
`z.string()` will fail validation, and no manual parsing is needed.

---

## Events

Use `packages/shared/src/event/<module>.ts` for server-to-web event contracts and `packages/event` for generic WebSocket transport helpers. The Elysia `/api/event` adapter belongs to `apps/server/src/module/event`; Workflow projections remain in the Workflow domain.

### REST is the source of truth; the socket syncs everyone else

A mutation applies its own outcome from the HTTP response. It never waits for
the event to travel back, because a socket that is down while HTTP still works
is a state this app models — under the naive design the server would succeed and
the UI would sit frozen.

So both paths exist and both run:

```ts
// the acting client, from the response it already has
onSuccess: result => applyTasksRemoved(queryClient, [result.id])

// every other client, from the broadcast
case 'task.removed': applyTasksRemoved(queryClient, event.taskIds)
```

They call the same function, and that function is written to be idempotent —
clearing absent cache entries is a no-op, and filtering a list that lacks the
item returns it unchanged.

This does not make the socket optional. It carries what no response can: a task
moving through queued, running and done long after the POST returned. That is
new information rather than the echo of an action, and replacing a poll with it
is the point of having a socket at all. The distinction is the rule — if the
acting client could already know, do not make it wait to be told.

Rules:

```txt
- aggregate outbound events through `event.serverEvent`
- server validates every outbound event before broadcast
- the WebSocket handshake query contract (`clientId`) lives in `packages/shared/src/api/app.ts`; event envelopes remain under `packages/shared/src/event`
- the Web API client module (`apps/web/src/api/api.client.ts`) exports one per-page UUID `clientId`; its shared fetcher supplies it as `client-id`, while App uses it for the WebSocket `clientId` query, and identity is transport metadata only
- WebSocket handshakes require `Origin` and `Host`; Server safely parses `Origin` and strictly compares parsed `Origin.host` (including port) with `Host` before upgrade
- the connection registry remains keyed by `ws.raw`; every synchronous Task/Workflow mutation publication excludes all records matching its validated request `clientId`, while async task lifecycle and health publications remain broadcast
- Cloudflare Tunnel configuration must leave `httpHostHeader` unset so the external host remains available for same-origin validation
- browser connection helpers live in `packages/event/src/client.ts`
- Node WebSocket server helpers live in `packages/event/src/server.ts`; the functional Elysia `/api/event` route plugin in `apps/server/src/module/event/event.route.ts` uses the parent app's `@elysiajs/node` `node()` adapter, and the reused Workflow projection lives in `apps/server/src/module/workflow/workflow.model.ts`
- `apps/web/src/features/event/event.client.ts` owns URL/client identity, connection lifecycle, shared-schema parsing, reconnect recovery, and exhaustive aggregate dispatch; domain cache handlers remain in their existing feature `*.event.ts` files
- `appApi.clientHeaders` is the single shared REST identity schema. Event-producing synchronous routes use it before their handlers: Task create → `task.created`, rename/flags → `task.changed`, batch/single delete → `task.removed`, Workflow create/update/archive → `workflow.changed`, and Workflow true delete → `workflow.removed`; each excludes all matching `clientId` records. Actor caches use REST responses, remote caches use events, and async task lifecycle/health remain unfiltered broadcasts.
- an event carries the fields needed for its supported cache updates; incomplete projections use invalidation
- patch when the payload determines the result; otherwise invalidate affected queries
- database membership/collation/search semantics stay server-owned; invalidate when fields cannot decide membership. Workflow list ordering is the precise exception in which Server and Web use the same `name` then `id` keys: Server declares SQLite ordering, while Web's realtime cache uses a file-local JavaScript ordinal comparator. Unicode edge ordering may differ between realtime upserts and a later refetch; this does not loosen server ownership of membership, collation, or `LIKE` semantics in other domains.
- consider dependent domains: task changes can affect Image queries as well as Task queries
- for a Workflow detail, invalidate when its summary shows it is behind; the event has no graph
- a mutation applies its own result in `onSuccess`; never rely on the round trip
- the event handler and the mutation share one idempotent function per outcome
- reconnecting invalidates what went stale while the socket was gone
- application events must not exist purely for transport; a heartbeat must carry user-visible state
- `health.snapshot` doubles as the liveness signal; the client treats silence of *valid* events as connection loss
- the client must validate every inbound event; an event that fails validation is not evidence the connection is alive
- the heartbeat interval lives in `packages/shared`; both sides derive their timers from it
- when the connection is lost the client must treat health as unknown, never reuse the last snapshot
- no DB or Elysia imports in shared event contracts or generic transport helpers
- validated WebSocket snapshots update query caches directly; REST `/health` remains for bootstrap and external checks
- the acting client applies its HTTP outcome immediately; other clients receive the same change through events
- asynchronous lifecycle changes also arrive through events; SQLite/REST remain the recovery source
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
- shared detail-panel primitives go in `apps/web/src/components/detail`
- shared class recipes live in `apps/web/src/lib/theme.ts` beside `cn.ts`; tokens stay in `styles.css`
- theme runtime is owned by `apps/web/src/store/theme.ts`; the startup bootstrap sets `data-theme` before first paint
- `Button` variants describe visual weight (`ghost`, `soft`, `solid`); tones describe semantic color (`neutral`, `accent`, `danger`)
- inline image stages follow the theme; the full-screen viewer backdrop and glass controls stay fixed in both themes, and content drawn directly on a stage uses `stage-fg`
- Prompt and Graph editor themes come from factories and per-view Compartments; theme changes must not rebuild views or lose history
- app-level chrome such as `Header` lives in `apps/web/src/components` and is used from `App.tsx`
- page-specific components go in `apps/web/src/pages/<page>/components`
- component-specific non-component logic may live beside its component, including editor documents, commands, and decorations
- page-wide logic sits at the page root; keep narrow single-consumer logic with its owner
- move browser utilities to `lib` for a clear shared responsibility, not merely because they could be generic
- generate task-list components live in `apps/web/src/pages/generate/components/task`
- Generate-specific detail/config adapters live in `pages/generate/components/config`; cross-page task detail UI lives in `components/task/detail`
- page components should not own app-level header layout
- generate page mock data may exist only as UI placeholder data
- mock UI data must not become backend state or task lifecycle authority
- web state uses Solid native stores through `apps/web/src/lib/store.ts`
- store consumers read native Solid store proxies directly from `store.state`
- domain actions may be flattened onto returned stores but must not live inside reactive state
- Generate and Workflow page editor state uses page-scoped TanStack Form through context
- Form validators are pure submit-boundary Zod checks; invalid issues flow through the page's existing issue pipeline
- Solid stores own UI/query lifecycle state only, not duplicated form values
- Form-level reactive state uses `form.useSelector()` or `<form.Subscribe>`; direct `form.state` reads are imperative snapshots only
- Do not add a generic form abstraction
- prefer `classes`/named class slots for reusable components when one `class` string is too vague
- composition vs configuration: children whose structure varies take `children`; components where only values vary take props
- choose composition when consumers vary structure; slot/consumer counts are not fixed refactor thresholds
```

### Composition or configuration

Ark UI already ships compound components. A wrapper over one exists to
**narrow** that API, not to republish it, so wrapping `Select` in five named
parts buys nothing and lets every call site drift.

Decide per component by asking what varies:

```txt
structure of the children varies  → composition (children / render prop / sub-components)
only values vary                  → configuration (flat props + classes slots)
```

Applied to what exists today:

```txt
field/Select, field/Number, field/Slider   values only          → configuration
base/Dialog                                body differs per use → children + footer
base/Panel                                 collapsed swaps all  → render prop
detail/*                                   rows/groups/grids    → composition
```

Review a configuration component when its props obscure the relationship
between inputs and layout. Use composition when consumer structures actually
differ. A single-consumer prop or several class slots can be appropriate; no
fixed number of slots or consumers triggers or blocks a refactor.

Dot-notation namespaces (`Detail.Row`) are export ergonomics, not composition.
Flat named exports through a folder barrel are the default; introduce a
namespace only once the parts also share context.

Current component roles:

```txt
components/Header.tsx
    App-level header with an icon-only theme toggle beside service status.

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

components/base/Dialog.tsx
    Modal primitive. Takes children and footer so each caller composes its own body.

components/base/IssueChip.tsx
    Shared issue popover chip. Consumers pass `AppIssue[]` from `lib/issue.ts`.

components/detail/*
    Detail-panel composition primitives: DetailTitle, DetailSection, DetailGroup,
    DetailRow, DetailLabel. Every detail panel is built from these so labels,
    section spacing, and title hierarchy match across pages.

components/field/*
    Shared form/control primitives. Keep domain label groups and rows in their page or shared domain component, not in generic fields.

lib/*
    Non-component browser logic with no page-specific knowledge: class merging, stores, error mapping, image zoom/pan.
    lib/theme.ts is the exception that is not logic: shared class recipes such as the disabled field look. styles.css owns the tokens;
    theme.ts owns which tokens combine into a role, so components do not each keep a copy.

pages/generate/form.ts, pages/generate/store.ts, pages/generate/issue.ts
    Generate-page-wide form/controller logic and the issue model feeding the issue chip.

pages/workflow/form.ts, pages/workflow/store.ts, pages/workflow/issue.ts
    Workflow-page-wide form/controller logic and the issue model feeding the issue chip.

pages/generate/components/task/*
    Generate-page-only task list and task item UI.

pages/generate/components/config/*
    Generate-specific form/query adapters for shared task detail UI.

components/task/detail/*
    Task detail/config/LoRA UI shared by Generate and Compare.

components/task/TaskStatus.tsx
    Shared task status display.
```

---

## Env

Development configuration example (replace absolute path placeholders):

```env
NODE_ENV=development

SERVER_HOST=127.0.0.1
SERVER_PORT=3070
WEB_HOST=127.0.0.1
WEB_PORT=5173

COMFYUI_BASE_URL=http://127.0.0.1:8188
COMFYUI_STORAGE_PREFIX=/absolute/path/as-seen-by-comfyui/storage
COMFYUI_OUTPUT_DIR=/absolute/path/as-seen-by-server/comfyui/output

APP_DATA_DIR=./.local/data
DATABASE_PATH=./.local/data/silent-pix.sqlite
APP_STORAGE_DIR=./.local/data/storage
```

Rules:

```txt
- COMFYUI_BASE_URL is backend-only
- frontend env must not expose ComfyUI connection/storage configuration
- COMFYUI_STORAGE_PREFIX points to APP_STORAGE_DIR as seen by ComfyUI
- COMFYUI_OUTPUT_DIR points to ComfyUI output as seen by the server
- DATABASE_PATH and APP_STORAGE_DIR are configured independently; APP_DATA_DIR does not derive them
- production must supply OS app-data paths; automatic Desktop production path overrides are not implemented
- do not assume cwd is repo root
- env is the only runtime configuration override channel
- the capability that owns the side effect loads its env-backed value directly
- project-owned APIs do not receive env-backed values as arguments or options
- isolated validation sets env before importing the owning module
- the repository-root `.env` is the sole development endpoint source for Browser Vite and Desktop Tauri
- `apps/web/vite.config.ts` explicitly loads the repository-root `.env` with `loadEnv()`; external process env values override it
- `apps/desktop/script/dev.ts` runs from the local Desktop cwd, resolves the linked `tauri.conf.json` realpath to load the source repository root `.env`, validates `WEB_HOST`/`WEB_PORT`, and merges their combined endpoint into Tauri at runtime; process env overrides dotenv, `--external-frontend` only removes the normal `beforeDevCommand`, and linked WSL does not require duplicate Windows endpoint variables
- package scripts, `tauri.conf.json`, and `dev-wsl.bat` must not duplicate development host/port literals or promise simultaneous independent Vite instances
- the Desktop webview disables Tauri's native drag/drop handler so shared HTML5 file drop remains available, including on Windows WebView2
- `SERVER_URL` is an optional process-environment override for the Vite `/api` proxy and is not required in `.env.example`
- packaged Desktop remote connectivity and authentication are not implemented; Windows native runtime behavior is not verified from this Linux workspace
```

Ownership mapping:

| Env-backed value | Direct owner | Project-owned API shape |
|---|---|---|
| `DATABASE_PATH` | `packages/db/src/client.ts` | `createDatabaseClient()` |
| `SERVER_HOST`, `SERVER_PORT` | server/CLI entrypoint that binds or probes HTTP | no reusable server-address option |
| `WEB_HOST`, `WEB_PORT` | `apps/web/vite.config.ts`, `apps/desktop/script/dev.ts` | Browser/Desktop Vite and Tauri `--config` merge use the same explicitly loaded root env |
| `SERVER_URL`, `SERVER_HOST`, `SERVER_PORT` | `apps/web/vite.config.ts`, server/CLI entrypoint | optional proxy override or server bind/probe configuration |
| `COMFYUI_BASE_URL` | `ComfyClient` | `new ComfyClient()` |
| `APP_STORAGE_DIR` | image store; GC owns only its directory sweep | `readContent(path)`, `writeContent(path, bytes)`, `unlinkContent(path)` |
| `COMFYUI_STORAGE_PREFIX` | reference-path conversion owner | conversion accepts only the relative image path |
| `COMFYUI_OUTPUT_DIR` | Comfy output cleanup owner | cleanup accepts only the `ComfyImage` |

```ts
// Project-owned capability: canonical config is internal.
export async function createDatabaseClient() {
    const { databasePath } = loadConfig()
    return createClient({ url: `file:${databasePath}` })
}

await createDatabaseClient()

// Do not create a second config channel.
await createDatabaseClient(config.databasePath)
await imageGarbageCollection.collect(database, { storageRoot: config.appStorageDir })
```

Passing config to a third-party API is required at the owner boundary and is
allowed:

```ts
const config = loadConfig()
app.listen({ hostname: config.serverHost, port: config.serverPort })
```

Keep non-config inputs explicit. `Database`, IDs, relative paths, request
payloads, GC `graceMs`, and an injected `now` value describe an operation; they
are not alternative env sources. The lifecycle `DatabaseClient` is owned by
`databaseClient` at startup, health, and shutdown boundaries.

---

## Database

Use SQLite + Drizzle.

Rules:

```txt
- migrations for schema changes
- services query Drizzle directly; there is no repository layer
- server queries use typed Drizzle query builders, operators, and subqueries; do not use raw SQL or Drizzle's `sql` tagged template in `apps/server`
- transactions or atomic statement batches for multi-write consistency
- no image binary in DB
- no Prisma
- no PostgreSQL
- no Redis in base architecture
```

---

## File Storage

Filesystem stores image bytes, addressed by content hash. Nothing else.

```txt
storage/images/<sha256>.<png|jpg>
```

SQLite splits it in two, because content and ownership are different facts:

```txt
images        id, hash (UNIQUE), relative path, mime, width, height, size bytes, created at
task_images   id, task id, image id, type, sort index, created at
```

Rules:

```txt
- store image paths relative to APP_STORAGE_DIR
- the same bytes are stored once, whoever they came from
- an image row and its file are deleted only when the last reference is gone
- the database commits before the filesystem unlinks, never the reverse
- image metadata is sniffed from the bytes, never trusted from the client
- coordinate ingest/reference/delete/GC so cleanup cannot unlink newly referenced or republished content
- DB foreign keys and commit-before-unlink do not by themselves protect filesystem concurrency
- server mutations share the image-domain async mutex from lookup/ingest through reference commit or cleanup unlink
- callers own the complete lock boundary; image mutation helpers do not acquire it again
- `imageCleanup.removeUnreferenced()` owns deduplication, 500-ID chunks, guarded `DELETE ... NOT EXISTS(task_images) RETURNING id/path`, and per-item unlink outcomes; task cleanup and GC reuse its result
- ComfyUI execution/downloads stay outside the image lock
- task output completion holds the image lock only through ingest/reference commit/orphan rollback; controller snapshot/event publication precedes successful Comfy output unlink
- online GC is owned by the server image domain and runs through `withImageMutation`; `pnpm image:gc` only triggers `POST /api/image/garbage-collection`
- the supported deployment has one server writer for each database/storage pair; sharing either with another writer is unsupported
- `pnpm image:gc:offline -- --confirm-server-stopped` is explicit stopped-server recovery; normal GC never falls back to direct cleanup
- image cleanup and GC filesystem sweeps use canonical `config.appStorageDir`; GC has no storage-root override
```

`images` knows nothing about tasks. `task_images` carries what a task does with a
picture - the role and the position in a batch - which is why the same file can
be one task's output and another's input without being copied.

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
<domain>.route.ts
<domain>.service.ts
<domain>.model.ts       when cohesive conversions/types need a separate owner
<domain>.event.ts
<domain>.query.ts
<domain>.cache.ts       when cache behavior warrants separation
<domain>.key.ts         when query/cache/event consumers share keys
<integration>.client.ts
```

These are naming patterns, not a checklist of files to create. Keep short,
single-use schemas, types, and helpers local. Split by responsibility rather
than line count; avoid speculative layers and generic dumping grounds.

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
