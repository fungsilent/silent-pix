#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
"${compose[@]}" config --quiet
"${compose[@]}" build
"${compose[@]}" run --rm --no-deps web caddy validate --config /etc/caddy/Caddyfile
check_comfyui
# Stop the old writer before recreating either service or changing its data mounts.
"${compose[@]}" stop
exec "${compose[@]}" up -d --force-recreate --wait --wait-timeout 90
