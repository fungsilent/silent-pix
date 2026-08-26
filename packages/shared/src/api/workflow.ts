import { z } from 'zod'

import * as comfy from '#shared/comfy'
import { configSchema } from '#shared/config'

/* MARK: rest */

export const workflowName = z.string().trim().min(1).max(120)

export const workflowSummary = z.object({
    id: z.uuid(),
    name: workflowName,
    revision: z.number().int().positive(),
    /* null = 使用中 */
    archivedAt: z.iso.datetime().nullable(),
})

export type WorkflowSummary = z.output<typeof workflowSummary>

export const getWorkflowsQuery = z.object({
    /* Generate 的挑選器只要 active；editor 用 all 才看得到封存的 */
    scope: z.enum(['active', 'all']).default('active'),
})

export type GetWorkflowsQuery = z.output<typeof getWorkflowsQuery>

export const getWorkflowsResponse = z.object({
    options: z.array(workflowSummary),
})

export type GetWorkflowsResponse = z.output<typeof getWorkflowsResponse>

export const getWorkflowResponse = workflowSummary.extend({
    /* 決定 Delete 會封存還是真刪，按下之前就要知道 */
    taskCount: z.number().int().nonnegative(),
    graph: comfy.graph,
    configSchema,
})

export type GetWorkflowResponse = z.output<typeof getWorkflowResponse>

export const createWorkflowRequest = z.object({
    name: workflowName,
    graph: comfy.graph,
    configSchema,
})

export type CreateWorkflowRequest = z.output<typeof createWorkflowRequest>

export const createWorkflowResponse = getWorkflowResponse

export type CreateWorkflowResponse = z.output<typeof createWorkflowResponse>

export const updateWorkflowRequest = z.object({
    /* 期待的 revision；對不上就是別人先存了，回 409 */
    revision: z.number().int().positive(),
    graph: comfy.graph,
    configSchema,
})

export type UpdateWorkflowRequest = z.output<typeof updateWorkflowRequest>

export const updateWorkflowResponse = getWorkflowResponse

export type UpdateWorkflowResponse = z.output<typeof updateWorkflowResponse>

export const deleteWorkflowResponse = z.object({
    id: z.uuid(),
    /* 有 task 引用就是 archived，零引用才是 deleted */
    disposition: z.enum(['archived', 'deleted']),
})

export type DeleteWorkflowResponse = z.output<typeof deleteWorkflowResponse>

export const getWorkflowRequest = z.object({
    workflowId: z.uuid(),
})

export type GetWorkflowRequest = z.output<typeof getWorkflowRequest>

export const updateWorkflowParams = getWorkflowRequest

export type UpdateWorkflowParams = z.output<typeof updateWorkflowParams>

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

export const workflowMutationErrorResponse = z.union([
    workflowMappingErrorResponse,
    workflowValidationErrorResponse,
])

export type WorkflowMutationErrorResponse = z.output<typeof workflowMutationErrorResponse>
