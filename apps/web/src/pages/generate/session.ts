import { createContextProvider } from '@solid-primitives/context'
import { batch, onCleanup } from 'solid-js'

import { ApiError } from '#/api/api.client'
import { useCreateTaskMutation } from '#/features/task/task.query'
import { useRefreshWorkflowList } from '#/features/workflow/workflow.query'
import { createStore } from '#/lib/store'
import {
    cloneGenerateValues,
    createGenerateForm,
    draftGenerateValues,
    referenceSize,
    toCreateTaskRequest,
    toGenerateValues,
} from '#/pages/generate/form'
import { toSubmitIssue, toValidationIssues } from '#/pages/generate/issue'
import { taskStore } from '#/store/task'

import type { TaskApi } from '@silent-pix/shared'
import type { PromptKind, ReferenceImage } from '#/pages/generate/form'
import type { GenerateIssue } from '#/pages/generate/issue'

type GenerateUiState = {
    submitIssues: GenerateIssue[]
    submitToken: number
    taskId: string | undefined
    promptVisible: Record<PromptKind, boolean>
}

function createGenerateSession() {
    const initialState: GenerateUiState = {
        submitIssues: [],
        submitToken: 0,
        taskId: undefined,
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

    // MARK: Generate Task
    const createTaskMutation = useCreateTaskMutation()
    const refreshWorkflowList = useRefreshWorkflowList()
    const form = createGenerateForm(draftGenerateValues, {
        onInvalid: issues => uiStore.reportSubmitIssues(toValidationIssues(issues)),
        onSubmit: async values => {
            const response = await createTaskMutation.mutateAsync(toCreateTaskRequest(values))
            taskStore.selectTask(response.id)
        },
    })
    const formSubmitting = form.useSelector(state => state.isSubmitting)
    const isSubmitting = () => formSubmitting() || createTaskMutation.isPending

    const submit = async () => {
        if (isSubmitting()) return

        uiStore.clearSubmitIssues()
        try {
            await form.handleSubmit()
        }
        catch (error) {
            const code = error instanceof ApiError ? error.code : undefined

            if (code === 'WORKFLOW_NOT_FOUND' || code === 'WORKFLOW_ARCHIVED') {
                refreshWorkflowList()
            }

            if (code !== 'WORKFLOW_ARCHIVED') {
                uiStore.reportSubmitIssues([toSubmitIssue(error)])
            }
        }
    }

    // MARK: Load a Task or draft
    let lastServerName = ''
    const loadTask = (task: TaskApi.GetTaskResponse) => {
        const serverName = task.name ?? ''
        if (uiStore.state.taskId === task.id) {
            // 跨路由保留名稱基準，只有使用者沒改過名稱才跟隨 Server。
            if (serverName !== lastServerName && form.getFieldValue('name') === lastServerName) {
                form.setFieldValue('name', serverName)
            }
            lastServerName = serverName
            return
        }

        releaseLocalPreview(form.getFieldValue('referenceImage'))
        form.reset(toGenerateValues(task))
        lastServerName = serverName
        uiStore.set('taskId', task.id)
    }

    const loadDraft = () => {
        if (uiStore.state.taskId === undefined) {
            return
        }

        releaseLocalPreview(form.getFieldValue('referenceImage'))
        form.reset(cloneGenerateValues(draftGenerateValues))
        uiStore.set('taskId', undefined)
    }

    // MARK: Reference image
    function releaseLocalPreview(reference: ReferenceImage | null): void {
        if (reference?.type === 'local') {
            URL.revokeObjectURL(reference.previewUrl)
        }
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

    onCleanup(() => {
        releaseLocalPreview(form.getFieldValue('referenceImage'))
    })

    // MARK: LoRA selection
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

    return {
        ...uiStore,
        form,
        isSubmitting,
        submit,
        loadTask,
        loadDraft,
        setReferenceImage,
        clearReferenceImage,
        applyLoraSelection,
    }
}

// MARK: Generate session access
const [GenerateSessionProvider, readGenerateSession] = createContextProvider(createGenerateSession)
export { GenerateSessionProvider }

export function useGenerateSession() {
    const session = readGenerateSession()
    if (!session) throw new Error('useGenerateSession must be used within GenerateSessionProvider')

    return session
}
