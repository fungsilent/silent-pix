import { resolve } from 'node:path'

import { migrate } from 'drizzle-orm/libsql/migrator'

import { createDatabaseClient } from '#/client'
import { loadConfig } from '#/config'

const config = loadConfig()
const database = await createDatabaseClient(config.databasePath)

try {
    await migrate(database.db, {
        migrationsFolder: resolve(config.packageRoot, 'migrations'),
    })
} finally {
    database.close()
}
