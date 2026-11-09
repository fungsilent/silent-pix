#!/usr/bin/env bash
set -euo pipefail
source "$(dirname -- "${BASH_SOURCE[0]}")/common.sh"
"${compose[@]}" config --quiet
"${compose[@]}" build
"${compose[@]}" run --rm --no-deps web caddy validate --config /etc/caddy/Caddyfile
# Stop the old writer before recreating either service or changing its data mounts.
"${compose[@]}" stop
"${compose[@]}" run --rm --no-deps server packages/db/dist/script/migrate.js
exec "${compose[@]}" up -d --force-recreate --wait --wait-timeout 300
