import { workflows } from '@silent-pix/db'
import { asc, eq } from 'drizzle-orm'

import { castWorkflowModel } from '#/module/workflow/workflow.model'

import type { DatabaseClient } from '@silent-pix/db'
import type { WorkflowModel } from '#/module/workflow/workflow.model'

export const workflowService = {
    // MARK: CRUD
    async findWorkflow(database: DatabaseClient, workflowId: WorkflowModel['id']) {
        const [workflow] = await database.db
            .select()
            .from(workflows)
            .where(eq(workflows.id, workflowId))

        return workflow
            ? castWorkflowModel(workflow)
            : null
    },

    // MARK: service
    async list(database: DatabaseClient) {
        const _workflows = await database.db
            .select()
            .from(workflows)
            .orderBy(asc(workflows.name))

        return _workflows
    },
}
