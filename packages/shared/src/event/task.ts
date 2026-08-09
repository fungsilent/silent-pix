import { z } from 'zod'

export const changed = z.object({
    type: z.literal('task.changed'),
    taskId: z.uuid(),
})

export type Changed = z.output<typeof changed>
