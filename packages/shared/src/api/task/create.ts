import { z } from 'zod'

import { getTaskResponse } from '#shared/api/task/detail'
import { taskConfig, taskLora, taskPrompt } from '#shared/contract/task'

/* MARK: request */

/*
 * TRANSPORT:
 * 非檔案欄位全部包在 payload。Eden 把 body 轉成 FormData 時，空陣列會逐個
 * append 零次而消失，null 與數字會轉成字串；包成物件後會整包 JSON.stringify。
 */
const createTaskPayload = z.object({
    name: z.string().trim().min(1).max(120).nullable(),
    workflowId: z.uuid(),
    config: taskConfig.extend({
        seed: taskConfig.shape.seed.nullable(),
    }),
    lora: z.array(taskLora),
    prompt: taskPrompt,
    referenceImageId: z.uuid().nullable().default(null),
    maskImageId: z.uuid().nullable().default(null),
})

/*
 * TRANSPORT:
 * 帶 File 時 Eden 自動使用 multipart，Elysia formData parser 會把 payload
 * JSON.parse 回物件；未帶 File 時則是單純 JSON。兩種傳輸共用這份 contract。
 */
export const createTaskRequest = z.object({
    payload: createTaskPayload,
    referenceImage: z.file().optional(),
    maskImage: z.file().optional(),
}).superRefine(({ payload, referenceImage, maskImage }, context) => {
    if (payload.referenceImageId && referenceImage) {
        context.addIssue({
            code: 'custom',
            path: ['referenceImage'],
            message: 'Provide a reference image ID or upload a reference image.',
        })
    }

    if (payload.maskImageId && maskImage) {
        context.addIssue({
            code: 'custom',
            path: ['maskImage'],
            message: 'Provide a mask image ID or upload a mask image.',
        })
    }

    if ((payload.maskImageId || maskImage) && !payload.referenceImageId && !referenceImage) {
        context.addIssue({
            code: 'custom',
            path: ['referenceImage'],
            message: 'A mask requires a reference image.',
        })
    }
})

/* MARK: response */

export const createTaskResponse = getTaskResponse

/* MARK: inferred types */

export type CreateTaskPayload = z.output<typeof createTaskPayload>
export type CreateTaskRequest = z.output<typeof createTaskRequest>
export type CreateTaskResponse = z.output<typeof createTaskResponse>
