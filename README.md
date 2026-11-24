# Silent Pix

Local-first image generation client for ComfyUI workflows.

Silent Pix is designed for long-term personal use:

- PC desktop mode as the main long-running client.
- Phone/browser web mode connecting to the local backend.

Architecture boundaries and implementation constraints are documented so humans and agents can change features safely.

---

## Stack

| Area | Decision |
|---|---|
| Monorepo | pnpm workspace |
| Build | Turborepo |
| Language | TypeScript |
| Frontend | SolidJS + Vite + Tailwind CSS |
| Frontend UI helpers | Ark UI + lucide-solid + clsx |
| Backend | Elysia on Node.js |
| Server events | Generic type-keyed EventServer with an Elysia WebSocket adapter |
| Database | SQLite |
| DB tooling | Drizzle |
| Formatting | ESLint + @stylistic |
| Prettier | Not used |
| Runtime files | Filesystem |
| Production data | Explicitly configured paths outside the repository |
| Dev data | `./.data` |

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

Use Node.js 24 LTS (24.14.0 or newer) for local development, or another version
in the root [`package.json`](package.json) `engines.node` range. Server and
database commands use Node.js package imports starting with `#/`, which older
Node.js versions reject with `ERR_INVALID_MODULE_SPECIFIER`. Check the active
runtime with `node --version` before running `pnpm dev`.

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

```bash
pnpm dev
pnpm dev:web
pnpm dev:server
pnpm dev:desktop

pnpm build:web
pnpm build:desktop
pnpm typecheck
pnpm lint
pnpm lint:fix
pnpm check
pnpm clean

pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:reset
pnpm db:studio
pnpm image:gc
pnpm image:gc:offline -- --confirm-server-stopped
```

`pnpm image:gc` asks the running server to perform image garbage collection.
It does not directly access SQLite or storage and fails without fallback when
the server is unavailable. The offline command is for explicit stopped-server
recovery only and requires the exact confirmation flag.

---

## Deployment

```sh
pnpm deploy:start
pnpm deploy:stop
pnpm deploy:down
```

Deploy start applies database migrations after stopping the old services.
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
