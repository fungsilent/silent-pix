# Silent Pix Agent Rules

These are implementation constraints. `docs/architecture.md` describes current structure and known gaps; `docs/conventions.md` explains the conventions. Keep the three aligned. An implementation gap does not relax an invariant.

- Keep package ownership strict:
    - `apps/web`: SolidJS UI and backend API client only. Shared UI primitives live in `apps/web/src/components`; page-specific UI lives under that page folder.
    - `apps/server`: Elysia app, middleware, routes, services, env, and lifecycle.
    - `apps/desktop`: desktop shell placeholder/startup model.
    - `packages/shared`: canonical domain values and validation shared by REST/WebSocket contracts, plus those transport contracts. No UI projections or runtime integration clients.
    - `packages/event`: generic WebSocket transport helpers only.
    - `packages/db`: SQLite driver, Drizzle schema, migrations, database client, and maintenance scripts.
    - `packages/env`: Node-only base env loading and path resolution shared by server and database scripts; server-specific config remains in `apps/server`.
- Use workspace package imports such as `@silent-pix/shared`; do not use cross-package relative imports.
- Use `#/` for source imports, except `packages/shared`, which uses `#shared/` to avoid collisions under the current tsx/tsconfig resolution. Do not use `@/`, `./`, or `../` source imports.
- Organize by domain and keep related code together. Split for distinct responsibility or isolated complexity, not a line-count threshold. Do not introduce a layer or file solely for symmetry.
- Do not add Prettier. Formatting is ESLint + `@stylistic`.
- This repository has no test script. Do not search for, invent, or add one for plan or validation ceremony; use the existing typecheck, build, lint, and concrete manual acceptance checks.
- Pin third-party dependencies with explicit caret ranges; never use `latest`. Keep workspace dependencies as `workspace:*`.
- TypeScript 7 is the compiler; keep the official TypeScript 6 compatibility alias only for `typescript-eslint`. Do not use `baseUrl`, and make `paths` targets explicit `./` relative paths.

## API Conventions

- REST resource paths use singular names, such as `/api/task`.
- Successful responses return raw resource payloads. Never add `ok`, `success`, or `data` envelopes.
- HTTP status codes determine success or failure.
- Expected non-2xx route outcomes use Elysia `return status(...)`.
- Declare Zod schemas for request inputs and JSON responses for each supported HTTP status. Binary image responses and bodyless 304 responses use native `Response`; document their status, headers, and body semantics instead of inventing JSON schemas for them.
- Error responses use `{ error: { code, message } }`.
- `errorCatchMiddleware` handles Elysia/framework errors and unexpected exceptions. Preserve meaningful HTTP statuses, log internal errors server-side, and never expose raw `Error` objects.
- Shared REST request/response schemas live in `packages/shared` and are the runtime source of truth.
- API boundary types use `XxxQuery`, `XxxRequest`, and `XxxResponse`. Use validated Zod output types; never expose coercible `z.input` types containing `unknown`.
- Export REST contracts by namespace (`taskApi.x` for schemas, `TaskApi.X` for types); do not add duplicate flat REST exports or `XxxSchema` aliases. Keep existing canonical `Comfy`/`config` catalogs and the single flat exports `ConfigSchema`, `GeneratorField`, and `Mapping` as explicit compatibility exceptions; do not add parallel aliases or infer a new flat-export convention from them.
- Eden Treaty is the only frontend REST transport client and may only be called from `apps/web/src/api`.
- Export the composed Elysia type as `Api` from `apps/server/src/app.ts`; frontend imports it through `@silent-pix/server/api` with `import type`.
- Keep frontend and server Elysia versions compatible. Eden inference must never degrade to `any`.
- Eden keeps `parseDate: false` so REST datetime values remain ISO strings, and `throwHttpError: false` so callers narrow typed errors by status.
- For internal Eden APIs, do not re-parse typed inputs, success responses, or error responses in frontend wrappers; construct errors as `(status, code, message)`. Runtime parsing and validation belong at external or otherwise untrusted boundaries. Data produced by an internal typed factory, state owner, or cache-key factory is trusted app data: preserve the factory-derived compile-time type instead of re-parsing it to compensate for a library's `unknown` type. This does not replace validation at API boundaries. Handle transport failures and unexpected response shapes separately from declared internal errors; do not widen all route errors to `unknown` just to parse them again.
- API wrappers expose plain Promise functions and must not import Solid or TanStack Query. Domain feature modules own TanStack cache keys, pagination, refetch, and invalidation. `*.query.ts` exposes hooks; related `*.key.ts`, `*.cache.ts`, and `*.event.ts` may own cohesive supporting logic. Components consume the hooks.
- Backend services own database membership, collation, `LIKE`, and related query semantics. Frontend cache code must not reimplement them; when response fields cannot decide membership exactly, invalidate and let the server refetch.
- A user batch action that requires all-or-none semantics uses one batch API and one server-owned atomic operation; that operation may use a transaction or batch of statements. Do not fan out one client action into N requests and reconcile partial success.
- Solid stores are shared state sources like context: a query hook or component that needs store state reads it directly. Do not thread store-derived values through callers solely to reach a query hook. Query-specific request types and request construction belong in the owning feature `*.query.ts`, not in the store.
- Annotate exported Eden clients with public `Treaty.Create<Api>` when needed for portable declaration emit; never reference Eden internals or suppress unsafe types.

## Shared Contract Conventions

- Organize `packages/shared/src/contract` by domain ownership, not by Zod or schema role. A contract owns only canonical, reusable value/resource fragments; do not extract a fragment merely because two Zod expressions look syntactically similar.
- REST query coercion, params, requests, and responses belong under `packages/shared/src/api`. WebSocket event envelopes belong under `packages/shared/src/event`. API and event contracts may reference canonical domain contracts.
- `packages/db` owns table, row, and storage types. It may reference a canonical value type only when the stored JSON shape exactly matches that value; it must not use an API public resource, endpoint, or event type in place of a database row or storage type.
- An endpoint response may directly alias another endpoint response when that response has a formal domain meaning (for example, `createTaskResponse` and `renameTaskResponse` alias `getTaskResponse`). Do not invent a generic contract solely to remove a semantic endpoint import.
- Public REST runtime APIs use explicit `xxxApi` catalogs; canonical and event APIs use explicit domain catalogs. Each catalog lists every public schema explicitly; do not use export-star or spread-based automatic aggregation. A symbol is public only when an external package consumer uses it. Internal cross-file exports do not make a symbol public, and named type exports follow the same rule.
- In shared modules, keep Zod schema and logic sections before the inferred types section. Put externally needed `z.output<typeof schema>` types together at the end of the file.
- Shared comments use only these fixed `MARK` categories: `primitives`, `values`, `resources`, `query`, `params`, `request`, `response`, `errors`, `event`, `validation`, `helpers`, `catalog`, and `inferred types`. Use only necessary `NOTE`, `INVARIANT`, and `TRANSPORT` explanations. This comment convention applies only to `packages/shared`.

## Current Task API Scope

- The task API exposes list, detail, create, rename, delete, sampler, LoRA, and batch flag (`PATCH /api/task/flag`) endpoints. Images have their own resource: `GET /api/image` lists one entry per stored image with its earliest use, `GET /api/image/:imageId` serves the bytes as immutable with a sha256 ETag.
- Task create is one request. The shared contract rejects providing both a stored reference image id and an uploaded file; neither means txt2img.
- `task.created` announces new tasks; `task.changed` carries realtime lifecycle and metadata updates. Creator filtering is not implemented yet - `task.created` currently reaches everyone, and the web insert is idempotent so the creator's own echo is a no-op. `task.removed` carries `taskIds` for single or batch removal. Workflow events are `workflow.changed` and `workflow.removed`; `health.snapshot` also supplies the heartbeat. Additional event types require a concrete domain need.
- Use stable opaque task IDs consistently across backend fixtures and temporary frontend fixtures; do not add frontend ID translation.
- TanStack Query owns task-list pages, loading, errors, fetch state, and pagination state.
- Do not copy Query data into a Solid store. The task store may own frontend choices such as `selectedTaskId` only.
- REST provides initial and recovery synchronization. A successful task-create response seeds the originating client's feed and detail caches; `task.created` inserts tasks for other clients and `task.changed` updates existing cache entries.
- Web task creation sends `name: null` under the current contract; name is a post-create manual label and must not be inherited from the base task.
- Task create uses the complete `WorkflowModel` returned by `workflowService.findWorkflow()` (after its existing `castWorkflowModel()` DB-row conversion), persists its `id` and `revision` on the task, and passes that same model to generation; generation must not re-read the current Workflow. Legacy `workflowRevision = 0` rows remain unknown and are not backfilled by this flow.
- `taskService` owns task resource queries and business operations, including startup recovery, snapshots, publication, and public option methods. `taskExecution` owns generation orchestration and its generation-only completion transaction; it may call `taskService`, while `task.service.ts` must not import execution. This is a task-domain responsibility split, not a generic new layer.
- On server startup, `createApp()` awaits `taskService.failInterruptedTasks()` after `serverStore.init()` opens SQLite and before the first `ComfyClient.start()`. Persisted `queued` and `running` tasks are changed to `failed` with `errorCode = SERVER_RESTARTED`; startup does not resume them or publish recovery events because it runs before clients can connect, and clients obtain the recovered task state through subsequent REST initial/recovery synchronization. Task generation remains a detached, untracked background Promise: graceful shutdown does not drain it, and late finalization after the DB closes remains an unsupported known limit.

## Web UI and State

- Accessibility support is explicitly out of scope. Do not add repo-owned `aria-*` attributes, accessibility-only `role` or `tabIndex` values, screen-reader-only content such as `sr-only`, live regions, accessibility-specific copy, dependencies, lint rules, or tests.
- Ordinary UI behavior and markup required by the browser or component API may remain. Do not replace Ark UI or strip accessibility behavior generated internally by third-party components solely to enforce this scope; the restriction applies to code owned by this repository.
- Web UI uses SolidJS, Ark UI for headless primitives, Tailwind CSS utilities, `clsx` for conditional class composition, and `lucide-solid` for icons.
- Web state uses Solid native stores through `apps/web/src/lib/store.ts`; read `store.state` directly and keep actions flattened on returned stores, not inside reactive state.
- Generate and Workflow form state uses TanStack Form through page-scoped context.
- Do not add another generic form abstraction.
- Solid stores own UI/query lifecycle state only, not duplicated form values.
- Zod validates submit boundaries; domain diagnostics may remain live where required.
- Prefer flex layout as the default web layout primitive.
- `App.tsx` composes app-level chrome such as `components/Header.tsx`; page components should not own the app header.
- A TSX file may contain multiple components. Keep a page-specific component local to its only consumer by default; split it into its own file when it has multiple consumers, an independent ownership boundary, or enough isolated complexity to make the split useful.
- Component-specific non-component logic may live beside its component; page-wide logic belongs at the page root, and shared browser utilities belong in `lib` when they have a clear shared responsibility.
- Short, single-use functions, components, fixtures, and types default to inline/local ownership. Extract them only for reuse, an independent ownership boundary, or clearly isolated complexity.
- The component that acquires query/store data owns that access and distributes narrow props to its children. Each child defines its own narrow props contract; this is not a duplicate of a library or transport type merely because some fields overlap; do not make a child mix injected props with direct access to the same parent-owned data source.
- Solid `<For>` keys by item reference, not by an explicit key prop. If mapped or decorated objects may be recreated, iterate stable primitive IDs and resolve the latest item reactively; ordinary state updates must not remount focused or editable controls.
- Reusable web components should expose named class slots such as `classes` when one generic class string is too vague.
- Keep shared field primitives generic. Domain rows, grouped labels, LoRA layouts, and actions belong in domain UI components; keep them page-local unless shared across pages. Shared task detail UI lives in `components/task/detail`.
- Generate task-list components live under `apps/web/src/pages/generate/components/task`.
- Generate-specific task detail/config adapters live under `apps/web/src/pages/generate/components/config`; shared TaskDetail components stay under `apps/web/src/components/task/detail`.

## Storage and Boundaries

- Use SQLite + Drizzle only. Do not add other database engines, ORMs, queues, or cloud database services.
- Server services query `database.db` with Drizzle directly. Do not add a repository layer, use raw SQLite outside the database client, or use Drizzle's `sql` tagged template in `apps/server`.
- Frontend must never call ComfyUI, access SQLite, or know backend-only env values. Workflow UI may edit the shared graph/mapping contract, including node IDs; connection and execution protocols remain server-owned.
- Backend is the source of truth for durable state. Frontend state is UI state only.
- WebSocket event contracts live under `packages/shared/src/event`, divided by domain module.
- The server validates every outbound event through the shared aggregate schema before broadcast.
- Client ids are not implemented. When they are, the same UUID goes on the WebSocket query and the task-create header so the server can exclude the creator from `task.created`.
- Event and mutation cache updates must be idempotent. Patch when payload fields determine the result; invalidate affected queries when they cannot, including search membership and dependent domains. Reconnection must recover queries affected by missed events. Current recovery covers task, workflow, and image list queries.
- Store image files on the filesystem and metadata in SQLite. Do not store image binary data in SQLite.
- Images are content-addressed by sha256 and stored once. `images` owns the content, `task_images` owns what a task does with it. An image row and its file are deleted only when the last reference is gone, and the database commits before the filesystem unlinks.
- `imageCleanup.removeUnreferenced()` owns the deduplicated, chunked guarded delete (`NOT EXISTS(task_images)` plus `DELETE RETURNING id/path`) and per-item unlink outcomes; task cleanup and GC call it while holding `withImageMutation`, and it never reacquires the lock.
- Ingest, reference creation, deletion, and GC must not unlink content another operation has referenced or republished. DB foreign keys and commit-before-unlink alone do not guarantee filesystem concurrency safety. Server image mutations use the process-local `withImageMutation` mutex through reference commit or cleanup unlink; mutation helpers require the caller to hold it and must not reacquire it. Online GC is server-owned at `/api/image/garbage-collection`; the normal `image:gc` CLI only triggers that route. The supported deployment has one server writer per database/storage pair; a second writer is unsupported. `image:gc:offline -- --confirm-server-stopped` is a stopped-server recovery command, and normal GC never falls back to it.
- Image cleanup and filesystem sweep paths use canonical `config.appStorageDir`; GC has no storage-root override.
- Image metadata is sniffed from the bytes. Never trust the client's declared type, and never derive it from a filename.
- Silent Pix supplies reference images to ComfyUI by absolute path into its storage, without uploading bytes or creating a separate reference-image copy for ComfyUI.
- Do not assume cwd is repo root. Resolve runtime paths explicitly and keep production app data overrides possible.
- Runtime values owned by env/config are read directly by the owning capability. Project-owned APIs must not accept those values as application arguments: `createDatabaseClient()`, `ComfyClient`, image storage helpers, and ComfyUI filesystem helpers load their own canonical config. Environment variables are the supported override boundary; set them before importing the owner in an isolated validation process. Passing a resolved value from its owner into a third-party API such as Elysia, LibSQL, or Drizzle is expected and is not a second project config channel.

## Plan Documents

- Implementation plans live in `temp/<feature>-<author>-plan.md`. `temp/` is gitignored; plans are working documents, not repo history.
- Before writing one, read `.agents/skills/plan-doc/SKILL.md`. It defines the required sections, and the density rule: show the change as schema sketches, ASCII layouts, and tables; do not argue for it in prose.
- Never overwrite the user's own requirement sketch in `temp/`.

## Phased Implementation

- When executing an approved phased plan or when the user requests the Sol / Luna phased workflow, read `.agents/skills/phased-implementation/SKILL.md` before implementation.
- The user is the only PHASE gate authority. Automated validation and agent review never advance a PHASE without explicit user confirmation.
- Prefer the simplest architecture that cleanly fits current requirements and current system shape. Avoid speculative architecture, but surface concrete boundary problems and propose scoped refactors when existing complexity justifies them; if that conflicts with an explicit rule in this file, stop for user review.
