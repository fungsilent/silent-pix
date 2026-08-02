import { dirname, isAbsolute, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import { createDatabaseClient } from '#/client'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(packageRoot, '..', '..')
const configuredPath = process.env.DATABASE_PATH ?? './.local/data/silent-pix.sqlite'
const databasePath = isAbsolute(configuredPath)
    ? configuredPath
    : resolve(repoRoot, configuredPath)
const database = createDatabaseClient(databasePath)

try {
    migrate(database.db, {
        migrationsFolder: resolve(packageRoot, 'migrations')
    })
} finally {
    database.close()
}
