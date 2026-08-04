import { resolve } from 'node:path'

import { migrate } from 'drizzle-orm/better-sqlite3/migrator'

import { createDatabaseClient } from '#/client'
import { loadConfig } from '#/config'

const config = loadConfig()
const database = createDatabaseClient(config.databasePath)

try {
    migrate(database.db, {
        migrationsFolder: resolve(config.packageRoot, 'migrations'),
    })
} finally {
    database.close()
}
