import { appApi, workflowApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

import { databaseMiddleware } from '#/middleware/database'
import { workflowService } from '#/module/workflow/workflow.service'

export const workflowRoutes = new Elysia({ name: 'workflow-routes', prefix: '/workflow' })
    .use(databaseMiddleware)
    .get(
        '/',
        async ({ database }) => {
            const workflows = await workflowService.list(database)

            return {
                options: workflows.map(workflow => ({
                    id: workflow.id,
                    name: workflow.name,
                    revision: workflow.revision,
                    archivedAt: workflow.archivedAt === null
                        ? null
                        : new Date(workflow.archivedAt).toISOString(),
                })),
            }
        },
        {
            response: {
                200: workflowApi.getWorkflowsResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )
