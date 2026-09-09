import { z } from 'zod'

/* MARK: request */

export const deleteTasksRequest = z.discriminatedUnion('scope', [
    z.object({
        scope: z.literal('selected'),
        taskIds: z.array(z.uuid())
            .min(1)
            .max(200)
            .refine(ids => new Set(ids).size === ids.length, 'Task ids must be unique.'),
    }),
    z.object({
        scope: z.literal('discard'),
    }),
])

export const deleteTaskRequest = z.object({
    taskId: z.uuid(),
})

/* MARK: response */

export const deleteTasksResponse = z.object({
    ids: z.array(z.uuid()),
    deletedImageCount: z.number().int().nonnegative(),
})

export const deleteTaskResponse = z.object({
    id: z.uuid(),
})

/* MARK: inferred types */

export type DeleteTasksRequest = z.output<typeof deleteTasksRequest>
export type DeleteTaskRequest = z.output<typeof deleteTaskRequest>
export type DeleteTasksResponse = z.output<typeof deleteTasksResponse>
export type DeleteTaskResponse = z.output<typeof deleteTaskResponse>
