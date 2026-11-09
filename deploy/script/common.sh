#!/usr/bin/env bash

repo_root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
command -v docker >/dev/null || {
    echo 'Docker is unavailable. Enable Docker Desktop WSL Integration or install Docker Engine with Compose.' >&2
    exit 1
}
compose=(docker compose --project-directory "$repo_root" --env-file "$repo_root/.env" -f "$repo_root/deploy/compose.yaml")
