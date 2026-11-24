# Architecture

Silent Pix is a local-first desktop/web app for ComfyUI workflows. The backend
owns durable task state, persistence, and ComfyUI communication.

This document explains system boundaries, cross-boundary flows, their guarantees,
and known gaps. Implementation constraints live in [AGENTS.md](../AGENTS.md);
reusable implementation practices live in [conventions.md](conventions.md).
Document update rules are owned by AGENTS.md's Documentation Scope section.
UI specifications live in [apps/design](../apps/design), and setup and operation
belong in the relevant README. Schemas and code own exact fields and algorithms.

## Source of Truth

| Owner | Responsibility |
|---|---|
| SQLite | Durable state and metadata |
| Filesystem | Image bytes addressed by content hash |
| Server memory | Active runtime state |
| REST | Authoritative queries and mutation results; initial and recovery synchronization |
| WebSocket | Validated snapshots for live cache updates |
| Frontend | UI/form state and caches of backend data |
| ComfyUI | Generation execution |

Refreshing a client and querying REST recovers durable state without depending
on previously received events. Frontend choices and cached projections never
become task lifecycle authority.

## Package Boundaries

| Package | Owns |
|---|---|
| `apps/web` | SolidJS UI, typed Server API client, and a narrow Desktop bridge for fixed native settings and current-window controls |
| `apps/server` | Elysia on Node.js, HTTP/WebSocket adapters, domain services, runtime configuration, and lifecycle |
| `apps/desktop` | Tauri shell, startup, and validated native local Server settings |
| `apps/design` | Silent Pix design blueprint content and tokens, independent of Web |
| `packages/blueprint` | Reusable Astro/Starlight blueprint framework, without Silent Pix content |
| `packages/shared` | Canonical domain values/validation and REST/event contracts |
| `packages/event` | Generic browser WebSocket client and type-keyed EventServer transport |
| `packages/db` | SQLite client, Drizzle schema/migrations, and maintenance scripts |
| `packages/env` | Node-only base env loading and path resolution for Server and database scripts |

Web uses Eden Treaty through its API modules. The composed Server `Api` is a
type-only dependency; Server runtime code and backend-only configuration do not
enter the browser. Web never accesses SQLite or ComfyUI directly. Its native
bridge exposes no arbitrary commands or filesystem paths; Desktop owns native
settings persistence and validation.

Shared canonical contracts have no transport dependencies. REST and event
contracts build on them; database row/storage types remain DB-owned. Web-only
projections and Server-only integration clients stay with their consumers.

The Event package has no Shared, Zod, or Elysia dependency. Server injects the
shared aggregate event parser into EventServer; the Server event route owns the
Elysia adapter, handshake, and connection hooks. Domain projections stay in their
domain, while health composition supplies initial-send and timer behavior.

Design and Web never import each other. Web implements the blueprint; blueprint
authoring and framework behavior are documented in
[apps/design/README.md](../apps/design/README.md) and
[packages/blueprint/README.md](../packages/blueprint/README.md).

## Backend and Task Lifecycle

```text
REST route -> domain service -> Drizzle -> SQLite
                 |
Task create -> taskExecution -> ComfyClient -> ComfyUI
                 |
           image ingest -> reference commit -> snapshot publication -> Comfy cleanup
```

Routes own transport validation, HTTP status selection, and synchronous mutation
publication. Services own domain queries, business validation, and atomic writes;
there is no repository layer. Database membership, collation, and search semantics
are Server-owned.

Server lifecycle owns `databaseClient`. Middleware supplies it to routes, which
pass its Drizzle `database` to services. Startup, health, and shutdown alone use
the client's lifecycle methods. Transaction-compatible leaf capabilities take
only the database operations they need.

Within the Task domain, `taskService` owns resource queries, business operations,
startup recovery, snapshots, and options. `taskExecution` owns generation and its
completion transaction and may use `taskService`; the dependency never reverses.
REST routes and execution call sites load canonical snapshots for publication.
The Workflow domain owns the reused Workflow summary projection.

Task creation loads one complete Workflow model, persists its ID and revision,
and passes that same model into generation. A later Workflow update cannot change
the prompt for the created Task. The model is process-local; legacy revision-zero
tasks remain of unknown revision and are not backfilled by this flow.

Workflow mapping validation runs inside create/update before writes. Update
validates before lookup, archive, and revision checks, preserving mapping-error
precedence. Failed validation produces no mutation event.

Workflow saves and bundled seed updates advance the revision only when the graph
or mappings change. Seeding is an explicit database maintenance command.

Generation status helpers return guarded-write outcomes; execution publishes only
successful state changes, including preflight failures. On completion, image
references commit before the snapshot is published, and publication precedes
successful Comfy output cleanup. A post-commit cleanup error is logged without
changing the committed Task outcome.

At startup, after opening SQLite and before starting ComfyUI communication,
Server marks persisted queued/running tasks as failed with `SERVER_RESTARTED`.
It does not resume them or publish recovery events before clients connect;
subsequent REST synchronization returns the recovered state. Shutdown limitations
are listed under Known Gaps.

## Image Storage and Consistency

SQLite stores metadata; image bytes live at
`APP_STORAGE_DIR/images/<sha256>.<png|jpg>`. Stored paths are relative to the
storage root. `images` owns content; `task_images` owns a Task's use of that
content, including role and position. One stored image can serve multiple tasks.

The unique content-hash index enforces deduplication. Files publish through a
temporary write followed by rename: immutable content-addressed reads must never
observe a partial file. Type and dimensions come from the bytes, not client MIME
or filenames. JPEG dimensions account for orientation without transcoding bytes.

An image row and file are removed only after their last reference disappears.
Foreign keys protect referenced rows, and the database commits before filesystem
unlink. An unlink failure can leave an orphan for later GC. Neither guarantee
alone prevents cleanup racing with new ingest or reference creation.

The process-local `withImageMutation` mutex therefore covers lookup/ingest through
reference commit, or guarded orphan deletion through unlink. The caller owns the
whole lock boundary; helpers never reacquire it. Comfy execution/downloads and
read-only requests remain outside it. Output completion locks only ingest,
reference commit, and orphan rollback.

Task cleanup and GC share `imageCleanup.removeUnreferenced()`: it deduplicates and
chunks candidates, rechecks absence of references during row deletion, returns
deleted paths, and reports individual unlink outcomes. Cleanup cannot unlink
content another operation has referenced or republished.

Online GC runs in the Server image domain under the same mutex and applies its
grace period to orphan rows, recognized stray files, and temporary writes. The
normal GC CLI is only an HTTP trigger and never falls back to direct storage
access. Offline GC explicitly requires a stopped Server. Both use canonical
storage configuration with no storage-root override.

This coordination supports one Server writer per database/storage pair. A second
writer sharing either is unsupported. Operational commands are in the root
[README](../README.md).

## REST and Realtime

A mutation's actor applies the authoritative HTTP response immediately; other
clients receive the corresponding event. Async Task lifecycle changes reach all
clients independently of the original request. SQLite and REST recover
missed state; events are not durable.

One page-scoped `clientId` is shared by the Web API fetcher and event connection.
Synchronous Task/Workflow mutations validate the shared client-header contract
before their handlers and exclude every socket with that identity from successful
publication. Failure and empty-batch branches publish nothing. The identity is
routing metadata, not authentication.

EventServer derives payload types from the event type and validates the assembled
envelope once before publication or point-to-point send. Server outbound events
and Web inbound events use the shared aggregate contract. Exact event payloads
are owned by `packages/shared/src/event`.

The Web event feature owns URL construction, connection lifecycle, parsing,
connection status, reconnect recovery, and exhaustive dispatch. App startup only
starts and cleans up that feature. Domain features own their cache handlers.
Task creation seeds the actor's feed/detail caches; remote creation events seed
other clients. Reconnection invalidates Task, Workflow, and Image list queries.

Mutation and event updates share idempotent cache operations. Complete payloads
can patch caches; insufficient projections require invalidation and a Server
refetch. Dependent domains matter: Task changes can alter Image list results.
Image lists are Server-owned projections of content and matching uses, so Web
does not infer their filter membership from Task events.

Health snapshots provide service state and liveness. Only valid events refresh
the client's liveness evidence; lost connections make health unknown. Client and
Server timers derive from the shared heartbeat policy.

### Origin Boundary

The event endpoint requires both Origin and Host; missing or `null` Origin is
rejected. Development accepts canonical HTTP(S) origins for localhost and LAN
workflows. Outside development, parsed Origin host, including port, must match
Host. The only cross-origin exceptions are packaged Desktop origins
`http://tauri.localhost` and `tauri://localhost` against canonical
`127.0.0.1:<port>`, with ports 1–65535 except implicit HTTP default 80.

REST CORS echoes accepted development origins or the packaged Desktop loopback
exceptions. It uses explicit method/header allowlists without wildcard origins
or credentials, and every `/api/` response varies on Origin. Preflight also
varies on requested method and headers. Cloudflare Tunnel must preserve the
external Host by leaving `httpHostHeader` unset.

## ComfyUI Boundary

Only Server speaks the ComfyUI protocol. Workflow UI edits shared graph/mapping
values through Silent Pix APIs without knowing connection or execution details.

```text
submit prompt (REST)
  -> lifecycle and node outputs (ComfyUI WebSocket)
  -> download output bytes (REST)
  -> commit Task/images
  -> remove successful outputs and history

pending prompt loses its socket
  -> reconnect
  -> recover authoritative outputs from REST history
```

`ComfyClient.execute()` returns `void` and requires terminal completion/failure
callbacks. Callbacks run in lifecycle order without awaiting one another;
callback exceptions/rejections are logged without changing the Comfy outcome or
recursively reporting another failure. Explicit prompt rejection fails; ambiguous
submission transport failure continues only when the matching socket has already
supplied execution evidence.

Only pending prompts whose socket disconnected use history recovery. Recovery
replaces partial WebSocket outputs; normal completion does not query history.
This protocol stays in the Server Comfy adapter, outside shared event transport.

The adapter validates untrusted HTTP and WebSocket envelopes. Malformed HTTP
responses become integration errors; invalid or unrelated socket events do not
advance pending execution.

Server supplies reference images and masks as absolute paths to existing Silent
Pix storage, without uploading bytes or creating a second copy. Server checks
files under its storage root, then converts the paths using the root visible to
ComfyUI. Docker mounts or Windows/WSL paths can give the same bytes different
absolute roots. Path conversion preserves the target platform's separators.
A missing local reference or mask fails before submission. Inaccessible
ComfyUI paths fail in the loader. The Anima graph selects txt2img, img2img, or
inpaint from the supplied paths.

## Web State

The URL owns page selection. Browser uses pathname routes and the Caddy SPA
fallback, while Desktop uses hash routes within its WebView entry document. Both
share the same routes. App code navigates by route name, which the route catalog
resolves to a URL path. The App root layout keeps Header and any active WebSocket
mounted across navigation. The QueryClient outlives individual routes. Leaving a
route unmounts its page, releasing page resources and subscriptions.

API wrappers choose request deadlines. TanStack Query supplies the cancellation
signal for cancellable reads, and `requestSignal()` combines it with the API
deadline.

TanStack Query owns Server data, loading/errors, and pagination. Solid stores own
UI choices and connection state without copying Query data. Generate and Workflow
each keep their TanStack Form and pending submission in a work session owned by
the App root layout. Pages own Query subscriptions, synchronization with server
data, and editor views. Navigation preserves the work, and restarting the App
resets it. Server refreshes preserve unrelated local edits; changing theme or
language does not rebuild editors or reset input.

Local image metadata inspection runs entirely in the browser, with no Server,
ComfyUI, or durable storage dependency. The page owns File, Worker, preview URL,
and result lifetimes; resource release and stale-result protection stay with that
owner. External bytes and decompressed data are bounded and validated. Copy
preserves original payload text, including unsafe integers; parsed projections
do not replace the original. Parser limits and rendering behavior live in code
and the design blueprint.

Header, Settings, and local tools remain available without a configured endpoint.
Server health queries and events start only when an endpoint exists. Local tools
work after Web assets load; this does not imply offline asset caching.

## Configuration and Runtime Targets

Environment variables are the runtime override boundary. Node base loading/path
resolution belongs to Env; database and Server-specific config belong to their
owners. Each side-effect capability reads its own canonical configuration, so
callers cannot introduce competing database URLs, storage roots, or Comfy roots.
Operation inputs such as IDs, Database capabilities, grace periods, and clocks
remain explicit. Data, database, and storage paths are independently configured;
the data directory does not derive the other two. Runtime paths do not assume
repository-root cwd.

The root `.env` supplies the shared Browser/Desktop Vite endpoint. Browser uses
the same-origin API proxy. Every Tauri webview, including development, uses the
Desktop identity and native saved Server URL for API, images, and events; Vite
provides assets and HMR only. Desktop's dev wrapper merges the validated endpoint
into Tauri and resolves linked configuration back to the source repository.
This does not promise simultaneous independent Vite instances.

Desktop hosts Web and does not start Server or ComfyUI. Native settings persist
one validated local Server URL. Fixed current-window controls support the shared
Header title bar; Web's native bridge remains narrow. Development setup and
packaged acceptance belong in [apps/desktop/README.md](../apps/desktop/README.md).

Workspace development resolves TypeScript sources through the development export
condition; production resolves built outputs. Development and database commands
do not require a prior build.

### Deployment

Single-host Compose builds Server and Caddy/Web separately. Caddy serves Web and
proxies API/WebSocket traffic over the private network; Server has no published
port. Optional integrated ComfyUI shares storage/output mounts with Server, or
Server uses an externally managed instance. Published Caddy/ComfyUI ports bind
to host loopback. Cloudflare Tunnel is independently managed.

Deploy start stops project writers before migrations and recreates services only
after migration success; failure leaves services stopped. Stop/down retain
bind-mounted data. Ansible delegates to the same scripts. SQLite must remain
inside the persistent data mount; native/other manually started writers must be
stopped separately. Setup, migration, health checks, and operation are owned by
[deploy/README.md](../deploy/README.md).

## Known Gaps

- Generation and output finalization are detached and untracked. Graceful
  shutdown does not drain them; late finalization against a closed database is
  unsupported. Startup recovery marks interrupted tasks failed and does not resume
  execution or provide cancellation.
- Authentication and packaged Desktop remote connectivity remain unimplemented.
  Client identity and origin checks do not provide authentication.
- Storage paths are configurable, but automatic Desktop production app-data
  overrides are unimplemented; production must explicitly configure persistent
  paths outside the repository.
- Windows native behavior, packaged file selection/drop/Clipboard, custom-title-bar
  Snap Layouts, Linux edge resizing, and macOS Overlay traffic-light placement
  are not verified from this workspace.
  Development HMR does not validate packaged origins, installers, or release builds.
- The database client enables foreign keys but does not explicitly configure WAL
  or `busy_timeout`; changes require runtime validation at that owner.
- JPEG orientation metadata is handled without transcoding; agreement with browser
  and ComfyUI decoding still requires orientation-bearing runtime checks.
