import { z } from 'zod'

import { configSchema } from '#shared/contract/workflow/config'
import * as comfy from '#shared/contract/workflow/graph'
import { workflowName, workflowSummary } from '#shared/contract/workflow/resource'

export type { WorkflowSummary } from '#shared/contract/workflow/resource'

/* MARK: params */

const getWorkflowRequest = z.object({
    workflowId: z.uuid(),
})

const updateWorkflowParams = getWorkflowRequest

/* MARK: request */

const createWorkflowRequest = z.object({
    name: workflowName,
    graph: comfy.graph,
    configSchema,
})

const updateWorkflowRequest = z.object({
    revision: z.number().int().positive(),
    name: workflowName,
    graph: comfy.graph,
    configSchema,
})

/* MARK: response */

const getWorkflowsResponse = z.object({
    options: z.array(workflowSummary),
})

const getWorkflowResponse = workflowSummary.extend({
    /* NOTE: 決定 Delete 會封存還是真刪，按下之前就要知道 */
    taskCount: z.number().int().nonnegative(),
    graph: comfy.graph,
    configSchema,
})

const createWorkflowResponse = getWorkflowResponse

const updateWorkflowResponse = getWorkflowResponse

const deleteWorkflowResponse = z.object({
    id: z.uuid(),
    /* NOTE: 有 task 引用就是 archived，零引用才是 deleted */
    disposition: z.enum(['archived', 'deleted']),
    workflow: workflowSummary.nullable(),
})

/* MARK: errors */

const workflowMappingErrorResponse = z.object({
    error: z.object({
        code: z.literal('WORKFLOW_MAPPING_INVALID'),
        message: z.string(),
    }),
    issues: z.array(comfy.mappingIssue),
})

const workflowValidationErrorResponse = z.object({
    error: z.object({
        code: z.literal('VALIDATION_ERROR'),
        message: z.string(),
    }),
})

const workflowMutationErrorResponse = z.union([
    workflowMappingErrorResponse,
    workflowValidationErrorResponse,
])

/* MARK: catalog */

export const workflowApi = {
    createWorkflowRequest,
    createWorkflowResponse,
    deleteWorkflowResponse,
    getWorkflowRequest,
    getWorkflowResponse,
    getWorkflowsResponse,
    updateWorkflowParams,
    updateWorkflowRequest,
    updateWorkflowResponse,
    workflowMutationErrorResponse,
    workflowName,
} as const

/* MARK: inferred types */

export type GetWorkflowsResponse = z.output<typeof getWorkflowsResponse>
export type GetWorkflowResponse = z.output<typeof getWorkflowResponse>
export type CreateWorkflowRequest = z.output<typeof createWorkflowRequest>
export type CreateWorkflowResponse = z.output<typeof createWorkflowResponse>
export type UpdateWorkflowRequest = z.output<typeof updateWorkflowRequest>
export type UpdateWorkflowResponse = z.output<typeof updateWorkflowResponse>
export type DeleteWorkflowResponse = z.output<typeof deleteWorkflowResponse>
export type GetWorkflowRequest = z.output<typeof getWorkflowRequest>
export type UpdateWorkflowParams = z.output<typeof updateWorkflowParams>
export type WorkflowMutationErrorResponse = z.output<typeof workflowMutationErrorResponse>
