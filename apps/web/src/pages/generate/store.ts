import { createContext, useContext } from 'solid-js'
import { z } from 'zod'

import { createStore } from '#/lib/store'

import type { TaskApi } from '@silent-pix/shared'
import type { JSX } from 'solid-js'
import type { z as zod } from 'zod'

const PromptTagSchema = z.object({
    id: z.string(),
    label: z.string(),
    text: z.string(),
})

const LoraSchema = z.object({
    id: z.string(),
    name: z.string(),
    weight: z.number(),
})

export const GenerateSchema = z.object({
    cfg: z.number(),
    height: z.number(),
    lora: z.array(LoraSchema),
    negative: z.array(PromptTagSchema),
    positive: z.array(PromptTagSchema),
    sampler: z.string(),
    seed: z.string(),
    steps: z.number(),
    width: z.number(),
    workflow: z.string(),
})

export type GenerateValues = zod.infer<typeof GenerateSchema>

export type GenerateTask = Omit<TaskApi.GetTaskResponse, 'createdAt' | 'status'> & {
    createdAt: string | null
    status: TaskApi.TaskStatus | null
}

export const draftTask: GenerateTask = {
    id: '#',
    name: '',
    status: null,
    createdAt: null,
    workflow: 'anime-xl-v1',
    config: {
        seed: '',
        steps: 40,
        cfg: 4,
        width: 1536,
        height: 1536,
        batch: 1,
        sampler: 'dpmpp-2m-karras',
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
}

type GenerateState = {
    initialValues: GenerateValues
    values: GenerateValues
}

const configKeys = [
    'workflow',
    'seed',
    'steps',
    'cfg',
    'width',
    'height',
    'sampler',
] as const

export const toGenerateValues = (task: GenerateTask): GenerateValues => ({
    cfg: task.config.cfg,
    height: task.config.height,
    lora: task.lora.map(lora => ({ ...lora })),
    negative: task.prompt.negative.map(tag => ({ ...tag })),
    positive: task.prompt.positive.map(tag => ({ ...tag })),
    sampler: task.config.sampler,
    seed: '',
    steps: task.config.steps,
    width: task.config.width,
    workflow: task.workflow,
})

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

        // reset() {
        //     store.set('values', cloneGenerateValues(store.state.initialValues))
        // },

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
        addLora() {
            store.set('values', 'lora', lora => [
                ...lora,
                {
                    id: `lora-${crypto.randomUUID()}`,
                    name: 'new_lora',
                    weight: 0.5,
                },
            ])
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