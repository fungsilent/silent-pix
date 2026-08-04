import { createDatabaseClient } from '#/client'
import { loadConfig } from '#/config'
import { taskImages, tasks, workflows } from '#/schema/schema.export'

const config = loadConfig()
const database = await createDatabaseClient(config.databasePath)

try {
    await database.db.transaction(async databaseTransaction => {
        await databaseTransaction.delete(taskImages)
        await databaseTransaction.delete(tasks)
        await databaseTransaction.delete(workflows)
    })

    console.log(`Reset database data at ${config.databasePath}.`)
} finally {
    database.close()
}
