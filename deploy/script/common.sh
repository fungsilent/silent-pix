#!/usr/bin/env bash

repo_root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
command -v docker >/dev/null || {
    echo 'Docker is unavailable. Enable Docker Desktop WSL Integration or install Docker Engine with Compose.' >&2
    exit 1
}
compose=(docker compose --project-directory "$repo_root" --env-file "$repo_root/.env" -f "$repo_root/deploy/compose.yaml")

check_comfyui() {
    "${compose[@]}" run --rm --no-deps --entrypoint node server -e '
        fetch(process.env.COMFYUI_BASE_URL, { signal: AbortSignal.timeout(5000) })
            .then(response => { if (!response.ok) process.exitCode = 1 })
            .catch(() => { process.exitCode = 1 })
    ' || echo 'WARNING: ComfyUI connectivity check failed; continuing deployment.' >&2
}
