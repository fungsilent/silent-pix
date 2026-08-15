import { z } from 'zod'

export const taskStatus = z.enum(['queued', 'running', 'done', 'failed', 'cancelled'])

export type TaskStatus = z.output<typeof taskStatus>

export const taskListItem = z.object({
    id: z.uuid(),
    name: z.string().nullable(),
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
    seed: z.string().trim().min(1).max(64),
    steps: z.number().int().min(1).max(100),
    cfg: z.number().finite().min(0).max(100),
    width: z.number().int().min(64).max(4096),
    height: z.number().int().min(64).max(4096),
    batch: z.number().int().min(1).max(16),
    sampler: z.string().trim().min(1).max(120),
})

export type TaskConfig = z.output<typeof taskConfig>

export const samplerOption = z.object({
    label: z.string().trim().min(1).max(120),
    value: z.string().trim().min(1).max(120),
})

export type SamplerOption = z.output<typeof samplerOption>

export const getSamplersResponse = z.object({
    options: z.array(samplerOption),
})

export type GetSamplersResponse = z.output<typeof getSamplersResponse>

export const loraOption = z.object({
    label: z.string().min(1),
    value: z.string().min(1),
})

export type LoraOption = z.output<typeof loraOption>

export const getLorasResponse = z.object({
    options: z.array(loraOption),
})

export type GetLorasResponse = z.output<typeof getLorasResponse>

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
    name: z.string().nullable(),
    status: taskStatus,
    createdAt: z.iso.datetime(),
    workflowId: z.uuid().optional(),
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
    name: z.string().trim().max(120).nullable(),
    workflowId: z.uuid(),
    config: taskConfig.extend({
        seed: taskConfig.shape.seed.nullable()
    }),
    lora: z.array(taskLora),
    prompt: z.object({
        positive: z.array(taskPromptTag),
        negative: z.array(taskPromptTag),
    }),
})

export type CreateTaskRequest = z.output<typeof createTaskRequest>

export const createTaskResponse = getTaskResponse

export type CreateTaskResponse = GetTaskResponse

export const getTaskImageRequest = z.object({
    taskId: z.uuid(),
    filename: z.string().min(1).max(255),
})

export type GetTaskImageRequest = z.output<typeof getTaskImageRequest>

export const deleteTaskRequest = z.object({
    taskId: z.uuid(),
})

export type DeleteTaskRequest = z.output<typeof deleteTaskRequest>

export const deleteTaskResponse = z.object({
    id: z.uuid(),
})

export type DeleteTaskResponse = z.output<typeof deleteTaskResponse>
