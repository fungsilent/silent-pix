import { z } from 'zod'

/* MARK: values */

export const workflowName = z.string().trim().min(1).max(120)

/* MARK: resources */

export const workflowSummary = z.object({
    id: z.uuid(),
    name: workflowName,
    revision: z.number().int().positive(),
    /* NOTE: null = 使用中 */
    archivedAt: z.iso.datetime().nullable(),
})

/* MARK: inferred types */

export type WorkflowSummary = z.output<typeof workflowSummary>
