import { z } from 'zod'

import { imageResource } from '#shared/contract/image'
import { taskListItem } from '#shared/contract/task'

/* MARK: event */

/*
 * NOTE:
 * 目前廣播給所有 client，包含建立者自己。建立者的 cache 已由 POST 回應填好，
 * client id 做好之後才在這裡排除建立者。
 */
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
