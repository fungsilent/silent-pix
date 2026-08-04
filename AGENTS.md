# Silent Pix Agent Rules

- Keep package ownership strict:
    - `apps/web`: SolidJS UI and backend API client only. Shared UI primitives live in `apps/web/src/components`; page-specific UI lives under that page folder.
    - `apps/server`: Elysia app, middleware, routes, services, env, and lifecycle.
    - `apps/desktop`: desktop shell placeholder/startup model.
    - `packages/shared`: shared Zod contracts only.
    - `packages/event`: event contracts and WebSocket helpers only.
    - `packages/db`: SQLite driver, Drizzle schema, migrations, and database client.
- Use workspace package imports such as `@silent-pix/shared`; do not use cross-package relative imports.
- Use the `#/` alias for source imports. Do not use `./` or `../` source imports.
- Do not add Prettier. Formatting is ESLint + `@stylistic`.
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
- For internal Eden APIs, do not re-parse typed inputs, success responses, or error responses in frontend wrappers; runtime parsing is for external/untrusted APIs. Construct errors as `(status, code, message)`.
- API wrappers expose plain Promise functions and must not import Solid or TanStack Query. Feature `*.query.ts` files own TanStack cache keys, pagination, refetch, and invalidation; components consume those hooks.
- Annotate exported Eden clients with public `Treaty.Create<Api>` when needed for portable declaration emit; never reference Eden internals or suppress unsafe types.

## Current Task API Scope

- The current task API trial implements only `GET /api/task` and frontend `taskApi.list()`.
- Do not add task detail, create, cancel, delete, task lifecycle timers, task-specific WebSocket events, or task persistence unless explicitly requested.
- Backend mock task-list data is non-durable and must satisfy the shared Zod response schema.
- Use stable opaque task IDs consistently across backend fixtures and temporary frontend fixtures; do not add frontend ID translation.
- TanStack Query owns task-list pages, loading, errors, fetch state, and pagination state.
- Do not copy Query data into a Solid store. The task store may own frontend choices such as `selectedTaskId` only.
- REST is the source of truth for task-list data.

## Web UI and State

- Web UI uses SolidJS, Ark UI for headless primitives, Tailwind CSS utilities, `clsx` for conditional class composition, and `lucide-solid` for icons.
- Web state uses Solid native stores through `apps/web/src/lib/store.ts`; read `store.state` directly and keep actions flattened on returned stores, not inside reactive state.
- Do not add a generic form abstraction. Page editor state should be page-scoped through context, and Zod validates untyped submit boundaries.
- Prefer flex layout as the default web layout primitive.
- App-level chrome such as `Header` belongs in `App.tsx`; page components should not own the app header.
- Reusable web components should expose named class slots such as `classes` when one generic class string is too vague.
- Keep shared field primitives generic. Visible page rows, grouped labels, mock task/config data, LoRA stack layout, and remove/add controls belong in page-specific components.
- Generate task-list components live under `apps/web/src/pages/generate/components/task`.
- Generate task detail/config components live under `apps/web/src/pages/generate/components/config`.

## Storage and Boundaries

- Use SQLite + Drizzle only. Do not add other database engines, ORMs, queues, or cloud database services.
- Server services query `database.db` with Drizzle directly. Do not add a repository layer or use raw SQLite outside the database client.
- Frontend must never call ComfyUI, access SQLite, or know backend-only env values.
- Backend is the source of truth for durable state. Frontend state is UI state only.
- WebSocket events are notifications only. Define event items in `packages/event/src/events.ts`.
- Store image files on the filesystem and metadata in SQLite. Do not store image binary data in SQLite.
- Do not assume cwd is repo root. Resolve runtime paths explicitly and keep production app data overrides possible.