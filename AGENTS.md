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

- The task API exposes list, detail, create, rename, delete, sampler, and LoRA endpoints. Images have their own resource: `GET /api/image` lists one entry per stored image with its earliest use, `GET /api/image/:imageId` serves the bytes as immutable with a sha256 ETag.
- Task create is one request. A reference image is either an id of a stored image or a file uploaded alongside the payload; sending both matches no contract variant, sending neither is txt2img.
- `task.created` announces new tasks; `task.changed` carries realtime lifecycle updates. Creator filtering is not implemented yet - `task.created` currently reaches everyone, and the web insert is idempotent so the creator's own echo is a no-op. Other task lifecycle events remain out of scope unless explicitly requested.
- Use stable opaque task IDs consistently across backend fixtures and temporary frontend fixtures; do not add frontend ID translation.
- TanStack Query owns task-list pages, loading, errors, fetch state, and pagination state.
- Do not copy Query data into a Solid store. The task store may own frontend choices such as `selectedTaskId` only.
- REST provides initial and recovery synchronization. A successful task-create response seeds the originating client's feed and detail caches; `task.created` inserts tasks for other clients and `task.changed` updates existing cache entries.
- Web task creation does not send `name`; name is a post-create manual label and must not be inherited from the base task.

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
