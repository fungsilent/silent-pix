import { imageApi, taskApi } from '@silent-pix/shared'
import { createForm } from '@tanstack/solid-form'
import { z } from 'zod'

import { clonePromptDocument } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'

import type { TaskApi } from '@silent-pix/shared'
import type { ZodIssue } from '#/lib/error'

const loraSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    weight: z.number().finite().min(0).max(2),
})

/*
 * 參考圖有兩種來源，形狀不同：
 * 1. 新上傳（只有 File 與 objectURL）
 * 2. 既有 asset 已經在庫裡（有 id 與來源）。
 */
const referenceImageSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('local'),
        file: z.file(),
        previewUrl: z.string(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        sizeBytes: z.number().int().nonnegative(),
    }),
    z.object({
        type: z.literal('asset'),
        image: imageApi.imageResource,
        origin: imageApi.imageUsage.nullable(),
    }),
])

export const generateSchema = z.object({
    name: z.string().trim().max(120),
    workflowId: z.uuid(),
    cfg: z.number().finite().min(0).max(100),
    height: z.number().int().min(64).max(4096),
    lora: z.array(loraSchema),
    negative: taskApi.taskPromptDocument,
    positive: taskApi.taskPromptDocument,
    sampler: z.string().trim().min(1).max(120),
    seed: z.string().max(64),
    steps: z.number().int().min(1).max(100),
    width: z.number().int().min(64).max(4096),
    batch: z.number().int().min(1).max(16),
    denoise: z.number().finite().min(0).max(1),
    referenceImage: referenceImageSchema.nullable(),
})

export type GenerateValues = z.output<typeof generateSchema>

export type PromptKind = 'positive' | 'negative'

export type GenerateTask = Omit<TaskApi.GetTaskResponse, 'createdAt' | 'status' | 'config'> & {
    createdAt: TaskApi.GetTaskResponse['createdAt'] | null
    status: TaskApi.GetTaskResponse['status'] | null
    config: TaskApi.CreateTaskPayload['config']
}

export const draftTask: GenerateTask = {
    id: '#',
    name: null,
    status: null,
    createdAt: null,
    workflow: '',
    /* draft 還沒有 workflow，兩個都是 0：TaskDetail 看到 0 就不提示 drift */
    workflowRevision: 0,
    currentWorkflowRevision: 1,
    config: {
        seed: null,
        steps: 40,
        cfg: 4,
        width: 1536,
        height: 1536,
        batch: 1,
        sampler: 'dpmpp_2m_sde_gpu',
        denoise: 0.7,
    },
    lora: [],
    prompt: {
        negative: {
            text: `nsfw, worst quality, low quality,
bad anatomy, bad hands, malformed hands, extra fingers, missing fingers,
extra limbs, twisted body, poorly drawn face, asymmetrical eyes,
blurry, messy lineart, flat shading, low detail,
wrong outfit, inaccurate clothing details, wrong colors,
extra accessories, text, watermark, logo, cropped, out of frame,`,
            groups: [{
                id: 'draft-negative-quality',
                name: '畫質',
                fromLine: 1,
                toLine: 6,
                enabled: true,
                disabledTokenIndexes: [],
            }],
        },
        positive: {
            text: 'masterpiece, best quality, score_9, score_8, highres, anime screenshot,',
            groups: [{
                id: 'draft-positive-quality',
                name: '畫質',
                fromLine: 1,
                toLine: 1,
                enabled: true,
                disabledTokenIndexes: [],
            }],
        },
    },
    images: [],
    referenceImage: null,
}

export type ReferenceImage = NonNullable<GenerateValues['referenceImage']>

export function referenceSize(reference: ReferenceImage) {
    return reference.type === 'local'
        ? { width: reference.width, height: reference.height, sizeBytes: reference.sizeBytes }
        : {
            width: reference.image.width,
            height: reference.image.height,
            sizeBytes: reference.image.sizeBytes,
        }
}

export function referencePreviewUrl(reference: ReferenceImage): string {
    return reference.type === 'local' ? reference.previewUrl : reference.image.url
}

export function toViewerImage(reference: ReferenceImage) {
    const size = referenceSize(reference)

    return {
        url: referencePreviewUrl(reference),
        width: size.width,
        height: size.height,
    }
}

export const toGenerateValues = (task: GenerateTask): GenerateValues => ({
    // 表單一律用字串，未命名與送出時的 null 在邊界轉換
    name: task.name ?? '',
    cfg: task.config.cfg,
    height: task.config.height,
    lora: task.lora.map(lora => ({ ...lora })),
    negative: clonePromptDocument(task.prompt.negative),
    positive: clonePromptDocument(task.prompt.positive),
    sampler: normalizeSampler(task.config.sampler),
    seed: '',
    steps: task.config.steps,
    width: task.config.width,
    batch: task.config.batch,
    denoise: task.config.denoise,
    referenceImage: task.referenceImage
        ? {
            type: 'asset',
            image: task.referenceImage.image,
            origin: task.referenceImage.origin,
        }
        : null,
    workflowId: task.workflowId ?? '',
})

function normalizeSampler(value: string): string {
    switch (value) {
        case 'dpmpp-2m-karras':
            return 'dpmpp_2m_sde_gpu'
        case 'euler-a':
            return 'euler'
        default:
            return value
    }
}

export function toCreateTaskRequest(values: GenerateValues): TaskApi.CreateTaskRequest {
    const reference = values.referenceImage
    const seed = values.seed.trim()

    return {
        /* 上傳新檔案就把 File 放在外層，Eden 會因此改走 multipart */
        ...(reference?.type === 'local' ? { referenceImage: reference.file } : {}),
        payload: {
            /* name 是 task 建立後的手動標籤，不從 draft / base task 帶入 */
            name: null,
            workflowId: values.workflowId,
            referenceImageId: reference?.type === 'asset' ? reference.image.id : null,
            config: {
                seed: seed === '' ? null : seed,
                steps: values.steps,
                cfg: values.cfg,
                width: values.width,
                height: values.height,
                batch: values.batch,
                sampler: normalizeSampler(values.sampler.trim()),
                /* 沒有參考圖時 server 一律改成 1，這裡送什麼都不影響結果 */
                denoise: values.denoise,
            },
            lora: values.lora,
            prompt: {
                positive: values.positive,
                negative: values.negative,
            },
        },
    }
}

export function cloneGenerateValues(values: GenerateValues): GenerateValues {
    return {
        ...values,
        lora: values.lora.map(lora => ({ ...lora })),
        negative: clonePromptDocument(values.negative),
        positive: clonePromptDocument(values.positive),
    }
}

type GenerateFormOptions = {
    onInvalid: (issues: ZodIssue[]) => void
    onSubmit: (values: GenerateValues) => Promise<void>
}

export function createGenerateForm(
    initialTask: GenerateTask,
    options: GenerateFormOptions,
) {
    return createForm(() => ({
        defaultValues: cloneGenerateValues(toGenerateValues(initialTask)),
        validators: {
            onSubmit: ({ value }) => {
                const result = generateSchema.safeParse(value)

                return result.success ? undefined : result.error.issues
            },
        },
        onSubmitInvalid: ({ formApi }) => {
            const issues = formApi.state.errorMap.onSubmit

            if (issues) {
                options.onInvalid(issues)
            }
        },
        onSubmit: async ({ value }) => {
            await options.onSubmit(generateSchema.parse(value))
        },
    }))
}

export type GenerateForm = ReturnType<typeof createGenerateForm>
