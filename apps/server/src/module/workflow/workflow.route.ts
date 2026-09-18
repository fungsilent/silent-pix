import { toUUID } from '@silent-pix/db'
import { appApi, workflowApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

import { databaseMiddleware } from '#/middleware/database'
import { eventMiddleware } from '#/middleware/event'
import { toWorkflowSummary } from '#/module/workflow/workflow.model'
import { workflowService } from '#/module/workflow/workflow.service'

import type { Comfy, WorkflowApi } from '@silent-pix/shared'

export const workflowRoutes = new Elysia({ name: 'workflow-routes', prefix: '/workflow' })
    .use(databaseMiddleware)
    .use(eventMiddleware)
    .get(
        '/',
        async ({ databaseClient }) => ({
            options: await workflowService.list(databaseClient.database),
        }),
        {
            response: {
                200: workflowApi.getWorkflowsResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )
    .get(
        '/:workflowId',
        async ({ databaseClient, params, status }) => {
            const workflow = await workflowService.getWorkflowResponse(
                databaseClient.database,
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
        async ({ body, databaseClient, headers, publishEvent, status }) => {
            const created = await workflowService.create(databaseClient.database, {
                name: body.name,
                graph: body.graph,
                configSchema: body.configSchema,
            })

            if (!created.ok) {
                return status(422, toMappingError(created.data))
            }

            const workflow = await workflowService.getWorkflowResponse(databaseClient.database, created.data.id)

            if (!workflow) {
                throw new Error('Created workflow could not be loaded.')
            }

            publishEvent('workflow.changed', {
                workflow: toWorkflowSummary(created.data),
            }, {
                excludeClientId: headers['client-id'],
            })

            return status(201, workflow)
        },
        {
            body: workflowApi.createWorkflowRequest,
            headers: appApi.clientHeaders,
            response: {
                201: workflowApi.createWorkflowResponse,
                422: workflowApi.workflowMutationErrorResponse,
                500: appApi.errorResponse,
            },
        },
    )
    .put(
        '/:workflowId',
        async ({ body, databaseClient, headers, params, publishEvent, status }) => {
            const result = await workflowService.update(
                databaseClient.database,
                toUUID(params.workflowId, 'workflowId'),
                body.revision,
                {
                    name: body.name,
                    graph: body.graph,
                    configSchema: body.configSchema,
                },
            )

            if (!result.ok) {
                if (result.error === 'WORKFLOW_MAPPING_INVALID') {
                    return status(422, toMappingError(result.data))
                }

                const failure = updateFailures[result.error]

                return status(failure.status, {
                    error: {
                        code: result.error,
                        message: failure.message,
                    },
                })
            }

            const workflow = await workflowService.getWorkflowResponse(databaseClient.database, result.data.id)

            if (!workflow) {
                throw new Error('Updated workflow could not be loaded.')
            }

            publishEvent('workflow.changed', {
                workflow: toWorkflowSummary(result.data),
            }, {
                excludeClientId: headers['client-id'],
            })

            return workflow
        },
        {
            params: workflowApi.updateWorkflowParams,
            body: workflowApi.updateWorkflowRequest,
            headers: appApi.clientHeaders,
            response: {
                200: workflowApi.updateWorkflowResponse,
                404: appApi.errorResponse,
                409: appApi.errorResponse,
                422: workflowApi.workflowMutationErrorResponse,
                500: appApi.errorResponse,
            },
        },
    )

    .delete(
        '/:workflowId',
        async ({ databaseClient, headers, params, publishEvent, status }) => {
            const result = await workflowService.remove(
                databaseClient.database,
                toUUID(params.workflowId, 'workflowId'),
            )

            if (!result.ok) {
                return status(404, {
                    error: {
                        code: result.error,
                        message: 'Workflow not found.',
                    },
                })
            }

            const { disposition, workflow } = result.data

            /*
             * 封存的那筆還在，只是換了狀態——發 removed 會讓其他 client 把
             * detail 快取整個丟掉。真刪才是 removed。
            */
            if (disposition === 'archived') {
                publishEvent('workflow.changed', {
                    workflow: toWorkflowSummary(workflow),
                }, {
                    excludeClientId: headers['client-id'],
                })

                return {
                    id: workflow.id,
                    disposition,
                    workflow: toWorkflowSummary(workflow),
                }
            }

            publishEvent('workflow.removed', { workflowId: workflow.id }, {
                excludeClientId: headers['client-id'],
            })

            return {
                id: workflow.id,
                disposition,
                workflow: null,
            }
        },
        {
            params: workflowApi.getWorkflowRequest,
            headers: appApi.clientHeaders,
            response: {
                200: workflowApi.deleteWorkflowResponse,
                404: appApi.errorResponse,
                422: appApi.errorResponse,
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
function toMappingError(issues: Comfy.MappingIssue[]): WorkflowApi.WorkflowMutationErrorResponse {
    return {
        error: {
            code: 'WORKFLOW_MAPPING_INVALID',
            message: issues.length === 1
                ? 'One binding does not resolve against this graph.'
                : `${issues.length} bindings do not resolve against this graph.`,
        },
        issues,
    }
}
