import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { config } from 'dotenv'

export type BaseConfig = {
    repoRoot: string
    databasePath: string
}

export type PackageConfig = BaseConfig & {
    packageRoot: string
}

export function loadBaseConfig(): BaseConfig {
    const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
    config({ path: resolve(repoRoot, '.env') })

    const dbConfigPath = process.env.DATABASE_PATH
    if (!dbConfigPath) {
        throw new Error('[Env] DATABASE_PATH not set')
    }

    const databasePath = isAbsolute(dbConfigPath)
        ? dbConfigPath
        : resolve(repoRoot, dbConfigPath)

    return {
        repoRoot,
        databasePath,
    }
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
