#!/usr/bin/env bash

repo_root=$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)
command -v docker >/dev/null || {
    echo 'Docker is unavailable. Enable Docker Desktop WSL Integration or install Docker Engine with Compose.' >&2
    exit 1
}
compose=(docker compose --project-directory "$repo_root" --env-file "$repo_root/.env" -f "$repo_root/deploy/compose.yaml")

comfyui_configured=false
comfyui_base_url=''
comfyui_storage_prefix=''
comfyui_output_dir=''
comfyui_env=$("${compose[@]}" config --environment | sed -n '/^COMFYUI_\(BASE_URL\|STORAGE_PREFIX\|OUTPUT_DIR\)=/p')
while IFS='=' read -r name value; do
    case "$name" in
        COMFYUI_BASE_URL) comfyui_base_url=$value ;;
        COMFYUI_STORAGE_PREFIX) comfyui_storage_prefix=$value ;;
        COMFYUI_OUTPUT_DIR) comfyui_output_dir=$value ;;
    esac
done <<< "$comfyui_env"
if [[ -n "$comfyui_base_url" && -n "$comfyui_storage_prefix" && "$comfyui_output_dir" = /* && -d "$comfyui_output_dir" ]]; then
    compose+=(-f "$repo_root/deploy/compose.comfyui.yaml")
    comfyui_configured=true
fi

check_comfyui() {
    if [ "$comfyui_configured" = false ]; then
        echo 'WARNING: ComfyUI is unconfigured or its output directory is unavailable; deploying Backend/Frontend without ComfyUI.' >&2
        return
    fi
    "${compose[@]}" run --rm --no-deps --entrypoint node server -e '
        fetch(process.env.COMFYUI_BASE_URL, { signal: AbortSignal.timeout(5000) })
            .then(response => { if (!response.ok) process.exitCode = 1 })
            .catch(() => { process.exitCode = 1 })
    ' || echo 'WARNING: ComfyUI connectivity check failed; continuing deployment.' >&2
}
