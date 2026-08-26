import { toUUID } from '@silent-pix/db'
import { appApi, workflowApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

import { databaseMiddleware } from '#/middleware/database'
import { eventMiddleware } from '#/middleware/event'
import { workflowChanged } from '#/module/workflow/workflow.event'
import { workflowService } from '#/module/workflow/workflow.service'

import type { WorkflowApi } from '@silent-pix/shared'

export const workflowRoutes = new Elysia({ name: 'workflow-routes', prefix: '/workflow' })
    .use(databaseMiddleware)
    .use(eventMiddleware)
    .get(
        '/',
        async ({ database, query }) => ({
            options: await workflowService.list(database, query.scope),
        }),
        {
            query: workflowApi.getWorkflowsQuery,
            response: {
                200: workflowApi.getWorkflowsResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )
    .get(
        '/:workflowId',
        async ({ database, params, status }) => {
            const workflow = await workflowService.getWorkflowResponse(
                database,
                toUUID(params.workflowId, 'workflowId'),
            )

            if (!workflow) {
                return status(404, {
                    error: {
                        code: 'WORKFLOW_NOT_FOUND',
                        message: 'Workflow not found.',
                    },
                })
            }

            return workflow
        },
        {
            params: workflowApi.getWorkflowRequest,
            response: {
                200: workflowApi.getWorkflowResponse,
                404: appApi.errorResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )
    .post(
        '/',
        async ({ body, database, pushEvent, status }) => {
            const checked = workflowService.checkMapping(body.graph, body.configSchema)

            if (!checked.ok) {
                return status(422, toMappingError(checked))
            }

            const created = await workflowService.create(database, {
                name: body.name,
                graph: checked.data,
                configSchema: body.configSchema,
            })

            const workflow = await workflowService.getWorkflowResponse(database, created.id)

            if (!workflow) {
                throw new Error('Created workflow could not be loaded.')
            }

            pushEvent(workflowChanged({
                id: workflow.id,
                name: workflow.name,
                revision: workflow.revision,
                archivedAt: workflow.archivedAt,
            }))

            return status(201, workflow)
        },
        {
            body: workflowApi.createWorkflowRequest,
            response: {
                201: workflowApi.createWorkflowResponse,
                422: workflowApi.workflowMutationErrorResponse,
                500: appApi.errorResponse,
            },
        },
    )
    .put(
        '/:workflowId',
        async ({ body, database, params, pushEvent, status }) => {
            const checked = workflowService.checkMapping(body.graph, body.configSchema)

            if (!checked.ok) {
                return status(422, toMappingError(checked))
            }

            const result = await workflowService.update(
                database,
                toUUID(params.workflowId, 'workflowId'),
                body.revision,
                {
                    graph: checked.data,
                    configSchema: body.configSchema,
                },
            )

            if (!result.ok) {
                const failure = updateFailures[result.error]

                return status(failure.status, {
                    error: {
                        code: result.error,
                        message: failure.message,
                    },
                })
            }

            const workflow = await workflowService.getWorkflowResponse(database, result.data.id)

            if (!workflow) {
                throw new Error('Updated workflow could not be loaded.')
            }

            pushEvent(workflowChanged({
                id: workflow.id,
                name: workflow.name,
                revision: workflow.revision,
                archivedAt: workflow.archivedAt,
            }))

            return workflow
        },
        {
            params: workflowApi.updateWorkflowParams,
            body: workflowApi.updateWorkflowRequest,
            response: {
                200: workflowApi.updateWorkflowResponse,
                404: appApi.errorResponse,
                409: appApi.errorResponse,
                422: workflowApi.workflowMutationErrorResponse,
                500: appApi.errorResponse,
            },
        },
    )

const updateFailures = {
    WORKFLOW_NOT_FOUND: { status: 404, message: 'Workflow not found.' },
    WORKFLOW_ARCHIVED: { status: 409, message: 'This workflow is archived and cannot be edited.' },
    WORKFLOW_REVISION_CONFLICT: {
        status: 409,
        message: 'This workflow changed elsewhere. Reload it before saving again.',
    },
} as const satisfies Record<string, { status: number, message: string }>

/* service 只回 code 與證據，人話留在 route */
function toMappingError(failure: Extract<ReturnType<typeof workflowService.checkMapping>, { ok: false }>): WorkflowApi.WorkflowMutationErrorResponse {
    return {
        error: {
            code: failure.error,
            message: failure.data.length === 1
                ? 'One binding does not resolve against this graph.'
                : `${failure.data.length} bindings do not resolve against this graph.`,
        },
        issues: failure.data,
    }
}
