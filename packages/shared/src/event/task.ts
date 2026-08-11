import { z } from 'zod'

import { taskListItem } from '#/api/task'

export const snapshot = taskListItem
    .omit({ thumbnail: true })
    .extend({
        images: z.array(z.string()),
    })

export type Snapshot = z.output<typeof snapshot>

export const changed = z.object({
    type: z.literal('task.changed'),
    task: snapshot,
})

export type Changed = z.output<typeof changed>
