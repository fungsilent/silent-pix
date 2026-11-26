import { task } from '@silent-pix/shared'
import { createContextProvider } from '@solid-primitives/context'
import { batch, createEffect, createSignal, mergeProps, on, onCleanup } from 'solid-js'
import { reconcile } from 'solid-js/store'

import { subscribeTasksRemoved } from '#/data/task/task.event'
import { useCreateTaskMutation } from '#/data/task/task.query'
import { useRefreshWorkflowList } from '#/data/workflow/workflow.query'
import { ApiError } from '#/lib/api-client'
import { createStore } from '#/lib/store'
import {
    cloneGenerateValues,
    createGenerateForm,
    draftGenerateValues,
    toCreateTaskRequest,
    toGenerateValues,
} from '#/pages/generate/form'
import { toSubmitIssue, toValidationIssues } from '#/pages/generate/issue'
import { createPromptLayout } from '#/pages/generate/state/promptLayout'
import { createReferenceImage } from '#/pages/generate/state/referenceImage'

import type { TaskApi } from '@silent-pix/shared'
import type { TaskFeedFilter } from '#/data/task/task.query'
import type { GenerateValues } from '#/pages/generate/form'
import type { GenerateIssue } from '#/pages/generate/issue'

export type DraftDefaultField = 'seed' | 'steps' | 'cfg' | 'sampler' | 'width' | 'height' | 'batch' | 'denoise' | 'positive' | 'negative'
export type DraftSource =
    | { kind: 'new' }
    | { kind: 'task', taskId: string }
    | { kind: 'metadata', fileName: string, defaults: { field: DraftDefaultField, value: string }[] }

type GenerateDraft = {
    source: DraftSource
    /* 表單顯示 task 時暫存的草稿值 */
    parkedValues?: GenerateValues
}

/*
 * 表單目前顯示的內容；與 selectedTaskId 相等才算載入完成。
 * base：判斷改動的基準。serverName：上次同步的 Server 名稱；表單名稱未改動時才跟隨 Server 改名。
 */
type FormOwner =
    | { kind: 'draft' }
    | { kind: 'task', taskId: string, base: GenerateValues, serverName: string }

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
    draft: GenerateDraft | undefined
    /* 表單整份換內容（載入 task、回到或開新草稿）時遞增；prompt editor 以它換文件，task 轉成草稿時不變，輸入不中斷 */
    formRevision: number
}

function createGenerateSession() {
    // MARK: State
    const initialState: GenerateUiState = {
        selectedTaskId: undefined,
        feedTaskFlags: undefined,
        feedSearch: '',
        browserOpen: false,
        submitIssues: [],
        submitToken: 0,
        draft: undefined,
        formRevision: 0,
    }

    const uiStore = createStore(
        initialState,
        store => ({
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
        }),
    )

    const promptLayout = createPromptLayout()

    // MARK: Task selection
    const feedFilter = (): TaskFeedFilter => ({ search: uiStore.state.feedSearch, taskFlags: uiStore.state.feedTaskFlags })

    onCleanup(subscribeTasksRemoved(taskIds => {
        const selectedTaskId = uiStore.state.selectedTaskId
        if (selectedTaskId !== undefined && taskIds.includes(selectedTaskId)) uiStore.clearTask()
    }))

    // MARK: Form and submit
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
    const referenceImage = createReferenceImage({ form, selectedTaskId: () => uiStore.state.selectedTaskId })
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
    /* 表單擁有權：task 一改動就原地轉成草稿 */
    /* store 會淺層合併物件，需整個替換 */
    const [formOwner, setFormOwner] = createSignal<FormOwner>({ kind: 'draft' })
    const isEditingDraft = () => formOwner().kind === 'draft' && uiStore.state.draft !== undefined
    const isSelectionLoaded = () => {
        const selectedTaskId = uiStore.state.selectedTaskId
        const owner = formOwner()
        return selectedTaskId === undefined ? isEditingDraft() : owner.kind === 'task' && owner.taskId === selectedTaskId
    }
    const formValues = form.useStore(state => state.values)

    const replaceDraft = (draft: GenerateDraft | undefined) => {
        referenceImage.release(uiStore.state.draft?.parkedValues?.referenceImage)
        /* 整個替換，不留舊 parkedValues */
        uiStore.set('draft', draft && reconcile(draft))
    }

    createEffect(on(formValues, values => {
        const owner = formOwner()
        if (owner.kind !== 'task' || owner.taskId !== uiStore.state.selectedTaskId || sameConfig(values, owner.base)) return

        /* 表單原地成為草稿，讓 prompt editor 繼續編輯同一份文件。 */
        batch(() => {
            replaceDraft({ source: { kind: 'task', taskId: owner.taskId } })
            setFormOwner({ kind: 'draft' })
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
            referenceImage.release(form.getFieldValue('referenceImage'))
            replaceDraft({ source })
            setFormOwner({ kind: 'draft' })
            resetForm(cloneGenerateValues(values))
            uiStore.clearTask()
            uiStore.setBrowserOpen(false)
        })
    }

    const startNewDraft = () => requestDraft(draftGenerateValues, { kind: 'new' })

    const discardDraft = () => {
        batch(() => {
            if (isEditingDraft()) {
                referenceImage.release(form.getFieldValue('referenceImage'))
                resetForm(cloneGenerateValues(draftGenerateValues))
            }
            replaceDraft(undefined)
        })
    }

    // MARK: Load a Task or draft
    function resetForm(values: GenerateValues) {
        referenceImage.cancelUpload()
        form.reset(values)
        uiStore.set('formRevision', revision => revision + 1)
    }

    const loadTask = (task: TaskApi.GetTaskResponse) => {
        const serverName = task.name ?? ''
        const owner = formOwner()
        if (owner.kind === 'task' && owner.taskId === task.id) {
            // 跨路由保留名稱基準，只有使用者沒改過名稱才跟隨 Server。
            if (serverName !== owner.serverName && form.getFieldValue('name') === owner.serverName) {
                form.setFieldValue('name', serverName)
            }
            setFormOwner({ ...owner, serverName })
            return
        }

        const values = toGenerateValues(task)
        batch(() => {
            if (isEditingDraft()) {
                /* 快照接手本機預覽，直到還原或捨棄草稿。 */
                uiStore.set('draft', 'parkedValues', cloneGenerateValues(form.state.values))
            }
            else {
                referenceImage.release(form.getFieldValue('referenceImage'))
            }
            setFormOwner({ kind: 'task', taskId: task.id, base: cloneGenerateValues(values), serverName })
            resetForm(values)
        })
    }

    const loadDraft = () => {
        const values = uiStore.state.draft?.parkedValues
        if (!values) return

        batch(() => {
            referenceImage.release(form.getFieldValue('referenceImage'))
            uiStore.set('draft', 'parkedValues', undefined)
            setFormOwner({ kind: 'draft' })
            resetForm(cloneGenerateValues(values))
        })
    }

    onCleanup(() => referenceImage.release(uiStore.state.draft?.parkedValues?.referenceImage))

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
        /* 合併 promptLayout 的 state */
        state: mergeProps(uiStore.state, promptLayout.state),
        togglePromptVisible: promptLayout.togglePromptVisible,
        setPromptHeight: promptLayout.setPromptHeight,
        resetPromptHeight: promptLayout.resetPromptHeight,
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
        setReferenceImage: referenceImage.set,
        clearReferenceImage: referenceImage.clear,
        uploadReferenceImage: referenceImage.upload,
        cancelReferenceImageUpload: referenceImage.cancelUpload,
        setReferenceMask: referenceImage.setMask,
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
