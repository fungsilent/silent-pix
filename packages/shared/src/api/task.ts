import { z } from 'zod'

export const taskStatus = z.enum(['queued', 'running', 'done'])

export type TaskStatus = z.output<typeof taskStatus>

export const taskListItem = z.object({
    id: z.string(),
    status: taskStatus,
    createdAt: z.iso.datetime(),
    thumbnail: z.string().optional(),
})

export type TaskListItem = z.output<typeof taskListItem>

export const getTasksQuery = z.object({
    cursor: z.string().max(512).optional(),
    limit: z.number().int().min(1).max(100).default(30),
})

export type GetTasksQuery = z.output<typeof getTasksQuery>


export const getTasksResponse = z.object({
    items: z.array(taskListItem),
    nextCursor: z.string().optional(),
})

export type GetTasksResponse = z.output<typeof getTasksResponse>
