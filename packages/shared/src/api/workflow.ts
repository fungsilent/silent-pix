import { z } from 'zod'

export const workflowOption = z.object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(120),
})

export type WorkflowOption = z.output<typeof workflowOption>

export const getWorkflowsResponse = z.object({
    options: z.array(workflowOption),
})

export type GetWorkflowsResponse = z.output<typeof getWorkflowsResponse>
