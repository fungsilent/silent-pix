import { createDatabaseClient } from '#/client'
import { loadConfig } from '#/config'
import { images, taskImages, tasks, workflows } from '#/schema/schema.export'

const config = loadConfig()
const databaseClient = await createDatabaseClient()

try {
    await databaseClient.database.transaction(async databaseTransaction => {
        await databaseTransaction.delete(taskImages)
        await databaseTransaction.delete(tasks)
        await databaseTransaction.delete(images)
        await databaseTransaction.delete(workflows)
    })

    console.log(`Reset database data at ${config.databasePath}.`)
} finally {
    databaseClient.close()
}
