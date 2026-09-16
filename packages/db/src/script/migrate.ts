import { resolve } from 'node:path'

import { migrate } from 'drizzle-orm/libsql/migrator'

import { createDatabaseClient } from '#/client'
import { loadConfig } from '#/config'

const config = loadConfig()
const databaseClient = await createDatabaseClient()

try {
    await migrate(databaseClient.database, {
        migrationsFolder: resolve(config.packageRoot, 'migrations'),
    })
} finally {
    databaseClient.close()
}
