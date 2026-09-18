import { z } from 'zod'

import { imageResource } from '#shared/contract/image'
import { taskListItem } from '#shared/contract/task'

/* MARK: event */

export const snapshot = taskListItem
    .omit({ thumbnail: true })
    .extend({
        images: z.array(imageResource),
    })

export const created = z.object({
    type: z.literal('task.created'),
    task: snapshot,
})

export const changed = z.object({
    type: z.literal('task.changed'),
    task: snapshot,
})

export const removed = z.object({
    type: z.literal('task.removed'),
    taskIds: z.array(z.uuid()).min(1),
})

/* MARK: inferred types */

export type Snapshot = z.output<typeof snapshot>
export type Created = z.output<typeof created>
export type Changed = z.output<typeof changed>
export type Removed = z.output<typeof removed>
