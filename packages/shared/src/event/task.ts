import { z } from 'zod'

import { imageResource } from '#/api/image'
import { taskListItem } from '#/api/task'

/*
 * 目前廣播給所有 client，包含建立者自己。建立者的 cache 已由 POST 回應填好，
 * TODO: client id 做好之後在這裡排除建立者。
 */

export const snapshot = taskListItem
    .omit({ thumbnail: true })
    .extend({
        images: z.array(imageResource),
    })

export type Snapshot = z.output<typeof snapshot>

export const created = z.object({
    type: z.literal('task.created'),
    task: snapshot,
})

export type Created = z.output<typeof created>

export const changed = z.object({
    type: z.literal('task.changed'),
    task: snapshot,
})

export type Changed = z.output<typeof changed>

export const removed = z.object({
    type: z.literal('task.removed'),
    taskId: z.uuid(),
})

export type Removed = z.output<typeof removed>
