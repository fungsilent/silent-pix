import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { config } from 'dotenv'

export type BaseConfig = {
    repoRoot: string
    databasePath: string
    appStorageDir: string
}

export type PackageConfig = BaseConfig & {
    packageRoot: string
}

export function loadBaseConfig(): BaseConfig {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
    config({ path: resolve(repoRoot, '.env') })

    return {
        repoRoot,
        databasePath: resolveRepoPath(repoRoot, 'DATABASE_PATH', process.env.DATABASE_PATH),
        appStorageDir: resolveRepoPath(repoRoot, 'APP_STORAGE_DIR', process.env.APP_STORAGE_DIR),
    }
}

function resolveRepoPath(repoRoot: string, key: string, value: string | undefined): string {
    if (!value) {
        throw new Error(`[Env] ${key} not set`)
    }

    return isAbsolute(value) ? value : resolve(repoRoot, value)
}

export function loadPackageConfig(paths: string[]): PackageConfig {
    const baseConfig = loadBaseConfig()

    return {
        ...baseConfig,
        packageRoot: resolve(baseConfig.repoRoot, ...paths),
    }
}

export function envValue<V>(key: string, value: V): NonNullable<V> {
    if (!value) {
        throw new Error(`[Env] ${key} is not set`)
    }
    return value
}
