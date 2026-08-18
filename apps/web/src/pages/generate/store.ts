import { createContext, useContext } from 'solid-js'
import { z } from 'zod'

import { createStore } from '#/lib/store'

import type { TaskApi } from '@silent-pix/shared'
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
})

export type GenerateValues = zod.infer<typeof generateSchema>

export type GenerateTask = Omit<TaskApi.GetTaskResponse, 'createdAt' | 'status' | 'config'> & {
    createdAt: TaskApi.GetTaskResponse['createdAt'] | null
    status: TaskApi.GetTaskResponse['status'] | null
    config: TaskApi.CreateTaskRequest['config']
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
        denoise: 0.6,
    },
    lora: [],
    prompt: {
        negative: [
            {
                id: 'draft-negative-quality',
                label: 'Quality',
                text: 'low quality, worst quality, lowres, blurry',
            },
        ],
        positive: [
            {
                id: 'draft-positive-quality',
                label: 'Quality',
                text: 'masterpiece, best quality, ultra detailed',
            },
        ],
    },
    images: [],
    referenceImage: null,
}

type GenerateState = {
    initialValues: GenerateValues
    values: GenerateValues
}

const configKeys = [
    'workflowId',
    'seed',
    'steps',
    'cfg',
    'width',
    'height',
    'batch',
    'sampler',
    'denoise',
] as const

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
    const seed = values.seed.trim()

    const name = values.name.trim()

    return {
        name: name === '' ? null : name,
        workflowId: values.workflowId,
        config: {
            seed: seed === '' ? null : seed,
            steps: values.steps,
            cfg: values.cfg,
            width: values.width,
            height: values.height,
            batch: values.batch,
            sampler: normalizeSampler(values.sampler.trim()),
            denoise: values.denoise,
        },
        lora: values.lora,
        prompt: {
            positive: values.positive,
            negative: values.negative,
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
        initialValues: cloneGenerateValues(initialValues),
        values: cloneGenerateValues(initialValues),
    }

    return createStore(initialState, store => ({
        /* Task */
        setValue<TKey extends keyof GenerateValues>(key: TKey, value: GenerateValues[TKey]) {
            store.set('values', key, value)
        },

        loadTask(task: GenerateTask) {
            const values = toGenerateValues(task)
            store.set({
                initialValues: cloneGenerateValues(values),
                values: cloneGenerateValues(values),
            })
        },

        /* Config */
        resetConfig() {
            configKeys.forEach(key => {
                store.set('values', key, store.state.initialValues[key])
            })
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
