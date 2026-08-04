import { isAbsolute, resolve } from 'node:path'

import { envValue, loadBaseConfig } from '@silent-pix/env'

import type { BaseConfig } from '@silent-pix/env'

const config = loadBaseConfig()

export type ServerConfig = BaseConfig & {
    nodeEnv: string
    serverHost: string
    serverPort: number
    appDataDir: string
    appStorageDir: string
    comfyuiBaseUrl: string
}

export function loadConfig(): ServerConfig {
    return {
        ...config,
        nodeEnv: envValue('NODE_ENV', process.env.NODE_ENV),
        serverHost: envValue('SERVER_HOST', process.env.SERVER_HOST),
        serverPort: Number(envValue('SERVER_PORT', process.env.SERVER_PORT)),
        appDataDir: resolveePath(envValue('APP_DATA_DIR', process.env.APP_DATA_DIR)),
        appStorageDir: resolveePath(envValue('APP_STORAGE_DIR', process.env.APP_STORAGE_DIR)),
        comfyuiBaseUrl: envValue('COMFYUI_BASE_URL', process.env.COMFYUI_BASE_URL),
    }
}

export function resolveePath(pathValue: string): string {
    if (isAbsolute(pathValue)) {
        return pathValue
    }

    return resolve(config.repoRoot, pathValue)
}
