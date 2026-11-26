import { task } from '@silent-pix/shared'
import { createContextProvider } from '@solid-primitives/context'
import { batch, createEffect, on, onCleanup } from 'solid-js'

import { subscribeTasksRemoved } from '#/data/task/task.event'
import { useCreateTaskMutation } from '#/data/task/task.query'
import { useRefreshWorkflowList } from '#/data/workflow/workflow.query'
import { ApiError } from '#/lib/api-client'
import { createStore } from '#/lib/store'
import { promptDefaultHeight, promptMinHeight } from '#/pages/generate/components/workspace/generate/prompt/prompt.theme'
import {
    cloneGenerateValues,
    createGenerateForm,
    createLocalReferenceImage,
    draftGenerateValues,
    referenceSize,
    toCreateTaskRequest,
    toGenerateValues,
} from '#/pages/generate/form'
import { toSubmitIssue, toValidationIssues } from '#/pages/generate/issue'

import type { TaskApi } from '@silent-pix/shared'
import type { TaskFeedFilter } from '#/data/task/task.query'
import type { GenerateValues, PromptKind, ReferenceImage } from '#/pages/generate/form'
import type { GenerateIssue } from '#/pages/generate/issue'

export type DraftDefaultField = 'seed' | 'steps' | 'cfg' | 'sampler' | 'width' | 'height' | 'batch' | 'denoise' | 'positive' | 'negative'
export type DraftSource =
    | { kind: 'new' }
    | { kind: 'task', taskId: string }
    | { kind: 'metadata', fileName: string, defaults: { field: DraftDefaultField, value: string }[] }

type GenerateDraft = {
    source: DraftSource
    /* 表單載入 Task（taskId 有值）時才保留草稿快照，切回草稿時交還給表單。 */
    parkedValues?: GenerateValues
}

function sameConfig(a: GenerateValues, b: GenerateValues): boolean {
    const key = (values: GenerateValues) => JSON.stringify({ ...values, name: '' })
    return key(a) === key(b)
}

type GenerateUiState = {
    selectedTaskId: string | undefined
    feedTaskFlags: TaskApi.TaskFilterFlag[] | undefined
    feedSearch: string
    browserOpen: boolean
    submitIssues: GenerateIssue[]
    submitToken: number
    taskId: string | undefined
    promptVisible: Record<PromptKind, boolean>
    /* 兩段 editor 的高度（px），由 prompt 區的兩條拖曳調整並記在本機 */
    promptHeight: Record<PromptKind, number>
    draft: GenerateDraft | undefined
    /* 表單整份換內容（載入 task、回到或開新草稿）時遞增；prompt editor 以它換文件，task 轉成草稿時不變，輸入不中斷 */
    formRevision: number
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
        selectedTaskId: undefined,
        feedTaskFlags: undefined,
        feedSearch: '',
        browserOpen: false,
        submitIssues: [],
        submitToken: 0,
        taskId: undefined,
        promptVisible: { positive: true, negative: true },
        promptHeight: readPromptHeight(),
        draft: undefined,
        formRevision: 0,
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
                clearTask() {
                    store.set('selectedTaskId', undefined)
                },

                selectTask(taskId: string) {
                    store.set('selectedTaskId', taskId)
                },

                setFeedTaskFlags(flags: TaskApi.TaskFilterFlag[] | undefined) {
                    const normalized = flags && flags.length > 0 && flags.length < task.filterFlags.length
                        ? task.filterFlags.filter(flag => flags.includes(flag))
                        : undefined
                    store.set('feedTaskFlags', normalized)
                },

                setFeedSearch(search: string) {
                    store.set('feedSearch', search)
                },

                setBrowserOpen(open: boolean) {
                    store.set('browserOpen', open)
                },

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

    const feedFilter = (): TaskFeedFilter => ({ search: uiStore.state.feedSearch, taskFlags: uiStore.state.feedTaskFlags })

    onCleanup(subscribeTasksRemoved(taskIds => {
        const selectedTaskId = uiStore.state.selectedTaskId
        if (selectedTaskId !== undefined && taskIds.includes(selectedTaskId)) uiStore.clearTask()
    }))

    // MARK: Generate Task
    const createTaskMutation = useCreateTaskMutation()
    const refreshWorkflowList = useRefreshWorkflowList()
    const form = createGenerateForm(draftGenerateValues, {
        onInvalid: issues => uiStore.reportSubmitIssues(toValidationIssues(issues)),
        onSubmit: async values => {
            if (!isSelectionLoaded()) return

            const selectedTaskId = uiStore.state.selectedTaskId
            /* TanStack Form 每次改值都會換掉 values，舊回應只處理原來的表單版本。 */
            const submittedValues = form.state.values
            const response = await createTaskMutation.mutateAsync(toCreateTaskRequest(values))

            if (uiStore.state.selectedTaskId !== selectedTaskId || form.state.values !== submittedValues) return

            batch(() => {
                if (selectedTaskId === undefined) discardDraft()
                uiStore.selectTask(response.id)
            })
        },
    })
    const formSubmitting = form.useSelector(state => state.isSubmitting)
    const isSubmitting = () => formSubmitting() || createTaskMutation.isPending

    const submit = async () => {
        if (isSubmitting() || !isSelectionLoaded()) return

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

    // MARK: Draft
    const isEditingDraft = () => uiStore.state.taskId === undefined && uiStore.state.draft !== undefined
    const isSelectionLoaded = () => {
        const selectedTaskId = uiStore.state.selectedTaskId
        return selectedTaskId === undefined ? isEditingDraft() : uiStore.state.taskId === selectedTaskId
    }
    const formValues = form.useStore(state => state.values)
    let taskBase: GenerateValues | undefined

    const replaceDraft = (draft: GenerateDraft | undefined) => {
        releaseLocalPreview(uiStore.state.draft?.parkedValues?.referenceImage)
        uiStore.set('draft', draft)
    }

    createEffect(on(formValues, values => {
        const taskId = uiStore.state.taskId
        if (!taskId || taskId !== uiStore.state.selectedTaskId || !taskBase || sameConfig(values, taskBase)) return

        /* 表單原地成為草稿，讓 prompt editor 繼續編輯同一份文件。 */
        batch(() => {
            taskBase = undefined
            replaceDraft({ source: { kind: 'task', taskId } })
            uiStore.set('taskId', undefined)
            uiStore.clearTask()
        })
    }, { defer: true }))

    /* 草稿來自 task 時的來源 task */
    const draftSourceTaskId = () => {
        const source = uiStore.state.draft?.source
        return source?.kind === 'task' ? source.taskId : undefined
    }

    const draftName = () => (isEditingDraft() ? formValues().name : uiStore.state.draft?.parkedValues?.name ?? '').trim()

    const requestDraft = (values: GenerateValues, source: DraftSource) => {
        batch(() => {
            releaseLocalPreview(form.getFieldValue('referenceImage'))
            replaceDraft({ source })
            uiStore.set('taskId', undefined)
            taskBase = undefined
            resetForm(cloneGenerateValues(values))
            uiStore.clearTask()
            uiStore.setBrowserOpen(false)
        })
    }

    const startNewDraft = () => requestDraft(draftGenerateValues, { kind: 'new' })

    const discardDraft = () => {
        batch(() => {
            if (isEditingDraft()) {
                releaseLocalPreview(form.getFieldValue('referenceImage'))
                resetForm(cloneGenerateValues(draftGenerateValues))
            }
            replaceDraft(undefined)
        })
    }

    // MARK: Load a Task or draft
    function resetForm(values: GenerateValues) {
        cancelReferenceImageUpload()
        form.reset(values)
        uiStore.set('formRevision', revision => revision + 1)
    }

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

        const values = toGenerateValues(task)
        batch(() => {
            if (isEditingDraft()) {
                /* 快照接手本機預覽，直到還原或捨棄草稿。 */
                uiStore.set('draft', 'parkedValues', cloneGenerateValues(form.state.values))
            }
            else {
                releaseLocalPreview(form.getFieldValue('referenceImage'))
            }
            uiStore.set('taskId', task.id)
            taskBase = cloneGenerateValues(values)
            lastServerName = serverName
            resetForm(values)
        })
    }

    const loadDraft = () => {
        const values = uiStore.state.draft?.parkedValues
        if (!values) return

        batch(() => {
            releaseLocalPreview(form.getFieldValue('referenceImage'))
            uiStore.set('draft', 'parkedValues', undefined)
            uiStore.set('taskId', undefined)
            taskBase = undefined
            resetForm(cloneGenerateValues(values))
        })
    }

    // MARK: Reference image
    let pendingPreviewUrl: string | undefined

    function cancelReferenceImageUpload(): void {
        if (pendingPreviewUrl === undefined) return

        URL.revokeObjectURL(pendingPreviewUrl)
        pendingPreviewUrl = undefined
    }

    function releaseLocalPreview(reference: ReferenceImage | null | undefined): void {
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
        const taskId = uiStore.state.selectedTaskId
        const isCurrent = () => pendingPreviewUrl === previewUrl && uiStore.state.selectedTaskId === taskId
        pendingPreviewUrl = previewUrl

        const probe = new Image()
        probe.addEventListener('load', () => {
            if (!isCurrent()) return

            pendingPreviewUrl = undefined
            setReferenceImage(createLocalReferenceImage(file, probe.naturalWidth, probe.naturalHeight, previewUrl))
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

    createEffect(on(() => uiStore.state.selectedTaskId, cancelReferenceImageUpload, { defer: true }))

    onCleanup(() => {
        cancelReferenceImageUpload()
        releaseLocalPreview(form.getFieldValue('referenceImage'))
        releaseLocalPreview(uiStore.state.draft?.parkedValues?.referenceImage)
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
        feedFilter,
        isSelectionLoaded,
        isSubmitting,
        submit,
        loadTask,
        loadDraft,
        draftName,
        draftSourceTaskId,
        requestDraft,
        startNewDraft,
        discardDraft,
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
