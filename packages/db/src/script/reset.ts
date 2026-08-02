import { isAbsolute, resolve } from 'node:path'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDatabaseClient } from '#/client'
import { taskImages, tasks, workflows } from '#/schema'

if (!process.argv.slice(2).includes('--confirm')) {
    throw new Error('Database reset requires the --confirm argument.')
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const repoRoot = resolve(packageRoot, '..', '..')
const configuredPath = process.env.DATABASE_PATH ?? './.local/data/silent-pix.sqlite'
const databasePath = isAbsolute(configuredPath)
    ? configuredPath
    : resolve(repoRoot, configuredPath)
const database = createDatabaseClient(databasePath)

try {
    database.db.transaction(databaseTransaction => {
        databaseTransaction.delete(taskImages).run()
        databaseTransaction.delete(tasks).run()
        databaseTransaction.delete(workflows).run()
    })

    console.log(`Reset database data at ${databasePath}.`)
} finally {
    database.close()
}
