import { z } from 'zod'

import { taskFlag } from '#shared/contract/task'

/* MARK: request */

export const updateTaskFlagsRequest = z.object({
    taskIds: z.array(z.uuid())
        .min(1)
        .max(200)
        .refine(ids => new Set(ids).size === ids.length, 'Task ids must be unique.'),
    flag: taskFlag.nullable(),
})

/* MARK: response */

const taskFlagState = z.object({
    id: z.uuid(),
    pin: z.boolean(),
    discard: z.boolean(),
})

export const updateTaskFlagsResponse = z.object({
    tasks: z.array(taskFlagState),
})

/* MARK: inferred types */

export type UpdateTaskFlagsRequest = z.output<typeof updateTaskFlagsRequest>
export type TaskFlagState = z.output<typeof taskFlagState>
export type UpdateTaskFlagsResponse = z.output<typeof updateTaskFlagsResponse>
