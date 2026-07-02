import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import 'dotenv/config'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

export type ServerEnv = {
    nodeEnv: string
    serverHost: string
    serverPort: number
    appDataDir: string
    databasePath: string
    appStorageDir: string
    comfyuiBaseUrl: string
}

export function loadEnv(): ServerEnv {
    const appDataDir = resolveRuntimePath(process.env.APP_DATA_DIR ?? './.local/data')

    return {
        nodeEnv: process.env.NODE_ENV ?? 'development',
        serverHost: process.env.SERVER_HOST ?? '127.0.0.1',
        serverPort: readPort(process.env.SERVER_PORT, 3070),
        appDataDir,
        databasePath: resolveRuntimePath(process.env.DATABASE_PATH ?? './.local/data/silent-pix.sqlite'),
        appStorageDir: resolveRuntimePath(process.env.APP_STORAGE_DIR ?? './.local/data/storage'),
        comfyuiBaseUrl: process.env.COMFYUI_BASE_URL ?? 'http://127.0.0.1:8188',
    }
}

export function getRepoRoot(): string {
    return repoRoot
}

export function resolveRuntimePath(pathValue: string): string {
    if (isAbsolute(pathValue)) {
        return pathValue
    }

    return resolve(repoRoot, pathValue)
}

function readPort(value: string | undefined, fallback: number): number {
    if (!value) {
        return fallback
    }

    const port = Number.parseInt(value, 10)

    if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        return fallback
    }

    return port
}
