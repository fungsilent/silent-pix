import { createContextProvider } from '@solid-primitives/context'
import { batch, createEffect, on, onCleanup } from 'solid-js'

import { ApiError } from '#/api/api.client'
import { useCreateTaskMutation } from '#/features/task/task.query'
import { useRefreshWorkflowList } from '#/features/workflow/workflow.query'
import { createStore } from '#/lib/store'
import { promptDefaultHeight, promptMinHeight } from '#/pages/generate/components/workspace/generate/prompt/prompt.theme'
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
    /* 兩段 editor 的高度（px），由 prompt 區的兩條拖曳調整並記在本機 */
    promptHeight: Record<PromptKind, number>
}

const promptHeightKey = 'silent-pix.prompt-height'
const defaultPromptHeight = (): Record<PromptKind, number> => ({ positive: promptDefaultHeight, negative: promptDefaultHeight })

function readPromptHeight(): Record<PromptKind, number> {
    try {
        const value: unknown = JSON.parse(localStorage.getItem(promptHeightKey) ?? 'null')
        if (value && typeof value === 'object') {
            const { positive, negative } = value as Record<string, unknown>
            if (typeof positive === 'number' && typeof negative === 'number' && positive >= promptMinHeight && negative >= promptMinHeight) {
                return { positive, negative }
            }
        }
    }
    catch { /* 讀不到就用預設 */ }
    return defaultPromptHeight()
}

function createGenerateSession() {
    const initialState: GenerateUiState = {
        submitIssues: [],
        submitToken: 0,
        taskId: undefined,
        promptVisible: { positive: true, negative: true },
        promptHeight: readPromptHeight(),
    }

    const uiStore = createStore(
        initialState,
        store => {
            const writePromptHeight = (height: Record<PromptKind, number>) => {
                store.set('promptHeight', height)
                try {
                    localStorage.setItem(promptHeightKey, JSON.stringify(height))
                }
                catch { /* 存不了就只在這次生效 */ }
            }

            return {
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

                setPromptHeight(height: Partial<Record<PromptKind, number>>) {
                    writePromptHeight({ ...store.state.promptHeight, ...height })
                },

                resetPromptHeight() {
                    writePromptHeight(defaultPromptHeight())
                },
            }
        },
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

        cancelReferenceImageUpload()
        releaseLocalPreview(form.getFieldValue('referenceImage'))
        form.reset(toGenerateValues(task))
        lastServerName = serverName
        uiStore.set('taskId', task.id)
    }

    const loadDraft = () => {
        if (uiStore.state.taskId === undefined) {
            return
        }

        cancelReferenceImageUpload()
        releaseLocalPreview(form.getFieldValue('referenceImage'))
        form.reset(cloneGenerateValues(draftGenerateValues))
        uiStore.set('taskId', undefined)
    }

    // MARK: Reference image
    let pendingPreviewUrl: string | undefined

    function cancelReferenceImageUpload(): void {
        if (pendingPreviewUrl === undefined) return

        URL.revokeObjectURL(pendingPreviewUrl)
        pendingPreviewUrl = undefined
    }

    function releaseLocalPreview(reference: ReferenceImage | null): void {
        if (reference?.type === 'local') {
            URL.revokeObjectURL(reference.previewUrl)
        }
        if (reference?.mask?.type === 'local') {
            URL.revokeObjectURL(reference.mask.previewUrl)
        }
    }

    const setReferenceImage = (reference: ReferenceImage) => {
        const size = referenceSize(reference)

        cancelReferenceImageUpload()
        releaseLocalPreview(form.getFieldValue('referenceImage'))
        batch(() => {
            form.setFieldValue('referenceImage', reference)
            form.setFieldValue('width', size.width)
            form.setFieldValue('height', size.height)
        })
    }

    const clearReferenceImage = () => {
        cancelReferenceImageUpload()
        releaseLocalPreview(form.getFieldValue('referenceImage'))
        form.setFieldValue('referenceImage', null)
    }

    const uploadReferenceImage = (file: File, onUnreadable: () => void) => {
        cancelReferenceImageUpload()
        const previewUrl = URL.createObjectURL(file)
        const taskId = taskStore.state.selectedTaskId
        const isCurrent = () => pendingPreviewUrl === previewUrl && taskStore.state.selectedTaskId === taskId
        pendingPreviewUrl = previewUrl

        const probe = new Image()
        probe.addEventListener('load', () => {
            if (!isCurrent()) return

            pendingPreviewUrl = undefined
            setReferenceImage({
                type: 'local',
                file,
                previewUrl,
                width: probe.naturalWidth,
                height: probe.naturalHeight,
                sizeBytes: file.size,
                mask: null,
            })
        })
        probe.addEventListener('error', () => {
            if (!isCurrent()) return

            cancelReferenceImageUpload()
            onUnreadable()
        })
        probe.src = previewUrl
    }

    const setReferenceMask = (reference: ReferenceImage, file: File | null) => {
        if (form.getFieldValue('referenceImage') !== reference) return

        const mask = file ? { type: 'local' as const, file, previewUrl: URL.createObjectURL(file) } : null
        if (reference.mask?.type === 'local') {
            URL.revokeObjectURL(reference.mask.previewUrl)
        }
        form.setFieldValue('referenceImage', { ...reference, mask })
    }

    createEffect(on(() => taskStore.state.selectedTaskId, cancelReferenceImageUpload, { defer: true }))

    onCleanup(() => {
        cancelReferenceImageUpload()
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
        uploadReferenceImage,
        cancelReferenceImageUpload,
        setReferenceMask,
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
