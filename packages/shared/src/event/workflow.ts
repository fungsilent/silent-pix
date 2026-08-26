import { z } from 'zod'

import { workflowSummary } from '#/api/workflow'

export const changed = z.object({
    type: z.literal('workflow.changed'),
    workflow: workflowSummary,
})

export type Changed = z.output<typeof changed>

export const removed = z.object({
    type: z.literal('workflow.removed'),
    workflowId: z.uuid(),
})

export type Removed = z.output<typeof removed>
