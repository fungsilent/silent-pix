import { z } from 'zod'

import { imageResource, imageUsage } from '#shared/contract/image'
import { taskConfig, taskLora, taskPrompt, taskStatus } from '#shared/contract/task'

/* MARK: params */

export const getTaskRequest = z.object({
    taskId: z.uuid(),
})

/* MARK: response */

export const getTaskResponse = z.object({
    id: z.uuid(),
    name: z.string().nullable(),
    status: taskStatus,
    pin: z.boolean(),
    discard: z.boolean(),
    createdAt: z.iso.datetime(),
    workflowId: z.uuid().optional(),
    workflow: z.string(),
    workflowRevision: z.number().int().nonnegative(),
    currentWorkflowRevision: z.number().int().positive(),
    config: taskConfig,
    lora: z.array(taskLora),
    prompt: taskPrompt,
    /* NOTE: 只有 output，依 sortIndex 排序；輸入圖另立欄位，不混進 output 畫廊 */
    images: z.array(imageResource),
    referenceImage: z.object({
        image: imageResource,
        /* NOTE: 這張圖最早被誰用過；使用者剛上傳的圖沒有來源，是 null */
        origin: imageUsage.nullable(),
    }).nullable(),
})

/* MARK: inferred types */

export type GetTaskRequest = z.output<typeof getTaskRequest>
export type GetTaskResponse = z.output<typeof getTaskResponse>
