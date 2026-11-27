import { imageApi, taskApi } from '@silent-pix/shared'
import { createForm } from '@tanstack/solid-form'
import { z } from 'zod'

import { clonePromptDocument } from '#/pages/generate/components/workspace/prompt/prompt.document'

import type { TaskApi } from '@silent-pix/shared'
import type { ZodIssue } from '#/lib/error'

const loraSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    weight: z.number().finite().min(0).max(2),
})

const maskSchema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('local'), file: z.file(), previewUrl: z.string() }),
    z.object({ type: z.literal('asset'), image: imageApi.imageResource }),
])

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
        mask: maskSchema.nullable(),
    }),
    z.object({
        type: z.literal('asset'),
        image: imageApi.imageResource,
        origin: imageApi.imageUsage.nullable(),
        mask: maskSchema.nullable(),
    }),
])

const generateSchema = z.object({
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

export const draftGenerateValues: GenerateValues = {
    name: '',
    workflowId: '',
    cfg: 4,
    height: 1536,
    lora: [],
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
    sampler: 'dpmpp_2m_sde_gpu',
    seed: '',
    steps: 40,
    width: 1536,
    batch: 1,
    denoise: 0.7,
    referenceImage: null,
}

export type ReferenceImage = NonNullable<GenerateValues['referenceImage']>

export function isGenerateImageSize(width: number, height: number): boolean {
    return generateSchema.shape.width.safeParse(width).success && generateSchema.shape.height.safeParse(height).success
}

export function createLocalReferenceImage(file: File, width: number, height: number, previewUrl = URL.createObjectURL(file)): ReferenceImage {
    return { type: 'local', file, previewUrl, width, height, sizeBytes: file.size, mask: null }
}

export function referenceSize(reference: ReferenceImage) {
    return reference.type === 'local'
        ? {
            width: reference.width,
            height: reference.height,
            sizeBytes: reference.sizeBytes
        }
        : {
            width: reference.image.width,
            height: reference.image.height,
            sizeBytes: reference.image.sizeBytes,
        }
}

export function referencePreviewUrl(reference: ReferenceImage): string {
    return reference.type === 'local' ? reference.previewUrl : reference.image.url
}

export const toGenerateValues = (task: TaskApi.GetTaskResponse): GenerateValues => ({
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
            mask: task.referenceImage.mask ? { type: 'asset', image: task.referenceImage.mask } : null,
        }
        : null,
    workflowId: task.workflowId,
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
    const mask = reference?.mask
    const seed = values.seed.trim()

    const payload: TaskApi.CreateTaskRequest['payload'] = {
        /* name 是 task 建立後的手動標籤，不從 draft / base task 帶入 */
        name: null,
        workflowId: values.workflowId,
        referenceImageId: reference?.type === 'asset' ? reference.image.id : null,
        maskImageId: mask?.type === 'asset' ? mask.image.id : null,
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
    }

    return {
        payload,
        /* Eden 遇到 File 才走 multipart。 */
        ...(reference?.type === 'local' ? { referenceImage: reference.file } : {}),
        ...(mask?.type === 'local' ? { maskImage: mask.file } : {}),
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
    initialValues: GenerateValues,
    options: GenerateFormOptions,
) {
    return createForm(() => ({
        defaultValues: cloneGenerateValues(initialValues),
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
