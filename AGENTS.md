# Silent Pix Agent Rules

- Work architecture-first. Read `README.md`, `docs/architecture.md`, and `docs/conventions.md` before implementation.
- This phase is foundation only. Do not add product features, task queues, ComfyUI integration, SSE/WebSocket, auth, or image UI.
- Keep package ownership strict:
    - `apps/web`: UI and backend API client only.
    - `apps/server`: Hono app, routes, env, and lifecycle.
    - `apps/desktop`: desktop shell placeholder/startup model.
    - `packages/shared`: shared contracts only.
    - `packages/db`: SQLite, Drizzle schema, migrations, clients, and repositories.
- Use workspace package imports such as `@silent-pix/shared`; do not use cross-package relative imports.
- Do not add Prettier. Formatting is ESLint + `@stylistic`.
- Use SQLite + Drizzle only. Do not add other database engines, ORMs, queues, or cloud database services.
- Frontend must never call ComfyUI, access SQLite, or know backend-only env values.
- Backend is the source of truth for durable state. Frontend state is UI state only.
- Store image files on the filesystem and metadata in SQLite. Do not store image binary data in SQLite.
- Do not assume cwd is repo root. Resolve runtime paths explicitly and keep production app data overrides possible.
