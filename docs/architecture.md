# Architecture

Silent Pix is a local-first desktop/web app. The backend owns task state, persistence, and ComfyUI communication.

This document describes current architecture and explicitly labels known gaps.
Implementation constraints live in `../AGENTS.md`; detailed conventions live in
`conventions.md`. Keep all three aligned.

---

## Source of Truth

```txt
SQLite     = durable state and metadata
Filesystem = image bytes, addressed by content hash
Memory     = active runtime state only
REST       = actions and queries
Realtime   = validated cache-update snapshots
Frontend   = UI/form state and caches of backend data; no durable authority
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
    App.tsx                 app shell, Header composition, event feature lifecycle hook
    api/                    Eden REST wrappers
    features/<domain>/      Query hooks, keys, cache updates, event handling
    components/
        Header.tsx          app-level header
        base/               shared low-level primitives
        field/              shared form/control primitives
        detail/             shared detail-panel composition
        task/               shared TaskStatus and task detail UI
        image/, viewer/     shared image picker and viewing UI
    pages/generate/         generation form, task list/browser, page adapters
    pages/workflow/         graph/mapping editor and Workflow management
    pages/compare/          image comparison workspace
    store/                  shared UI choices and connection state
    lib/                    shared browser utilities
```

Source imports use `#/`; see `conventions.md` for the shared-package exception.
Component-specific editor logic may stay beside the component. Temporary working
assets belong in repo-root `temp/`, not a required Web source folder.

Eden wrappers in `apps/web/src/api` keep each route's inferred success and
declared error types. `unwrap` maps declared `{ status, value.error }` bodies
directly to `ApiError`; transport failures and malformed runtime values remain
separate fallbacks. Workflow mutation mapping errors retain their `issues`
evidence for the page's existing issue projection.

Generate uses real Task APIs, TanStack Query for server data, and page-scoped
TanStack Form for editable values. The default draft supplies initial form
values; it is not a backend task. Task lifecycle authority stays in the server.

Web state:

```txt
- apps/web uses Solid native stores through `apps/web/src/lib/store.ts`
- the local store wrapper exposes `state`, `set`, `reconcile`, `produce`, and optional flattened actions
- domain actions live on returned store objects, not inside reactive state
- stores must preserve Solid fine-grained reactivity and native `set` path syntax
```

Theme runtime:

```txt
- Theme is `light | dark`; missing or invalid values default to dark
- `apps/web/index.html` synchronously reads `silent-pix.theme` before first paint and sets `data-theme`
- `apps/web/src/store/theme.ts` owns runtime theme state, DOM updates, and best-effort localStorage persistence
- Header exposes an icon-only toggle beside service status
- `styles.css` owns token values and mappings; `lib/theme.ts` owns reusable class recipes
- inline ImageStage follows theme (near-black in dark, near-white in light; the empty state moves one step toward canvas)
- the full-screen viewer backdrop and every glass control stay fixed transparent black with white icons in both themes; content drawn directly on a stage uses `stage-fg`
- Prompt and Graph editors use theme factories with per-view Compartments; reconfiguration does not rebuild views or lose history
```

Workflow list ordering is a precise exception to the general backend-owned
database semantics rule. Server and Web use the same `name` then opaque `id`
keys: the Server query declares SQLite ordering, while the Web realtime cache
uses a file-local JavaScript ordinal comparator. It removes any cached summary
with the same ID, appends the incoming summary, and sorts a new options array
after save, archive, or `workflow.changed` without mutating the existing cache
array. Unicode edge ordering may differ between a realtime upsert and a later
refetch; membership, collation, and `LIKE` semantics for other domains remain
server-owned.

---

### `apps/server`

Owns the backend entrypoint and domain services under `src/module/<domain>`.
Domain services own their domain queries, business rules, and lifecycle
operations. Within the task domain, `taskExecution` is a sibling to
`taskService` that owns generation orchestration and its generation-only
completion transaction; this is a cohesive task-domain split, not a generic
new layer.

Allowed:

```txt
- Elysia app
- REST routes
- config/env
- server lifecycle
- local WebSocket event endpoint
- calling services/use-cases
```

Forbidden:

```txt
- large domain logic inside routes
- direct DB queries inside routes
- UI logic
```

Preferred flow:

```txt
route -> service -> Drizzle -> SQLite
```

Realtime ownership is split by boundary:

```txt
packages/event/src/server.ts
    generic EventServer: key/clientId/socket records, parser injection, validated publish/send with optional clientId exclusion
apps/server/src/module/event/event.route.ts
    Functional Elysia /api/event route plugin; parent app supplies @elysiajs/node node(), Origin/Host handshake, query validation, open/close hooks
apps/server/src/module/workflow/workflow.model.ts
    Reused WorkflowModel -> WorkflowSummary projection
apps/server/src/app.store.ts
    long-lived EventServer and type-keyed publishEvent alias
apps/server/src/module/app/app.health.ts
    health snapshot payload and timer/initial-send composition
```

Synchronous REST mutations use one shared header contract and route-owned
publication metadata:

| Mutation | Header schema | Event | Recipients |
|---|---|---|---|
| Task create | `appApi.clientHeaders` | `task.created` | all except matching `clientId` |
| Task rename / flags | `appApi.clientHeaders` | `task.changed` per snapshot | all except matching `clientId` |
| Task batch / single delete | `appApi.clientHeaders` | one `task.removed` | all except matching `clientId` |
| Workflow create / update / archive | `appApi.clientHeaders` | `workflow.changed` | all except matching `clientId` |
| Workflow true delete | `appApi.clientHeaders` | `workflow.removed` | all except matching `clientId` |

The actor applies the REST response and remote clients apply the event. Missing
or invalid headers fail before the mutation handler and cannot publish. Empty
batch deletion publishes nothing. Async task lifecycle and health events do
not pass routing options and still reach every connected socket.

Elysia database context follows the same boundary:

```txt
databaseMiddleware
    └ databaseClient: DatabaseClient

route
    ├ domain -> service(databaseClient.database, ...)
    └ health -> databaseClient.check()
```

Domain services query `Database` directly and own transaction/batch boundaries.

Workflow mutation ownership is explicit:

```txt
POST/PUT /workflow
    └ workflowService.create/update
       ├ mapping invalid → service failure with issues; no write or event
       └ success → load response → publish workflow.changed → return HTTP response
```

`update()` validates mapping before lookup, archive, or revision checks, so its
422 mapping failure precedence remains stable. The route owns only HTTP status
selection and the existing mapping-error response shape.

Transaction-compatible leaf capabilities accept only their precise narrow
`Pick<Database, ...>` capability. The server does not add a repository layer or
use raw SQLite/Drizzle `sql` outside the database client.

---

### `apps/desktop`

Owns desktop shell only.

Current implementation is a Tauri window hosting the Web UI. Development uses
the Vite API/WS proxy; the shell does not start the backend or ComfyUI.
Tauri's native drag/drop handler is disabled so the shared Web UI receives
HTML5 file-drop events, including reference-image drops on Windows WebView2.

The repository-root `.env` is the shared development endpoint source:
`WEB_HOST` and `WEB_PORT` configure Browser Vite, Desktop Vite desktop mode,
and Tauri's development URL. `apps/desktop/script/dev.ts` validates and
combines those values before injecting the endpoint through a Tauri `--config`
merge. The normal Tauri `beforeDevCommand` remains in `tauri.conf.json`; WSL
linked development uses the wrapper's `--external-frontend` override instead
of generating a second config file. The wrapper runs from the local Desktop
cwd but resolves the linked `tauri.conf.json` realpath to find the WSL source
repository `.env`; duplicate Windows endpoint variables are not required. This
setup does not promise simultaneous independent Vite instances.

OS app-data resolution, backend startup/selection, and packaged remote
connectivity/authentication remain future work. See `../apps/desktop/README.md`.

Forbidden:

```txt
- task lifecycle
- DB schema
- ComfyUI workflow logic
```

Desktop mode is a first-class target.

---

### `packages/shared`

Owns canonical domain values and shared validation used by REST and WebSocket
contracts, plus the transport contracts themselves. Domain definitions belong
under `src/contract`; REST under `src/api`; events under `src/event`.

Workflow canonical definitions are grouped under
`src/contract/workflow/{resource,graph,config}.ts`. The Workflow editor option
projection belongs to `apps/web/src/pages/workflow/node-option.ts`, where
`toNodeOptions()` owns the Web-only view model and uses the shared
`comfy.isGraphLink()` predicate.

Event contracts live under `packages/shared/src/event/<module>.ts`, divided by domain module. The aggregate `event.serverEvent` schema is the runtime source of truth for outbound server events.

Allowed:

```txt
- canonical domain values and pure shared validation
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
- Elysia logic
```

---

### `packages/event`

Owns generic WebSocket transport helpers only.

Allowed:

```txt
- browser WebSocket client helper with JSON decoding and reconnect lifecycle
- Node WebSocket server helper with typed connection records and JSON broadcast
```

`createEventServer()` is generic over client identity and the aggregate event
union. The caller injects `parseEvent`; the package does not import Zod, Shared,
or Elysia. `connect()` records `{ key, clientId, socket }`, while `publish()`
and `send()` derive the payload from the event type and validate the assembled
envelope once before serializing it. `publish()` may exclude every matching
`clientId` record; `send()` remains point-to-point and ignores routing options.

Forbidden:

```txt
- DB access
- Elysia routes
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
- DB init helpers
- maintenance scripts (migrate, seed, reset)
```

Forbidden:

```txt
- Elysia routes
- UI code
- ComfyUI client
- desktop shell code
```

---

### `packages/env`

Owns Node-only base env loading and repo-relative path resolution shared by the
server and DB scripts. Server-specific ComfyUI/HTTP config remains in
`apps/server/src/config.ts`. Web must not import this package.

Configuration has one runtime path:

```text
process.env / .env
  └─ packages/env base config
      ├─ packages/db config ──→ database client ──→ LibSQL
      └─ apps/server config
          ├─ server entrypoint ──→ Elysia listen
          ├─ ComfyClient ────────→ ComfyUI HTTP/WebSocket
          ├─ image store ────────→ Silent Pix storage filesystem
          └─ Comfy path/output ──→ ComfyUI-visible filesystems
```

The capability that owns the side effect loads its env-backed value directly.
Project-owned constructors and helpers do not accept database paths, base URLs,
storage roots, or ComfyUI filesystem roots from callers. This prevents a second
configuration channel from disagreeing with the canonical env value.

Resolved values still cross into third-party calls at the owning boundary—for
example Elysia `listen`, LibSQL `createClient`, and Drizzle migration options.
The server lifecycle owns a `DatabaseClient` instance named `databaseClient`;
its `database` property is the Drizzle `Database`, while `check` and `close`
remain lifecycle capabilities. Domain/dependency inputs such as `Database`,
image ID, relative image path, GC grace period, or clock value are not env
configuration and remain explicit arguments.

Isolated validation changes configuration through process env before importing
the owning module; runtime option objects do not provide config overrides.

---

## Backend

Use:

```txt
Elysia on Node.js
```

Do not introduce:

```txt
- Encore.ts
- NestJS
- tRPC
- Bun as required runtime
```

Routes must stay thin. Domain logic belongs in services.

Current task generation starts when the create route launches
`taskExecution.generate()` as a detached, untracked Promise. Its preflight
installs callbacks through `ComfyClient.execute(): void`; Comfy lifecycle and
output finalization continue as detached, untracked callbacks. Shutdown does
not await this work before closing the DB; this detached-generation lifecycle
gap remains unsupported. On startup, after the DB is opened and before the
first ComfyUI start, `createApp()` awaits
`taskService.failInterruptedTasks()`, which changes persisted `queued` and
`running` tasks to `failed` with `errorCode = SERVER_RESTARTED`. Recovery does
not resume generation or publish events before clients connect; clients obtain
the recovered task state through subsequent REST initial/recovery
synchronization. This startup operation is the recovery guarantee, not
shutdown draining.

Task creation reads one Workflow through `workflowService.findWorkflow()`, which
already converts the DB row to the complete `WorkflowModel` with
`castWorkflowModel()`. The insert records that model's `id` and `revision`, and
the create route passes the same model to the background generation call, so an
update to the Workflow after creation cannot change the prompt for that task.
This model remains in process memory only; legacy tasks with
`workflowRevision = 0` remain an unknown revision and are not backfilled.

`taskExecution.generate()` owns the ComfyUI flow it starts, including prompt
construction, callback installation, output ingestion and its completion
transaction, failure mutation, canonical snapshots, event publication, and
ComfyUI cleanup. `ComfyClient.execute(): void` leaves the lifecycle callbacks
and output finalization untracked; the route and client do not provide
execution tracking, cancellation, or shutdown draining. It may call
`taskService` for task reads and writes; `task.service.ts` does not import the
execution module. Resource queries, startup recovery, snapshots, and public
option methods remain owned by `task.service.ts`.

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

The database client shape is:

```ts
type DatabaseClient = {
    database: Database
    check: () => Promise<boolean>
    close: () => void
}
```

The database client explicitly initializes:

```sql
PRAGMA foreign_keys = ON;
```

It does not explicitly configure WAL or `busy_timeout`. Any future policy for
those settings belongs in the database client and requires runtime validation.

---

## Storage

Images are content-addressed. One file per distinct sha256, no matter how many
tasks reference it.

```txt
storage/
    images/
        <sha256>.<png|jpg>
```

Rules:

- The DB stores the relative path (`images/ab12….png`), never an absolute one.
- Files are published with temp + rename. Readers trust the content address
  absolutely, so a half-written file is a permanently poisoned entry, not a
  retryable failure.
- The mime type comes from sniffing the bytes. Never from the client's
  `Content-Type` and never from a filename.
- Stored JPEG width/height account for EXIF orientations that swap axes. Bytes
  are not transcoded; agreement with browser and ComfyUI decoding must be
  checked with orientation-bearing images.

Ownership lives in `task_images`, a join carrying the role (`input` / `output`,
with `mask` / `control` reserved) and the batch position:

- `images.hash` is UNIQUE. That index, not application code, is what enforces
  "the same image is never stored twice".
- `task_images.image_id` is `ON DELETE RESTRICT`, protecting referenced image
  rows from deletion. This does not protect filesystem operations.
- An image row and its file are deleted only when the last reference is gone.
- The database commits before the filesystem unlinks. An unlink failure may
  leave an orphan file for the server-owned image garbage collection route.
  This ordering alone does not make deletion safe against concurrent ingest or
  reference creation.
- `imageCleanup.removeUnreferenced()` is the shared guarded row-delete and
  unlink capability. It deduplicates/chunks candidate IDs, rechecks
  `NOT EXISTS(task_images)`, returns each `DELETE RETURNING id/path` row with
  its unlink outcome, and is called by task cleanup and GC while the caller
  owns the image mutation lock.
- Required invariant: cleanup must not unlink content another operation has
  referenced or republished. Within one server process, the image-domain
  `withImageMutation` mutex serializes lookup/ingest through reference commit
  and orphan deletion through unlink. ComfyUI execution/downloads stay outside
  this lock; read-only requests do not acquire it.
- Task output completion keeps image download outside the lock and holds the
  lock only for ingest, output-reference commit, and orphan rollback. The
  committed completion snapshot/event is published before successful Comfy
  output unlink; skipped tasks leave those Comfy outputs for the existing
  history/cleanup semantics.
- Online image garbage collection runs in the server image domain under the
  same mutex and applies its grace period to orphan rows, recognized stray
  files, and recognized temporary writes. The normal `pnpm image:gc` command is
  only an HTTP trigger; it never opens the database or storage and never falls
  back when the server is unavailable.
- Runtime image cleanup and GC filesystem sweeps resolve from canonical
  `config.appStorageDir`; the offline recovery command has no storage-root
  override.
- The mutex is process-local. The supported deployment has one server writer
  per database/storage pair; a second server or writer sharing either is
  unsupported. `pnpm image:gc:offline -- --confirm-server-stopped` is an
  explicit stopped-server recovery command and still requires the operator to
  confirm that all writers have stopped.

Production data must live in an OS app-data directory. Dev data may use
`./.local/data`. Paths are configurable today; automatic Desktop production
path overrides are not implemented.

---

## REST and Realtime

REST:

```txt
- return authoritative backend state
- expose health, Task list/detail/create/rename/delete/flags/options, Image list/bytes, and Workflow management
```

Task create uses a shared no-upload/upload union at the HTTP boundary:

| Request variant | `payload.referenceImageId` | Top-level `referenceImage` |
| --- | --- | --- |
| txt2img | omitted or `null` | absent |
| stored image img2img | UUID | absent |
| uploaded image img2img | omitted or `null` | `File` |

UUID plus `File` is rejected by schema validation before `taskService.create()`;
an omitted `referenceImageId` becomes `null` after validation. The payload/File
transport positions remain unchanged for Eden multipart.

WebSocket foundation:

```txt
- endpoint: GET /api/event
- same-origin Web client; development proxy can target a configured remote server
- The Web API client module (`apps/web/src/api/api.client.ts`) exports one module-load UUID `clientId` per page; App puts it in the `clientId` query
- server validates `clientId`, requires `Origin` and `Host`, and strictly compares parsed `Origin.host` (including port) with `Host` before upgrade; `ws.data.query.clientId` is passed to the generic EventServer, while `ws.raw` remains the connection key
- the shared Web API client fetcher sends the exported `clientId` as the `client-id` header; every event-producing synchronous Task/Workflow route validates `appApi.clientHeaders`
- a Cloudflare Tunnel must leave `httpHostHeader` unset so the external host remains available for same-origin validation
- authentication is not implemented
- client identity is transport metadata only; synchronous Task/Workflow route publications exclude every matching `clientId` record, while async task lifecycle and health publications remain broadcasts
- server events only
- current events: `task.created`, `task.changed`, `task.removed`,
  `workflow.changed`, `workflow.removed`, and `health.snapshot`
- the server adapter passes type-keyed payloads to EventServer; its injected `event.serverEvent.parse()` validates every assembled event before broadcast or initial point-to-point send
- connection state comes from WebSocket open, close, and reconnect lifecycle callbacks
```

Image byte responses use native `Response`:

| Status | Body | Headers / condition |
| --- | --- | --- |
| 200 | Stored PNG/JPEG bytes | Sniffed Content-Type, Content-Length, quoted sha256 ETag, `Cache-Control: public, max-age=31536000, immutable` |
| 304 | No body | Matching `If-None-Match`; cache metadata headers |
| 404 | Shared JSON error | Image row or file not found |

Realtime is not durable; SQLite remains authoritative and REST restores missed state.

Current frontend event usage:

```txt
- `apps/web/src/features/event/event.client.ts` owns URL/client identity, browser connection lifecycle, shared-schema parsing, connection status, reconnect recovery, and exhaustive `Event.ServerEvent` dispatch
- `App.tsx` only starts and cleans up `startServerEvents(queryClient)`
- a successful `POST /api/task` response seeds the local feed and detail caches before task selection
- `task.created` inserts feed entries; `task.changed` patches feed/detail; `task.removed` carries `taskIds`
- Workflow events update summaries and invalidate detail when its payload is insufficient
- a WebSocket reconnection invalidates task, image, and workflow queries to recover missed events
- Header displays connection and service health
- generate task UI initializes from REST and applies server-validated realtime snapshots
```

---

Image list queries are server-owned projections. Task created/changed/removed
events and successful local task create/rename/flag/delete mutations invalidate
`imageKeys.lists()`; active lists refetch and inactive lists become stale for
the next open. WebSocket reconnect uses `invalidateImageLists()` to invalidate
`imageKeys.lists()`, alongside the task and workflow roots, to recover missed
events. The server recomputes image search membership, task-flag filtering,
origin metadata, and earliest use.

Task detail snapshots project `name`, `status`, `pin`, `discard`, and `images`
with referential equality when all projected values are unchanged. Generate
coordinates the Query-owned task detail with its page-scoped TanStack Form:
changing task identity loads the full task, while a same-task server rename only
updates the form `name` when it still equals the previous server name (`null`
maps to the form boundary value `''`). Local Name, prompt, and config edits are
preserved.

Compare selections are frontend-owned UI state: local rename responses and
remote `task.changed` events patch `origin.taskName` for matching selected
origins. Replaying the same name returns the existing Compare array and entry
references. This narrow UI-state patch is separate from Image list invalidation.

## ComfyUI Boundary

Only backend talks to ComfyUI.

Frontend must not connect to ComfyUI or know its server connection config or
execution protocol. Workflow UI may read and edit the shared API graph format,
node IDs, and mappings through Silent Pix APIs.

Backend translates Silent Pix tasks into ComfyUI execution.

`ComfyClient` uses the ComfyUI WebSocket as the normal execution source and
dispatches terminal lifecycle through required `onCompleted`/`onFailed`
callbacks. Its `execute()` returns `void`: callbacks are invoked in lifecycle
order without awaiting one another, while callback throws/rejections are
logged and never reclassified as another Comfy failure. REST prompt submission
is the acceptance boundary; an ambiguous submission transport failure is
accepted only when the matching WebSocket has already supplied execution
evidence.

```txt
POST /prompt (REST)
    -> execution_start / executed / execution_success (ComfyUI WebSocket)
    -> task lifecycle and output result
    -> GET /view (REST) for image bytes
    -> POST /history (REST) for history cleanup

pending prompt's socket disconnects
    -> reconnect
    -> GET /history/:promptId (REST) for authoritative recovery outputs
```

Only a pending prompt whose socket disconnected uses history recovery. The
recovery result replaces any partial WebSocket outputs; normal completion does
not query history. This is an internal backend integration boundary, not a
`packages/event` or shared server-to-web event contract.

Reference images are handed over as an absolute path, not as bytes. ComfyUI
opens the file directly out of Silent Pix storage. Silent Pix does not upload
reference bytes or create a separate reference copy for ComfyUI.

```txt
COMFYUI_STORAGE_PREFIX = the same directory as APP_STORAGE_DIR, spelled the way
                         ComfyUI sees it
```

The two processes may run under different operating systems, so that second
spelling cannot be derived with `node:path` and has to be configured. It must be
absolute: a relative path could resolve against a different working directory.
The resulting failure behavior depends on the ComfyUI loader.

`ComfyClient` owns permissive Zod schemas for ComfyUI's prompt, history, and
WebSocket envelopes. Its JSON readers return `unknown`; HTTP payloads are
validated before generation logic and malformed responses become
`COMFY_INVALID_RESPONSE`. WebSocket JSON that cannot satisfy the envelope is
ignored, as are valid events unrelated to a pending prompt. Sampler and LoRA
option responses keep their existing local shape checks.

The graph decides txt2img versus img2img by itself - an empty path takes the
empty-latent branch, a real path takes the encode branch - so the server sets one
string and there is no mode flag to keep in sync.

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
