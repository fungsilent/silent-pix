import { batch, createContext, onCleanup, useContext } from 'solid-js'

import { createStore } from '#/lib/store'
import {
    cloneGenerateValues,
    createGenerateForm,
    draftTask,
    referenceSize,
    toGenerateValues,
} from '#/pages/generate/form'
import { toValidationIssues } from '#/pages/generate/issue'

import type {
    GenerateTask,
    GenerateValues,
    PromptKind,
    ReferenceImage,
} from '#/pages/generate/form'
import type { GenerateIssue } from '#/pages/generate/issue'
import type { JSX } from 'solid-js'

export type { ReferenceImage } from '#/pages/generate/form'

type GenerateUiState = {
    submitIssues: GenerateIssue[]
    submitToken: number
    taskId: string
    promptVisible: Record<PromptKind, boolean>
}

export type GenerateStoreOptions = {
    onSubmit?: (values: GenerateValues) => Promise<void>
}

export function createGenerateStore(
    initialTask: GenerateTask = draftTask,
    options: GenerateStoreOptions = {},
) {
    const initialState: GenerateUiState = {
        submitIssues: [],
        submitToken: 0,
        taskId: initialTask.id,
        promptVisible: { positive: true, negative: true },
    }

    const uiStore = createStore(
        initialState,
        store => ({
            clearSubmitIssues() {
                store.set('submitIssues', [])
            },

            reportSubmitIssues(issues: GenerateIssue[]) {
                store.set('submitIssues', issues)
                store.set('submitToken', token => token + 1)
            },

            togglePromptVisible(kind: PromptKind) {
                store.set('promptVisible', kind, visible => !visible)
            },
        }),
    )

    const form = createGenerateForm(initialTask, {
        onInvalid: issues => uiStore.reportSubmitIssues(toValidationIssues(issues)),
        onSubmit: async values => {
            await options.onSubmit?.(values)
        },
    })

    const loadTask = (task: GenerateTask) => {
        /* 同一 task 的 task.changed 只更新 query cache，不重設編輯中的表單。 */
        if (uiStore.state.taskId === task.id) {
            return
        }

        releaseLocalPreview(form.getFieldValue('referenceImage'))
        form.reset(cloneGenerateValues(toGenerateValues(task)))
        uiStore.set('taskId', task.id)
    }

    const setReferenceImage = (reference: ReferenceImage) => {
        const size = referenceSize(reference)

        releaseLocalPreview(form.getFieldValue('referenceImage'))
        batch(() => {
            form.setFieldValue('referenceImage', reference)
            form.setFieldValue('width', size.width)
            form.setFieldValue('height', size.height)
            /* latent 來自 VAEEncode，多出來的 batch 不會有第二張圖 */
            form.setFieldValue('batch', 1)
        })
    }

    const clearReferenceImage = () => {
        releaseLocalPreview(form.getFieldValue('referenceImage'))
        form.setFieldValue('referenceImage', null)
    }

    const applyLoraSelection = (names: string[]) => {
        const current = form.getFieldValue('lora')

        form.setFieldValue('lora', names.map(name => {
            const existing = current.find(lora => lora.name === name)

            return existing
                ? { ...existing }
                : {
                    id: `lora-${crypto.randomUUID()}`,
                    name,
                    weight: 0.7,
                }
        }))
    }

    onCleanup(() => {
        releaseLocalPreview(form.getFieldValue('referenceImage'))
    })

    return {
        ...uiStore,
        form,
        loadTask,
        setReferenceImage,
        clearReferenceImage,
        applyLoraSelection,
    }
}

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
