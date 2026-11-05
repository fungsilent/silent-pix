# Docker Compose deployment

Docker Compose owns the Server and Caddy containers. Caddy serves the built Web
UI and proxies `/api` (REST, images, and WebSocket) to `server` on the private
Compose network. Only Caddy publishes a port, bound to host `127.0.0.1`.
Cloudflare Tunnel remains independently managed.

## Requirements and existing services

- Windows: start Docker Desktop in Linux container mode and enable this Ubuntu
  under Settings → Resources → WSL Integration. Run the scripts from the WSL
  checkout; the same containers appear in Windows Docker Desktop.
- Linux: install Docker Engine and the Compose plugin; the deployment account
  must be able to use Docker. No host Node.js, pnpm, or Caddy is needed.
- Stop old manually started Servers and Caddy before migration. If the previous
  user services were installed, run
  `systemctl --user disable --now silent-pix-caddy silent-pix-server` once.
  These scripts do not stop unrelated host services or migrate their data.
- Run one Server writer per database/storage pair. Do not run the old dev Server,
  another checkout, or a second Compose project against these paths.

## Root .env

Keep the root `.env` as the deployment configuration source. Do not overwrite an
existing file with `.env.example`. Compose reads it explicitly; no script
sources it as shell code, and it is excluded from image builds.

`NODE_ENV=production` and container `SERVER_HOST=0.0.0.0` are fixed in Compose
for this production setup. The root development values remain usable by Vite
and native Server development. All ports, ComfyUI settings, and storage paths
come from root `.env`. Only the four development endpoint values are passed as
build arguments because the existing Vite config requires them during build.
No ComfyUI or storage configuration is embedded in the Web image.

For Docker, use existing **absolute Linux host directories**, mounted at the
same paths inside the container. `DATABASE_PATH` must be inside `APP_DATA_DIR`
so SQLite and its journal survive container replacement. `APP_STORAGE_DIR`
remains independently configurable. For example, adapt these paths to your host:

```dotenv
APP_DATA_DIR=/home/fung/project/silent-pix/.data
DATABASE_PATH=/home/fung/project/silent-pix/.data/silent-pix.sqlite
APP_STORAGE_DIR=/home/fung/project/silent-pix/.data/storage
COMFYUI_OUTPUT_DIR=/mnt/c/path/to/ComfyUI/output
COMFYUI_STORAGE_PREFIX=\\wsl.localhost\Ubuntu\home\fung\project\silent-pix\.data\storage
COMFYUI_BASE_URL=http://host.docker.internal:8000
```

Create the data/storage directories deliberately before starting; bind mounts
have `create_host_path: false` so a typo cannot silently create a different
empty storage directory. Existing data is reused, not copied or reset.
The current Server container runs as root; Linux bind-mount files it creates
may therefore be root-owned. Account for ownership before switching back to
native development; scripts do not recursively change permissions.

For Windows ComfyUI, `host.docker.internal` reaches the host from Docker Desktop.
ComfyUI must listen on an interface reachable from Docker and the firewall must
allow that connection. For Linux, the Compose host-gateway mapping supplies the
same name, but a service listening only on host loopback may not be reachable.
`COMFYUI_STORAGE_PREFIX` is still the path **ComfyUI** can open, not necessarily
the path inside the Server container. The output mount is writable because the
Server removes successful ComfyUI output files. Containers do not upload or
create separate reference-image copies.

## Build and migrate

All commands below run from the repository root. The wrapper scripts resolve
that root themselves and can be invoked from any working directory.
The `pnpm deploy:*` shortcuts require host pnpm; without it, invoke the matching
`bash deploy/script/start.sh`, `stop.sh`, or `down.sh` directly.

```sh
docker compose --project-directory . --env-file .env -f deploy/compose.yaml config --quiet
docker compose --project-directory . --env-file .env -f deploy/compose.yaml build
```

For a new database or schema upgrade, stop all writers and back up existing data
before explicitly running the compiled migration script:

```sh
pnpm deploy:stop
docker compose --project-directory . --env-file .env -f deploy/compose.yaml run --rm --no-deps server packages/db/dist/script/migrate.js
```

There is no automatic migration, reset, seed, or offline GC on startup.

## Start, stop, down

```sh
# Build and start in the background; also applies changed .env/Caddyfile/code.
pnpm deploy:start

# Stop services; preserve containers, network, bind-mounted data, and images.
pnpm deploy:stop

# Remove deployment containers/network; preserve bind-mounted data and images.
pnpm deploy:down

```

All three commands use the same `silent-pix` Compose project. Start validates
Compose, builds images, and validates Caddy before stopping the existing project
and recreating its services. Do not run deployment commands concurrently.
Restarting causes a brief interruption. Wait for generation to finish first:
the current Server does not drain asynchronous generation finalization.
Docker allows one minute for graceful shutdown before forcing termination.

Start waits for Server database health before starting Caddy; ComfyUI being
offline does not block deployment or viewing stored tasks. Before stopping the
existing project, start runs one HTTP connectivity check from a temporary
Server container with a five-second timeout. Failure prints a deployment warning
and continues; no warning is added to Server runtime. This check uses the existing
Server mounts, so their paths must already be valid. ComfyUI is deployed independently. Deployment
acceptance covers Backend/Frontend startup, HTTP, and WebSocket; it does not
submit generation jobs. Required env values and Docker mount paths must still
be valid for the containers to start. `restart: unless-stopped` brings
running containers back after Docker restarts, but does not restart ones you
explicitly stopped. Build failures leave the running deployment untouched;
startup failures are reported without deleting data. Inspect logs before retrying.

```sh
docker compose --project-directory . --env-file .env -f deploy/compose.yaml ps
docker compose --project-directory . --env-file .env -f deploy/compose.yaml logs -f
```

Windows Docker Desktop can inspect logs and start/stop the project. To apply
changed files or environment settings, rerun start.sh; a Dashboard restart alone
does not rebuild images or recreate the configuration.

## Ansible (local or SSH)

Ansible checks the target's existing checkout, root `.env`, Docker access, and
Compose configuration, then calls the same start/stop/down scripts. Compose remains
the service/configuration owner; no systemd units or second envfile are generated.
The playbook does not install Docker, copy source/secrets, or run migrations.
Prepare those on the target first. Start intentionally rebuilds and recreates
containers on every run, so it is reported as changed rather than claiming
idempotence. Stop and down also report the action as changed.

On the controller (WSL works), use Python 3.13 or newer and a virtual environment:

```sh
python3 -m venv ~/.local/share/silent-pix-ansible
~/.local/share/silent-pix-ansible/bin/pip install -r deploy/ansible/requirements.txt
```

If Python reports missing `venv`/`ensurepip`, install the distribution's matching
Python venv package first. Only `ansible-core` is needed; no collection install
is required. Run these commands from the repository root:

```sh
# Read-only preflight; the deployment action is skipped.
~/.local/share/silent-pix-ansible/bin/ansible-playbook -i deploy/ansible/inventory.yml deploy/ansible/deploy.yml --check

# Build/start/update using the local inventory.
~/.local/share/silent-pix-ansible/bin/ansible-playbook -i deploy/ansible/inventory.yml deploy/ansible/deploy.yml

# Stop without deleting persistent data.
~/.local/share/silent-pix-ansible/bin/ansible-playbook -i deploy/ansible/inventory.yml deploy/ansible/deploy.yml -e deployment_action=stop

# Remove containers/network without deleting persistent data.
~/.local/share/silent-pix-ansible/bin/ansible-playbook -i deploy/ansible/inventory.yml deploy/ansible/deploy.yml -e deployment_action=down

```

For a remote Linux host, keep a private inventory outside version control and
pass its path with `-i` instead. The root path is on the **target**, not the
controller. The target needs Python compatible with the pinned Ansible version
and the SSH account must already have Docker access:

```yaml
silent_pix:
  hosts:
    production:
      ansible_host: linux.example.com
      ansible_user: deploy
      silent_pix_root: /srv/silent-pix
```

No sudo/become is used by the playbook. If Docker group membership was just
changed, start a new login session before running it.

## Local acceptance and Cloudflare Tunnel

Open `http://localhost:<CADDY_PORT>` in Windows Browser (the current example port
is `3000`). Verify UI navigation, refresh, task/image API responses, and the
`/api/event` WebSocket upgrade (`101`). The host port does not expose the Server
or Caddy's admin endpoint, so a host Caddy admin listener on 2019 does not conflict.

For cloudflared running on this host, set its service URL to
`http://127.0.0.1:<CADDY_PORT>` and leave `httpHostHeader` unset. Caddy preserves
the external Host for the Server's Origin check. A separately containerized
cloudflared needs a shared Docker network; its own `127.0.0.1` is not this host.

Verify the public HTTPS hostname, API requests, and WSS event connection after
connecting the Tunnel. TLS terminates at Cloudflare; Caddy serves local HTTP.
Cron/timers are not configured by this deployment. Online GC can use the
existing compiled CLI in the running Server container; never schedule offline
GC against a running writer.
