import { createContextProvider } from '@solid-primitives/context'
import { batch } from 'solid-js'

import { useCreateWorkflowMutation, useRefreshWorkflowList, useUpdateWorkflowMutation } from '#/data/workflow/workflow.query'
import { ApiError } from '#/lib/api-client'
import { createStore } from '#/lib/store'
import { cloneWorkflowValues, createWorkflowForm, emptyWorkflowValues, toWorkflowValues } from '#/pages/workflow/form'
import { parseGraphText } from '#/pages/workflow/graph'
import { toValidationIssues } from '#/pages/workflow/issue'

import type { WorkflowApi } from '@silent-pix/shared'
import type { WorkflowFormValues } from '#/pages/workflow/form'
import type { AppIssue } from '#/store/issue'

type WorkflowSessionState = {
    selectedId: string | null
    createDraftId: string | null
    baseRevision: number | null
    validationIssues: AppIssue[]
    saveError: unknown
}

function createWorkflowSession() {
    // MARK: State
    let editSequence = 0
    const initialState: WorkflowSessionState = {
        selectedId: null,
        createDraftId: null,
        baseRevision: null,
        validationIssues: [],
        saveError: null,
    }
    const uiStore = createStore(
        { ...initialState },
        store => ({
            clearValidationIssues() {
                store.set('validationIssues', [])
            },

            reportValidationIssues(issues: AppIssue[]) {
                store.set('validationIssues', issues)
            },
        }),
    )
    // MARK: Workflow draft
    const form = createWorkflowForm(emptyWorkflowValues, {
        onInvalid: issues => uiStore.reportValidationIssues(toValidationIssues(issues)),
        onSubmit: saveWorkflow,
    })
    const isDefaultValue = form.useSelector(state => state.isDefaultValue)
    const isModified = () => uiStore.state.createDraftId !== null || !isDefaultValue()

    const selectWorkflow = (id: string | null) => {
        if (uiStore.state.selectedId === id && uiStore.state.createDraftId === null) {
            return
        }

        editSequence += 1
        batch(() => {
            form.reset(cloneWorkflowValues(emptyWorkflowValues))
            uiStore.set({ ...initialState, selectedId: id })
        })
    }

    const startCreate = () => {
        editSequence += 1
        batch(() => {
            form.reset(cloneWorkflowValues(emptyWorkflowValues))
            uiStore.set({ ...initialState, createDraftId: `draft-${editSequence}` })
        })
    }

    const loadWorkflow = (detail: WorkflowApi.GetWorkflowResponse) => {
        batch(() => {
            form.reset(toWorkflowValues(detail))
            uiStore.set('baseRevision', detail.revision)
        })
    }

    // MARK: Save Workflow
    const createMutation = useCreateWorkflowMutation()
    const updateMutation = useUpdateWorkflowMutation()
    const refreshWorkflowList = useRefreshWorkflowList()
    const formSubmitting = form.useSelector(state => state.isSubmitting)
    const isSubmitting = () => formSubmitting() || createMutation.isPending || updateMutation.isPending
    const dismissSaveError = () => uiStore.set('saveError', null)

    const submit = async () => {
        const edit = editSequence
        uiStore.clearValidationIssues()
        dismissSaveError()

        try {
            await form.handleSubmit()
        }
        catch (error) {
            if (error instanceof ApiError && error.code === 'WORKFLOW_NOT_FOUND') {
                refreshWorkflowList()
            }

            if (edit === editSequence) uiStore.set('saveError', () => error)
        }

        return edit === editSequence
    }

    async function saveWorkflow(values: WorkflowFormValues): Promise<void> {
        const parsed = parseGraphText(values.graphText)
        if (parsed.status !== 'ok') {
            throw new Error(`Cannot save Workflow with graph status ${parsed.status}.`)
        }

        const edit = editSequence
        const { selectedId, createDraftId, baseRevision } = uiStore.state
        const request = { name: values.name, graph: parsed.graph, configSchema: values.configSchema }
        let saved: WorkflowApi.GetWorkflowResponse | null
        if (createDraftId !== null) {
            saved = await createMutation.mutateAsync(request)
        }
        else if (selectedId && baseRevision !== null) {
            saved = await updateMutation.mutateAsync({ ...request, workflowId: selectedId, revision: baseRevision })
        }
        else {
            return
        }

        if (!saved || edit !== editSequence) return

        batch(() => {
            loadWorkflow(saved)
            uiStore.set({ selectedId: saved.id, createDraftId: null, validationIssues: [] })
        })
    }

    return {
        state: uiStore.state,
        form,
        isDefaultValue,
        isSubmitting,
        isModified,
        loadWorkflow,
        selectWorkflow,
        startCreate,
        submit,
        dismissSaveError,
    }
}

// MARK: Workflow session access
const [WorkflowSessionProvider, readWorkflowSession] = createContextProvider(createWorkflowSession)
export { WorkflowSessionProvider }

export function useWorkflowSession() {
    const session = readWorkflowSession()
    if (!session) throw new Error('useWorkflowSession must be used within WorkflowSessionProvider')

    return session
}
