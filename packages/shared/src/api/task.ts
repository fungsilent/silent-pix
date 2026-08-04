import { z } from 'zod'

export const taskStatus = z.enum(['queued', 'running', 'done', 'failed', 'cancelled'])

export type TaskStatus = z.output<typeof taskStatus>

export const taskListItem = z.object({
    id: z.uuid(),
    status: taskStatus,
    createdAt: z.iso.datetime(),
    thumbnail: z.string().optional(),
})

export type TaskListItem = z.output<typeof taskListItem>

export const taskPromptTag = z.object({
    id: z.string(),
    label: z.string(),
    text: z.string(),
})

export type TaskPromptTag = z.output<typeof taskPromptTag>

export const taskLora = z.object({
    id: z.string(),
    name: z.string(),
    weight: z.number(),
})

export type TaskLora = z.output<typeof taskLora>

export const taskConfig = z.object({
    seed: z.string().nullable(),
    steps: z.number(),
    cfg: z.number(),
    width: z.number(),
    height: z.number(),
    batch: z.number(),
    sampler: z.string(),
})

export type TaskConfig = z.output<typeof taskConfig>

export const getTasksQuery = z.object({
    cursor: z.string().max(512).optional(),
    limit: z.union([
        z.number(),
        z.string().regex(/^[0-9]+$/).transform(Number),
    ]).pipe(z.number().int().min(1).max(100)).default(30),
})

export type GetTasksQuery = z.output<typeof getTasksQuery>

export const getTasksResponse = z.object({
    items: z.array(taskListItem),
    nextCursor: z.string().optional(),
})

export type GetTasksResponse = z.output<typeof getTasksResponse>

export const getTaskRequest = z.object({
    taskId: z.uuid(),
})

export type GetTaskRequest = z.output<typeof getTaskRequest>

export const getTaskResponse = z.object({
    id: z.uuid(),
    name: z.string(),
    status: taskStatus,
    createdAt: z.iso.datetime(),
    workflow: z.string(),
    config: taskConfig,
    lora: z.array(taskLora),
    prompt: z.object({
        positive: z.array(taskPromptTag),
        negative: z.array(taskPromptTag),
    }),
    images: z.array(z.string()),
})

export type GetTaskResponse = z.output<typeof getTaskResponse>

export const createTaskRequest = z.object({
    name: z.string().min(1).max(120),
    workflowId: z.uuid(),
    config: taskConfig,
    lora: z.array(taskLora),
    prompt: z.object({
        positive: z.array(taskPromptTag),
        negative: z.array(taskPromptTag),
    }),
})

export type CreateTaskRequest = z.output<typeof createTaskRequest>

export const createTaskResponse = z.object({
    id: z.uuid(),
    status: taskStatus,
    createdAt: z.iso.datetime(),
})

export type CreateTaskResponse = z.output<typeof createTaskResponse>

export const getTaskImageRequest = z.object({
    taskId: z.uuid(),
    filename: z.string().min(1).max(255),
})

export type GetTaskImageRequest = z.output<typeof getTaskImageRequest>
