import { z } from 'zod'

import { imageResource, imageUsage } from '#/api/image'

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

export const taskPrompt = z.object({
    positive: z.array(taskPromptTag),
    negative: z.array(taskPromptTag),
})

export type TaskPrompt = z.output<typeof taskPrompt>

export const taskConfig = z.object({
    seed: z.string().trim().min(1).max(64),
    steps: z.number().int().min(1).max(100),
    cfg: z.number().finite().min(0).max(100),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    batch: z.number().int().min(1).max(16),
    sampler: z.string().trim().min(1).max(120),
    denoise: z.number().finite().min(0).max(1).default(1),
})

export type TaskConfig = z.output<typeof taskConfig>

export const taskGenerateConfig = z.object({
    config: taskConfig,
    lora: z.array(taskLora),
    prompt: taskPrompt,
})

export type TaskGenerateConfig = z.output<typeof taskGenerateConfig>

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
    prompt: taskPrompt,
    /* 只有 output，依 sortIndex 排序；輸入圖另立欄位，不混進 output 畫廊 */
    images: z.array(imageResource),
    referenceImage: z.object({
        image: imageResource,
        /* 這張圖最早被誰用過；使用者剛上傳的圖沒有來源，是 null */
        origin: imageUsage.nullable(),
    }).nullable(),
})

export type GetTaskResponse = z.output<typeof getTaskResponse>

/*
 * 非檔案的欄位全部包在 payload 裡。Eden 把 body 轉成 FormData 時，空陣列會
 * 逐個元素 append 零次而整個欄位消失，null 與數字則被轉成字串——包成一個物件
 * 之後它只會被整包 JSON.stringify，裡面的值原樣保留。
 */
export const createTaskPayload = z.object({
    name: z.string().trim().min(1).max(120).nullable(),
    workflowId: z.uuid(),
    config: taskConfig.extend({
        seed: taskConfig.shape.seed.nullable(),
    }),
    lora: z.array(taskLora),
    prompt: taskPrompt,
    /* 挑既有的圖用這個；上傳新檔案走 multipart 的 referenceImage，兩者互斥 */
    referenceImageId: z.uuid().nullable().default(null),
})

export type CreateTaskPayload = z.output<typeof createTaskPayload>

/*
 * 帶 File 時 Eden 自動改走 multipart，Elysia 的 formData parser 會把 payload
 * 這個欄位 JSON.parse 回物件；沒帶 File 就是單純的 JSON。同一份 contract 兩種傳輸。
 */
export const createTaskRequest = z.object({
    payload: createTaskPayload,
    referenceImage: z.file().optional(),
})

export type CreateTaskRequest = z.output<typeof createTaskRequest>

export const createTaskResponse = getTaskResponse

export type CreateTaskResponse = GetTaskResponse

export const renameTaskParams = getTaskRequest

export type RenameTaskParams = z.output<typeof renameTaskParams>

export const renameTaskRequest = z.object({
    name: z.string().trim().min(1).max(120).nullable(),
})

export type RenameTaskRequest = z.output<typeof renameTaskRequest>

export const renameTaskResponse = getTaskResponse

export type RenameTaskResponse = GetTaskResponse

export const deleteTaskRequest = z.object({
    taskId: z.uuid(),
})

export type DeleteTaskRequest = z.output<typeof deleteTaskRequest>

export const deleteTaskResponse = z.object({
    id: z.uuid(),
})

export type DeleteTaskResponse = z.output<typeof deleteTaskResponse>
