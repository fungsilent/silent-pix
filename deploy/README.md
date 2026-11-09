# Docker Compose deployment

Docker Compose owns the ComfyUI, Server, and Caddy containers. Caddy serves the built Web
UI and proxies `/api` (REST, images, and WebSocket) to `server` on the private
Compose network. Caddy and the ComfyUI UI publish ports on host `127.0.0.1`;
Server has no published host port.
Cloudflare Tunnel remains independently managed.

## Requirements and existing services

- Windows: start Docker Desktop in Linux container mode and enable this Ubuntu
  under Settings → Resources → WSL Integration. Run the scripts from the WSL
  checkout; the same containers appear in Windows Docker Desktop.
- The optional Docker ComfyUI service requires an NVIDIA GPU and working NVIDIA container support
  (Docker Desktop GPU support or NVIDIA Container Toolkit on Linux).
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

`ENV=production`, Node dependency mode `NODE_ENV=production`, and container
`SERVER_HOST=0.0.0.0` are fixed in Compose
for this production setup. The root development values remain usable by Vite
and native Server development. Storage paths, ComfyUI URL/reference directory, and
application ports come from root `.env`. Only the four development endpoint
values are passed as
build arguments because the existing Vite config requires them during build.
No ComfyUI or storage configuration is embedded in the Web image.

For Docker, use **absolute Linux host directories**, mounted at the
same paths inside the container. `DATABASE_PATH` must be inside `APP_DATA_DIR`
so SQLite and its journal survive container replacement. `APP_STORAGE_DIR`
remains independently configurable. For example, adapt these paths to your host:

```dotenv
APP_DATA_DIR=/home/fung/project/silent-pix/.data
DATABASE_PATH=/home/fung/project/silent-pix/.data/silent-pix.sqlite
APP_STORAGE_DIR=/home/fung/project/silent-pix/.data/storage
COMPOSE_PROFILES=comfyui
COMFYUI_OUTPUT_DIR=/home/fung/project/silent-pix/.data/comfyui/output
COMFYUI_BASE_URL=http://comfyui:8188
COMFYUI_REFERENCE_DIR=/home/fung/project/silent-pix/.data/storage
```

Compose creates missing `APP_DATA_DIR`, `APP_STORAGE_DIR`, and
`COMFYUI_OUTPUT_DIR` directories, including their parents, before mounting them. Existing data is reused, not copied or reset. Check these paths
carefully: a typo can create a different empty directory.

With `COMPOSE_PROFILES=comfyui`, ComfyUI is part of the same Compose project
and default network. Set Server's `COMFYUI_BASE_URL` to
`http://comfyui:8188`; the browser uses `http://127.0.0.1:8188`. ComfyUI mounts
`APP_STORAGE_DIR` read-only at the absolute container path selected by
`COMFYUI_REFERENCE_DIR`. Reference images are read directly without uploads or copies.

Docker ComfyUI stores models, input, user, custom_nodes, python-local, cache,
config, and user-scripts under the fixed repository directory `.data/comfyui`.
Existing pre-start scripts continue to run from its `user-scripts` directory.
`COMFYUI_OUTPUT_DIR` selects the shared writable output directory; for integrated
Docker use the absolute host path to `.data/comfyui/output`. External Desktop
can keep its own output path. Server downloads outputs, commits its image
references, then removes the successful ComfyUI output files and history.
ComfyUI's own mounts can create missing data/output directories on first start.
The current containers run as root; files may therefore be root-owned.

To use ComfyUI Desktop or another external ComfyUI, leave `COMPOSE_PROFILES`
empty and set `COMFYUI_BASE_URL`, `APP_STORAGE_DIR`, `COMFYUI_REFERENCE_DIR`,
and `COMFYUI_OUTPUT_DIR`
for that environment. Docker
Server can reach a native host service through `host.docker.internal` (host-gateway
mapping is included); native Server development uses the Desktop server's actual
URL, such as `http://127.0.0.1:8000`. Its port and file paths depend on Desktop's
settings. For WSL to Windows, localhost works with mirrored networking; NAT
mode needs the Windows host IP and a Desktop listener reachable through it
(see [Microsoft WSL networking](https://learn.microsoft.com/en-us/windows/wsl/networking)). `APP_STORAGE_DIR` is the reference-image storage path seen by Server;
`COMFYUI_REFERENCE_DIR` is the same directory as seen by ComfyUI. For a WSL
Server and Windows Desktop, use the Linux path for the former and a Windows
UNC path such as `\\wsl.localhost\Ubuntu\home\fung\project\silent-pix\.data\storage`
for the latter. Both point to the same files; no copy or upload is made. Server
preserves the ComfyUI-side path format rather than resolving it on the Server OS.
`COMFYUI_OUTPUT_DIR` is the output path visible to Server for cleanup.
No Docker ComfyUI service or NVIDIA runtime is required in this mode.
`pnpm dev`, `dev:server`, and `dev:desktop` never start Docker services or read
`COMPOSE_PROFILES`; they continue to use the root ComfyUI connection/path values.
Stop the integrated ComfyUI before switching profiles if it is already running:
`docker compose --project-directory . --env-file .env -f deploy/compose.yaml --profile comfyui stop comfyui`.
Turning a profile off does not stop its existing containers.

When migrating from the standalone `comfy` project, wait for generation to finish
and stop both deployments before moving data. From this repository root:

```sh
pnpm deploy:stop
docker compose --project-directory /home/fung/documents/project/comfy -f /home/fung/documents/project/comfy/deploy/compose.yaml stop
# Confirm .data/comfyui does not exist; do not merge live data directories.
mv -T --no-clobber /home/fung/documents/project/comfy/data .data/comfyui
```

If `.data/comfyui` already exists, inspect both directories before proceeding;
do not overwrite either one. Set `COMFYUI_OUTPUT_DIR` to the absolute path of
`.data/comfyui/output`, then run `pnpm deploy:start`. This moves the existing
models, nodes, settings, caches, input, and output together. Do not restart the
old standalone project: its original data path is no longer the active store.
The application does not move data automatically.

## Build and migrate

All commands below run from the repository root. The wrapper scripts resolve
that root themselves and can be invoked from any working directory.
The `pnpm deploy:*` shortcuts require host pnpm; without it, invoke the matching
`bash deploy/script/start.sh`, `stop.sh`, or `down.sh` directly.

```sh
docker compose --project-directory . --env-file .env -f deploy/compose.yaml config --quiet
docker compose --project-directory . --env-file .env -f deploy/compose.yaml build
```

`pnpm deploy:start` stops the existing project and runs the compiled database
migration in a temporary Server container before starting services. This creates
tables on first deployment and applies pending migrations on upgrades. Back up
existing data before schema upgrades, and stop any writers outside this project.
Historical migration `0002` discards legacy image relations when converting
to content-addressed images; upgrading from before that version needs special
care. Already applied migrations are not rerun.
Migration failure leaves services stopped and exits with an error; inspect the
migration output before retrying. Startup never resets or seeds the database or
runs offline GC. Native development keeps the explicit `pnpm db:migrate` command.

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
then runs migrations before recreating its services. Do not run deployment commands concurrently.
Restarting causes a brief interruption. Wait for generation to finish first:
the current Server does not drain asynchronous generation finalization.
Docker allows one minute for graceful shutdown before forcing termination.

Server has no startup dependency on ComfyUI. Its output bind creates missing
directories directly, including the `.data` parent on first deployment. External
Desktop remains supported. Caddy waits for Server database health. Server can serve stored tasks while ComfyUI is still loading or offline.
Start waits up to 300 seconds for database health and, when the profile is enabled,
ComfyUI's `/system_stats` healthcheck;
a slow first-time model/environment setup may require checking logs and rerunning
start after initialization. ComfyUI health failure makes deployment report failure,
without deleting data. The old pre-start external API probe is replaced by the
optional ComfyUI container healthcheck. External ComfyUI connectivity is reported
by Server runtime health and does not block Compose startup. Acceptance does not
submit generation jobs.
`restart: unless-stopped` brings
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
The playbook does not install Docker or copy source/secrets. Its start action
runs migrations through the same deployment script. Prepare Docker and the
checkout on the target first. Start intentionally rebuilds and recreates
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
