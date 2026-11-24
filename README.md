# Silent Pix

Local-first image generation client for ComfyUI workflows.

Silent Pix is designed for long-term personal use:

- PC desktop mode as the main long-running client.
- Phone/browser web mode connecting to the local backend.

Architecture boundaries and implementation constraints are documented so humans and agents can change features safely.

---

## Tech Stack

| Area | Technology |
|---|---|
| Workspace and build | pnpm workspaces, Turborepo 2 |
| Language | TypeScript 7 |
| Web UI | SolidJS 1.9, Vite 8, Tailwind CSS 4, Ark UI 5, lucide-solid, clsx |
| Web data and forms | TanStack Query 5, TanStack Form 1, Eden Treaty 1.4 |
| Localization | i18next 27 |
| Server | Elysia 1.4 on Node.js, with REST and WebSocket |
| Shared contracts | Zod 4 |
| Database | SQLite via libSQL, Drizzle ORM 0.45 |
| Desktop | Tauri 2 and Rust |
| Design blueprint | Astro 7 and Starlight 0.42 |
| Linting and formatting | ESLint 10 and `@stylistic` 5 |

---

## Architecture Summary

Desktop and Browser share the Web UI and communicate with Server through REST
and WebSocket. Server owns durable state in SQLite, image bytes on the filesystem,
and ComfyUI execution. See [Architecture](docs/architecture.md) for package
boundaries, consistency guarantees, runtime targets, and known gaps.

---

## Repo Structure

```txt
apps/
    web/        shared SolidJS UI
    server/     Elysia backend
    desktop/    Tauri shell and native Server settings
    design/     independent design blueprint content

packages/
    shared/     canonical domain values and REST/event contracts
    event/      browser WebSocket client and generic type-keyed WS server helper
    db/         SQLite / Drizzle schema, client, migrations, maintenance
    env/        Node-only base env loading and path resolution
    blueprint/  reusable design blueprint framework

docs/
    architecture.md
    conventions.md
```

---

## Runtime Data

Development:

```txt
.data/
    silent-pix.sqlite
    storage/
        images/
```

Production must explicitly configure persistent paths outside the repository.
Automatic Desktop app-data path overrides are not implemented. OS app-data
directory examples:

```txt
Windows: %APPDATA%/Silent Pix/
macOS:   ~/Library/Application Support/Silent Pix/
Linux:   ~/.config/Silent Pix/
```

SQLite records should prefer relative paths.

---

## Environment

### Local development requirements

| Tool | Version |
|---|---|
| Node.js | `^24.14.0 \|\| >=25.4.0` |
| pnpm | `^12.16.1` |

Node.js 24 LTS is recommended for local development. If Server or database
commands fail with `ERR_INVALID_MODULE_SPECIFIER` for `#/` imports, check
`node --version`. Check pnpm with `pnpm --version`. The root
[`package.json`](package.json) declares both ranges.

For native Desktop development, see the
[Desktop prerequisites](apps/desktop/README.md#prerequisites).

### Configuration

Copy `.env.example` to `.env`; it lists every variable with its development
default.

ComfyUI connection and filesystem values are backend-only. Runtime capabilities
read their env-backed configuration directly; callers pass domain inputs, not
database paths, base URLs, storage roots, or ComfyUI filesystem roots. Change
runtime configuration through `.env`/process env rather than function options.

The repository-root `.env` is the shared development endpoint source for
Browser Vite, Desktop Vite, and Tauri. `SERVER_URL` is an optional
process-environment override for the Vite `/api` proxy and is intentionally not
required in `.env.example`.

---

## Scripts

Run these commands from the repository root. For Docker Compose commands, see
[Deployment](#deployment).

### Development and builds

| Command | Purpose |
|---|---|
| `pnpm dev` | Starts the Web and Server development processes. |
| `pnpm dev:web` | Starts the Web development server in browser mode. |
| `pnpm dev:server` | Starts Server in watch mode. |
| `pnpm dev:desktop` | Starts Vite and launches the Tauri development window. |
| `pnpm dev:design` | Starts the Design Blueprint development server. |
| `pnpm build:web` | Builds Web and its workspace dependencies. |
| `pnpm build:desktop` | Builds and packages the Tauri app for the host operating system. |
| `pnpm build:design` | Builds the Design Blueprint and validates its content and references. |

### Checks and cleanup

| Command | Purpose |
|---|---|
| `pnpm typecheck` | Type-checks the TypeScript workspace. |
| `pnpm lint` | Checks the repository with ESLint. |
| `pnpm lint:fix` | Applies available ESLint fixes. |
| `pnpm check` | Runs `pnpm typecheck` and `pnpm lint`. |
| `pnpm check:design` | Checks Design Blueprint preview layouts in Chromium. |
| `pnpm clean` | Deletes Git-ignored files and directories, including `.env` and `.data/`. |

### Database and image maintenance

| Command | Purpose |
|---|---|
| `pnpm db:generate` | Generates a migration from Drizzle schema changes. |
| `pnpm db:migrate` | Applies pending database migrations. |
| `pnpm db:seed` | Loads or updates the bundled Workflow examples. |
| `pnpm db:reset` | Deletes all Task, Workflow, and image metadata records from SQLite. |
| `pnpm db:studio` | Starts Drizzle Studio for inspecting the configured database. |
| `pnpm image:gc` | Requests image garbage collection from the running Server. Fails if Server is unavailable. |
| `pnpm image:gc:offline -- --confirm-server-stopped` | Runs image garbage collection for stopped-server recovery. Requires the exact confirmation flag. |

---

## Deployment

| Command | Purpose |
|---|---|
| `pnpm deploy:start` | Builds the images, stops existing services, applies database migrations, and starts the services. |
| `pnpm deploy:stop` | Stops the deployment services. |
| `pnpm deploy:down` | Stops the services and removes deployment containers and networks. |

See [`deploy/README.md`](deploy/README.md) for Docker Compose deployment of optional ComfyUI, the Web UI, Caddy, and Server,
with WSL/Docker Desktop testing, Ansible local/SSH orchestration, and a separately
managed Cloudflare Tunnel.

---

## Database Browsing

```bash
pnpm db:studio
```

Then open <https://local.drizzle.studio> in the browser.

WSL note: do not point a Windows GUI client (DBGate, DB Browser, etc.) at the SQLite file
through `\\wsl.localhost\...`. That path goes over 9P, which has no POSIX advisory locks and
cannot mmap the WAL `-shm` file, so every connection fails with `SQLITE_BUSY: database is locked`.
Run `pnpm db:studio` inside WSL instead — WSL2 forwards the port, so the browser on Windows works
while the database file stays local to Linux.

To inspect a copy in a Windows tool anyway, snapshot it first:

```bash
cp .data/silent-pix.sqlite /mnt/c/Users/<you>/Desktop/silent-pix-snapshot.sqlite
```

The snapshot is read-only in practice; writes there never reach the real database.

---

## Docs

Read the implementation constraints and the documentation relevant to the change:

- [AGENTS.md](AGENTS.md): implementation constraints and document update rules.
- [Architecture](docs/architecture.md): system boundaries, flows, guarantees, and known gaps.
- [Conventions](docs/conventions.md): reusable implementation practices.
- [Design blueprint](apps/design/README.md) and [framework](packages/blueprint/README.md): authoring, component API, and validation; run the blueprint with `pnpm dev:design`.
- [Desktop](apps/desktop/README.md) and [Deployment](deploy/README.md): setup and operation.

Each document owns its explanation. Update it when that explanation changes;
ordinary implementation changes do not require editing every document.
