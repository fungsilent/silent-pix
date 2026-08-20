import { imageApi } from '@silent-pix/shared'
import { createContext, useContext } from 'solid-js'
import { z } from 'zod'

import { createStore } from '#/lib/store'

import type { TaskApi } from '@silent-pix/shared'
import type { ViewerImage } from '#/pages/generate/components/workspace/shared/ImageViewer'
import type { JSX } from 'solid-js'
import type { z as zod } from 'zod'

const promptTagSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    text: z.string(),
})

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
    negative: z.array(promptTagSchema),
    positive: z.array(promptTagSchema),
    sampler: z.string().trim().min(1).max(120),
    seed: z.string().max(64),
    steps: z.number().int().min(1).max(100),
    width: z.number().int().min(64).max(4096),
    batch: z.number().int().min(1).max(16),
    denoise: z.number().finite().min(0).max(1),
    referenceImage: referenceImageSchema.nullable(),
})

export type GenerateValues = zod.infer<typeof generateSchema>

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
        negative: [
            {
                id: 'draft-negative-quality',
                label: '畫質',
                text: `nsfw, worst quality, low quality,
bad anatomy, bad hands, malformed hands, extra fingers, missing fingers,
extra limbs, twisted body, poorly drawn face, asymmetrical eyes,
blurry, messy lineart, flat shading, low detail,
wrong outfit, inaccurate clothing details, wrong colors,
extra accessories, text, watermark, logo, cropped, out of frame,`,
            },
        ],
        positive: [
            {
                id: 'draft-positive-quality',
                label: '畫質',
                text: 'masterpiece, best quality, score_9, score_8, highres, anime screenshot,',
            },
        ],
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

export function toViewerImage(reference: ReferenceImage): ViewerImage {
    const size = referenceSize(reference)

    return {
        url: referencePreviewUrl(reference),
        width: size.width,
        height: size.height,
    }
}

type GenerateState = {
    values: GenerateValues
}

export const toGenerateValues = (task: GenerateTask): GenerateValues => ({
    // 表單一律用字串，未命名與送出時的 null 在邊界轉換
    name: task.name ?? '',
    cfg: task.config.cfg,
    height: task.config.height,
    lora: task.lora.map(lora => ({ ...lora })),
    negative: task.prompt.negative.map(tag => ({ ...tag })),
    positive: task.prompt.positive.map(tag => ({ ...tag })),
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

const defaultLoraWeight = 0.7

const cloneGenerateValues = (values: GenerateValues): GenerateValues => ({
    ...values,
    lora: values.lora.map(lora => ({ ...lora })),
    negative: values.negative.map(tag => ({ ...tag })),
    positive: values.positive.map(tag => ({ ...tag })),
})

export function createGenerateStore(initialValues: GenerateValues) {
    const initialState: GenerateState = {
        values: cloneGenerateValues(initialValues),
    }

    return createStore(initialState, store => ({
        /* Task */
        setValue<TKey extends keyof GenerateValues>(key: TKey, value: GenerateValues[TKey]) {
            store.set('values', key, value)
        },

        loadTask(task: GenerateTask) {
            releaseLocalPreview(store.state.values.referenceImage)
            store.set({ values: cloneGenerateValues(toGenerateValues(task)) })
        },

        /* Reference image */
        setReferenceImage(reference: ReferenceImage) {
            const size = referenceSize(reference)

            releaseLocalPreview(store.state.values.referenceImage)

            store.set('values', 'referenceImage', reference)
            store.set('values', 'width', size.width)
            store.set('values', 'height', size.height)
            /* latent 來自 VAEEncode，多出來的 batch 不會有第二張圖 */
            store.set('values', 'batch', 1)
        },

        clearReferenceImage() {
            releaseLocalPreview(store.state.values.referenceImage)
            store.set('values', 'referenceImage', null)
        },

        /* LoRA */
        addLora(name: string) {
            if (!name || store.state.values.lora.some(lora => lora.name === name)) {
                return false
            }

            store.set('values', 'lora', lora => [
                ...lora,
                {
                    id: `lora-${crypto.randomUUID()}`,
                    name,
                    weight: defaultLoraWeight,
                },
            ])

            return true
        },

        /*
         * 以 name 為 key 對齊：留下來的沿用原本的 id 與已調好的 weight，
         * 只有新加入的才拿預設值。順序由傳入的陣列決定。
         */
        setLoraNames(names: string[]) {
            const current = store.state.values.lora

            store.set('values', 'lora', names.map(name => {
                const existing = current.find(lora => lora.name === name)

                return existing
                    ? { ...existing }
                    : {
                        id: `lora-${crypto.randomUUID()}`,
                        name,
                        weight: defaultLoraWeight,
                    }
            }))
        },

        setLoraWeight(id: string, weight: number) {
            const index = store.state.values.lora.findIndex(item => item.id === id)
            if (index < 0) return
            store.set('values', 'lora', index, 'weight', weight)
        },

        removeLora(id: string) {
            store.set('values', 'lora', lora => lora.filter(item => item.id !== id))
        },
    }))
}

/* 換掉或清掉本機預覽時要還回去，否則 objectURL 會一直佔著那份 blob */
function releaseLocalPreview(reference: ReferenceImage | null): void {
    if (reference?.type === 'local') {
        URL.revokeObjectURL(reference.previewUrl)
    }
}

export type GenerateStore = ReturnType<typeof createGenerateStore>

const GenerateStoreContext = createContext<GenerateStore>()

type GenerateStoreProviderProps = {
    children: JSX.Element
    store: GenerateStore
}

export function GenerateStoreProvider(props: GenerateStoreProviderProps) {
    return GenerateStoreContext.Provider({
        get children() {
            return props.children
        },
        value: props.store,
    })
}

export function useGenerateStore() {
    const store = useContext(GenerateStoreContext)

    if (!store) {
        throw new Error('Generate store context is missing')
    }

    return store
}
