import { workflows } from '@silent-pix/db'
import { asc } from 'drizzle-orm'

import type { DatabaseClient } from '@silent-pix/db'

export const workflowService = {
    async list(database: DatabaseClient) {
        // MARK: CRUD
        const _workflows = await database.db
            .select()
            .from(workflows)
            .orderBy(asc(workflows.name))

        return _workflows
    },
}
