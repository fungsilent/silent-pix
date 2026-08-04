import { createDatabaseClient } from '#/client'
import { loadConfig } from '#/config'
import { taskImages, tasks, workflows } from '#/schema/schema.export'

const config = loadConfig()
const database = createDatabaseClient(config.databasePath)

try {
    database.db.transaction(databaseTransaction => {
        databaseTransaction.delete(taskImages).run()
        databaseTransaction.delete(tasks).run()
        databaseTransaction.delete(workflows).run()
    })

    console.log(`Reset database data at ${config.databasePath}.`)
} finally {
    database.close()
}
