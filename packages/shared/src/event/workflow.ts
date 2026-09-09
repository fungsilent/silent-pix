import { z } from 'zod'

import { workflowSummary } from '#shared/contract/workflow'

/* MARK: event */

export const changed = z.object({
    type: z.literal('workflow.changed'),
    workflow: workflowSummary,
})

export const removed = z.object({
    type: z.literal('workflow.removed'),
    workflowId: z.uuid(),
})

/* MARK: inferred types */

export type Changed = z.output<typeof changed>
export type Removed = z.output<typeof removed>
