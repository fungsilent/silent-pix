# Silent Pix Agent Rules

- Keep package ownership strict:
    - `apps/web`: SolidJS UI and backend API client only. Shared UI primitives live in `apps/web/src/components`; page-specific UI lives under that page folder.
    - `apps/server`: Elysia app, middleware, routes, services, env, and lifecycle.
    - `apps/desktop`: desktop shell placeholder/startup model.
    - `packages/shared`: shared REST and WebSocket Zod contracts only.
    - `packages/event`: generic WebSocket transport helpers only.
    - `packages/db`: SQLite driver, Drizzle schema, migrations, and database client.
- Use workspace package imports such as `@silent-pix/shared`; do not use cross-package relative imports.
- Use the `#/` alias for source imports. Do not use `./` or `../` source imports.
- Do not add Prettier. Formatting is ESLint + `@stylistic`.
- This repository has no test script. Do not search for, invent, or add one for plan or validation ceremony; use the existing typecheck, build, lint, and concrete manual acceptance checks.
- Pin third-party dependencies with explicit caret ranges; never use `latest`. Keep workspace dependencies as `workspace:*`.
- TypeScript 7 is the compiler; keep the official TypeScript 6 compatibility alias only for `typescript-eslint`. Do not use `baseUrl`, and make `paths` targets explicit `./` relative paths.

## API Conventions

- REST resource paths use singular names, such as `/api/task`.
- Successful responses return raw resource payloads. Never add `ok`, `success`, or `data` envelopes.
- HTTP status codes determine success or failure.
- Expected non-2xx route outcomes use Elysia `return status(...)`.
- Declare request and response Zod schemas on Elysia routes, including response schemas for each supported HTTP status.
- Error responses use `{ error: { code, message } }`.
- `errorCatchMiddleware` handles Elysia/framework errors and unexpected exceptions. Preserve meaningful HTTP statuses, log internal errors server-side, and never expose raw `Error` objects.
- Shared REST request/response schemas live in `packages/shared` and are the runtime source of truth.
- API boundary types use `XxxQuery`, `XxxRequest`, and `XxxResponse`. Use validated Zod output types; never expose coercible `z.input` types containing `unknown`.
- Export shared contracts by namespace (`taskApi.x` for schemas, `TaskApi.X` for types); do not add duplicate flat exports or `XxxSchema` aliases.
- Eden Treaty is the only frontend REST transport client and may only be called from `apps/web/src/api`.
- Export the composed Elysia type as `Api` from `apps/server/src/app.ts`; frontend imports it through `@silent-pix/server/api` with `import type`.
- Keep frontend and server Elysia versions compatible. Eden inference must never degrade to `any`.
- Eden keeps `parseDate: false` so REST datetime values remain ISO strings, and `throwHttpError: false` so callers narrow typed errors by status.
- For internal Eden APIs, do not re-parse typed inputs, success responses, or error responses in frontend wrappers; construct errors as `(status, code, message)`. Runtime parsing and validation belong at external or otherwise untrusted boundaries. Data produced by an internal typed factory, state owner, or cache-key factory is trusted app data: preserve the factory-derived compile-time type instead of re-parsing it to compensate for a library's `unknown` type. This does not replace validation at API boundaries.
- API wrappers expose plain Promise functions and must not import Solid or TanStack Query. Feature `*.query.ts` files own TanStack cache keys, pagination, refetch, and invalidation; components consume those hooks.
- Backend services own database membership, collation, `LIKE`, and related query semantics. Frontend cache code must not reimplement them; when response fields cannot decide membership exactly, invalidate and let the server refetch.
- A user batch action that requires all-or-none semantics uses one batch API and one server-owned atomic operation; that operation may use a transaction or batch of statements. Do not fan out one client action into N requests and reconcile partial success.
- Solid stores are shared state sources like context: a query hook or component that needs store state reads it directly. Do not thread store-derived values through callers solely to reach a query hook. Query-specific request types and request construction belong in the owning feature `*.query.ts`, not in the store.
- Annotate exported Eden clients with public `Treaty.Create<Api>` when needed for portable declaration emit; never reference Eden internals or suppress unsafe types.

## Shared Contract Conventions

- Organize `packages/shared/src/contract` by domain ownership, not by Zod or schema role. A contract owns only canonical, reusable value/resource fragments; do not extract a fragment merely because two Zod expressions look syntactically similar.
- REST query coercion, params, requests, and responses belong under `packages/shared/src/api`. WebSocket event envelopes belong under `packages/shared/src/event`. API and event contracts may reference canonical domain contracts.
- `packages/db` owns table, row, and storage types. It may reference a canonical value type only when the stored JSON shape exactly matches that value; it must not use an API public resource, endpoint, or event type in place of a database row or storage type.
- An endpoint response may directly alias another endpoint response when that response has a formal domain meaning (for example, `createTaskResponse` and `renameTaskResponse` alias `getTaskResponse`). Do not invent a generic contract solely to remove a semantic endpoint import.
- Public runtime APIs use explicit `xxxApi` catalogs. Each catalog lists every public schema explicitly; do not use export-star or spread-based automatic aggregation. A symbol is public only when an external package consumer uses it. Internal cross-file exports do not make a symbol public, and named type exports follow the same rule.
- In shared modules, keep Zod schema and logic sections before the inferred types section. Put externally needed `z.output<typeof schema>` types together at the end of the file.
- Shared comments use only these fixed `MARK` categories: `primitives`, `values`, `resources`, `query`, `params`, `request`, `response`, `errors`, `event`, `validation`, `helpers`, `catalog`, and `inferred types`. Use only necessary `NOTE`, `INVARIANT`, and `TRANSPORT` explanations. This comment convention applies only to `packages/shared`.

## Current Task API Scope

- The task API exposes list, detail, create, rename, delete, sampler, LoRA, and batch flag (`PATCH /api/task/flag`) endpoints. Images have their own resource: `GET /api/image` lists one entry per stored image with its earliest use, `GET /api/image/:imageId` serves the bytes as immutable with a sha256 ETag.
- Task create is one request. A reference image is either an id of a stored image or a file uploaded alongside the payload; sending both matches no contract variant, sending neither is txt2img.
- `task.created` announces new tasks; `task.changed` carries realtime lifecycle and metadata updates. Creator filtering is not implemented yet - `task.created` currently reaches everyone, and the web insert is idempotent so the creator's own echo is a no-op. Other task lifecycle events remain out of scope unless explicitly requested.
- Use stable opaque task IDs consistently across backend fixtures and temporary frontend fixtures; do not add frontend ID translation.
- TanStack Query owns task-list pages, loading, errors, fetch state, and pagination state.
- Do not copy Query data into a Solid store. The task store may own frontend choices such as `selectedTaskId` only.
- REST provides initial and recovery synchronization. A successful task-create response seeds the originating client's feed and detail caches; `task.created` inserts tasks for other clients and `task.changed` updates existing cache entries.
- Web task creation does not send `name`; name is a post-create manual label and must not be inherited from the base task.

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
- App-level chrome such as `Header` belongs in `App.tsx`; page components should not own the app header.
- A TSX file may contain multiple components. Keep a page-specific component local to its only consumer by default; split it into its own file when it has multiple consumers, an independent ownership boundary, or enough isolated complexity to make the split useful.
- Short, single-use functions, components, fixtures, and types default to inline/local ownership. Extract them only for reuse, an independent ownership boundary, or clearly isolated complexity.
- The component that acquires query/store data owns that access and distributes narrow props to its children. Each child defines its own props contract; do not make a child mix injected props with direct access to the same parent-owned data source.
- Solid `<For>` keys by item reference, not by an explicit key prop. If mapped or decorated objects may be recreated, iterate stable primitive IDs and resolve the latest item reactively; ordinary state updates must not remount focused or editable controls.
- Reusable web components should expose named class slots such as `classes` when one generic class string is too vague.
- Keep shared field primitives generic. Visible page rows, grouped labels, mock task/config data, LoRA stack layout, and remove/add controls belong in page-specific components.
- Generate task-list components live under `apps/web/src/pages/generate/components/task`.
- Generate task detail/config components live under `apps/web/src/pages/generate/components/config`.

## Storage and Boundaries

- Use SQLite + Drizzle only. Do not add other database engines, ORMs, queues, or cloud database services.
- Server services query `database.db` with Drizzle directly. Do not add a repository layer or use raw SQLite outside the database client.
- Frontend must never call ComfyUI, access SQLite, or know backend-only env values.
- Backend is the source of truth for durable state. Frontend state is UI state only.
- WebSocket event contracts live under `packages/shared/src/event`, divided by domain module.
- The server validates every outbound event through the shared aggregate schema before broadcast.
- Client ids are not implemented. When they are, the same UUID goes on the WebSocket query and the task-create header so the server can exclude the creator from `task.created`.
- `task.created` and `task.changed` carry the task fields required by list and detail caches. Created events idempotently insert feed entries, changed events patch existing entries, and the web invalidates task queries once after WebSocket reconnection to recover missed events.
- Store image files on the filesystem and metadata in SQLite. Do not store image binary data in SQLite.
- Images are content-addressed by sha256 and stored once. `images` owns the content, `task_images` owns what a task does with it. An image row and its file are deleted only when the last reference is gone, and the database commits before the filesystem unlinks.
- Image metadata is sniffed from the bytes. Never trust the client's declared type, and never derive it from a filename.
- ComfyUI reads reference images from Silent Pix storage by absolute path. It is never sent bytes, and it never keeps a copy.
- Do not assume cwd is repo root. Resolve runtime paths explicitly and keep production app data overrides possible.

## Plan Documents

- Implementation plans live in `temp/<feature>-<author>-plan.md`. `temp/` is gitignored; plans are working documents, not repo history.
- Before writing one, read `.agents/skills/plan-doc/SKILL.md`. It defines the required sections, and the density rule: show the change as schema sketches, ASCII layouts, and tables; do not argue for it in prose.
- Never overwrite the user's own requirement sketch in `temp/`.

## Phased Implementation

- When executing an approved phased plan or when the user requests the Sol / Luna phased workflow, read `.agents/skills/phased-implementation/SKILL.md` before implementation.
- The user is the only PHASE gate authority. Automated validation and agent review never advance a PHASE without explicit user confirmation.
- Prefer the simplest architecture that cleanly fits current requirements and current system shape. Avoid speculative architecture, but surface concrete boundary problems and propose scoped refactors when existing complexity justifies them; if that conflicts with an explicit rule in this file, stop for user review.
