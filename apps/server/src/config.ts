import { isAbsolute, resolve } from 'node:path'

import { envValue, loadBaseConfig } from '@silent-pix/env'

import type { BaseConfig } from '@silent-pix/env'

const config = loadBaseConfig()

export type ServerConfig = BaseConfig & {
    env: string
    serverHost: string
    serverPort: number
    appDataDir: string
    comfyuiBaseUrl: string
    comfyuiReferenceDir: string
    comfyuiOutputDir: string
}

export function loadConfig(): ServerConfig {
    return {
        ...config,
        env: envValue('ENV', process.env.ENV),
        serverHost: envValue('SERVER_HOST', process.env.SERVER_HOST),
        serverPort: Number(envValue('SERVER_PORT', process.env.SERVER_PORT)),
        appDataDir: resolveePath(envValue('APP_DATA_DIR', process.env.APP_DATA_DIR)),
        comfyuiBaseUrl: envValue('COMFYUI_BASE_URL', process.env.COMFYUI_BASE_URL),
        comfyuiReferenceDir: absoluteReferenceDir(envValue('COMFYUI_REFERENCE_DIR', process.env.COMFYUI_REFERENCE_DIR)),
        comfyuiOutputDir: resolveePath(envValue('COMFYUI_OUTPUT_DIR', process.env.COMFYUI_OUTPUT_DIR)),
    }
}

export function resolveePath(pathValue: string): string {
    if (isAbsolute(pathValue)) {
        return pathValue
    }

    return resolve(config.repoRoot, pathValue)
}

function absoluteReferenceDir(value: string): string {
    if (!/^([a-zA-Z]:[\\/]|\\\\|\/)/.test(value)) {
        throw new Error('[Env] COMFYUI_REFERENCE_DIR must be an absolute path ComfyUI can open')
    }

    return value
}
