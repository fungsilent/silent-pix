import { comfy } from '@silent-pix/shared'
import { createContext, createEffect, createMemo, on, useContext } from 'solid-js'

import {
    useCreateWorkflowMutation,
    useUpdateWorkflowMutation,
    useWorkflowDetailQuery,
    useWorkflowListQuery,
} from '#/features/workflow/workflow.query'
import { createStore } from '#/lib/store'
import { toLineMarks as createLineMarks, parseGraphText as parseWorkflowGraphText } from '#/pages/workflow/components/graph/graph.document'
import {
    cloneWorkflowValues,
    createWorkflowForm,
    emptyWorkflowValues,
    toWorkflowValues,
} from '#/pages/workflow/form'
import { toValidationIssues } from '#/pages/workflow/issue'

import type { Comfy, ConfigSchema, GeneratorField, Mapping, WorkflowApi } from '@silent-pix/shared'
import type { AppIssue } from '#/lib/issue'
import type { GraphParse, LineMark } from '#/pages/workflow/components/graph/graph.document'
import type { WorkflowFormValues, WorkflowRecord } from '#/pages/workflow/form'
import type { JSX } from 'solid-js'

type WorkflowUiState = {
    selectedId: string | null
    createDraftId: string | null
    baseRevision: number | null
    validationIssues: AppIssue[]
}

function createInitialState(): WorkflowUiState {
    return {
        selectedId: null,
        createDraftId: null,
        baseRevision: null,
        validationIssues: [],
    }
}

let draftSequence = 0

export function toWorkflowRecord(detail: WorkflowApi.GetWorkflowResponse): WorkflowRecord {
    return {
        id: detail.id,
        name: detail.name,
        revision: detail.revision,
        archivedAt: detail.archivedAt,
        taskCount: detail.taskCount,
        graph: detail.graph,
        graphText: JSON.stringify(detail.graph, null, 2),
        configSchema: detail.configSchema,
    }
}

export function createWorkflowStore() {
    const uiStore = createStore(
        createInitialState(),
        store => ({
            clearValidationIssues() {
                store.set('validationIssues', [])
            },

            reportValidationIssues(issues: AppIssue[]) {
                store.set('validationIssues', issues)
            },
        }),
    )
    const listQuery = useWorkflowListQuery('all')
    const createMutation = useCreateWorkflowMutation()
    const updateMutation = useUpdateWorkflowMutation()
    const remoteId = createMemo(() => uiStore.state.createDraftId
        ? null
        : uiStore.state.selectedId)
    const detailQuery = useWorkflowDetailQuery(remoteId)
    const summaries = createMemo((): WorkflowApi.WorkflowSummary[] => listQuery.data?.options ?? [])
    const refreshWorkflowList = () => {
        void listQuery.refetch()
    }
    const record = createMemo((): WorkflowRecord | null => {
        const detail = detailQuery.data

        return detail && detail.id === remoteId()
            ? toWorkflowRecord(detail)
            : null
    })

    const form = createWorkflowForm(emptyWorkflowValues, {
        onInvalid: issues => uiStore.reportValidationIssues(toValidationIssues(issues)),
        onSubmit: saveWorkflow,
    })
    const formValues = form.useSelector(state => state.values)
    const isDefaultValue = form.useSelector(state => state.isDefaultValue)
    const isSubmitting = form.useSelector(state => state.isSubmitting)

    const isModified = () => uiStore.state.createDraftId !== null || !isDefaultValue()

    const selection = createMemo((): WorkflowSelection => {
        const values = formValues()
        const current = record()
        const isNew = uiStore.state.createDraftId !== null
        const archivedAt = current?.archivedAt ?? null

        return {
            id: isNew ? uiStore.state.createDraftId : current?.id ?? uiStore.state.selectedId,
            name: values.name,
            graphText: values.graphText,
            configSchema: values.configSchema,
            archivedAt: isNew ? null : archivedAt,
            revision: isNew ? 0 : uiStore.state.baseRevision ?? current?.revision ?? 0,
            taskCount: isNew ? 0 : current?.taskCount ?? 0,
            isNew,
            isArchived: !isNew && archivedAt !== null,
        }
    })

    const graphState = createMemo((): WorkflowGraphState => {
        const { graphText, configSchema } = selection()
        const parse = parseWorkflowGraphText(graphText)

        if (parse.status !== 'ok') {
            return {
                parse,
                graph: undefined,
                nodeOptions: [],
                mappingIssues: [],
                lineMarks: new Map<number, LineMark>(),
            }
        }

        const mappingIssues = comfy.validateMapping(parse.graph, configSchema)

        return {
            parse,
            graph: parse.graph,
            nodeOptions: comfy.toNodeOptions(parse.graph),
            mappingIssues,
            lineMarks: createLineMarks(graphText, configSchema, mappingIssues),
        }
    })

    const isConflict = () => {
        const current = record()
        const baseRevision = uiStore.state.baseRevision

        return Boolean(
            !uiStore.state.createDraftId
            && isModified()
            && baseRevision !== null
            && current
            && current.id === uiStore.state.selectedId
            && current.revision !== baseRevision,
        )
    }

    const draftLabel = createMemo((): 'Draft' | 'Unsaved' | null => {
        if (uiStore.state.createDraftId !== null) {
            return 'Draft'
        }

        return isModified() ? 'Unsaved' : null
    })

    const isLoading = () => Boolean(
        !uiStore.state.createDraftId
        && (!uiStore.state.selectedId || !record() || record()?.id !== uiStore.state.selectedId),
    )

    const selectWorkflow = (id: string) => {
        if (uiStore.state.selectedId === id && uiStore.state.createDraftId === null) {
            return
        }

        form.reset(cloneWorkflowValues(emptyWorkflowValues))
        uiStore.set({ selectedId: id, createDraftId: null, baseRevision: null, validationIssues: [] })
    }

    const startCreate = () => {
        draftSequence += 1
        const id = `draft-${draftSequence}`

        form.reset(cloneWorkflowValues(emptyWorkflowValues))
        uiStore.set({ selectedId: null, createDraftId: id, baseRevision: null, validationIssues: [] })
    }

    const cancelCreate = () => {
        if (uiStore.state.createDraftId === null) {
            return
        }

        const first = summaries()[0]?.id ?? null
        form.reset(cloneWorkflowValues(emptyWorkflowValues))
        uiStore.set({ selectedId: first, createDraftId: null, baseRevision: null, validationIssues: [] })
    }

    const setMapping = (field: GeneratorField, value: Mapping | undefined) => {
        form.setFieldValue('configSchema', current => {
            const next = { ...current }

            if (value) {
                next[field] = value
            }
            else {
                delete next[field]
            }

            return next
        })
    }

    const applySaved = (detail: WorkflowApi.GetWorkflowResponse) => {
        const saved = toWorkflowRecord(detail)

        form.reset(toWorkflowValues(saved))
        uiStore.set({
            selectedId: detail.id,
            createDraftId: null,
            baseRevision: detail.revision,
            validationIssues: [],
        })
    }

    async function saveWorkflow(values: WorkflowFormValues): Promise<void> {
        const current = selection()
        const graph = graphState().graph

        if (
            !graph
            || graphState().mappingIssues.length > 0
            || !isModified()
            || current.isArchived
            || isConflict()
        ) {
            return
        }

        if (current.isNew) {
            const created = await createMutation.mutateAsync({
                name: values.name,
                graph,
                configSchema: values.configSchema,
            })

            applySaved(created)
            return
        }

        if (!current.id || uiStore.state.baseRevision === null) {
            return
        }

        const updated = await updateMutation.mutateAsync({
            workflowId: current.id,
            revision: uiStore.state.baseRevision,
            name: values.name,
            graph,
            configSchema: values.configSchema,
        })

        applySaved(updated)
    }

    createEffect(on(
        () => [record(), isDefaultValue()] as const,
        ([current, isDefault]) => {
            if (!current || !isDefault) {
                return
            }

            form.reset(toWorkflowValues(current))
            uiStore.set('baseRevision', current.revision)
        },
    ))

    const summaryIds = createMemo(() => summaries().map(item => item.id).join(','))

    createEffect(on(summaryIds, ids => {
        const options = summaries()

        if (ids.length === 0 || uiStore.state.createDraftId !== null) {
            return
        }

        if (options.some(item => item.id === uiStore.state.selectedId)) {
            return
        }

        const first = options[0]

        if (first) {
            selectWorkflow(first.id)
        }
    }))

    return {
        ...uiStore,
        form,
        listQuery,
        detailQuery,
        createMutation,
        updateMutation,
        refreshWorkflowList,
        remoteId,
        record,
        summaries,
        selection,
        graphState,
        isModified,
        isConflict,
        isLoading,
        isSubmitting,
        draftLabel,
        selectWorkflow,
        startCreate,
        cancelCreate,
        setMapping,
        applySaved,
    }
}

export type WorkflowStore = ReturnType<typeof createWorkflowStore>

const WorkflowStoreContext = createContext<WorkflowStore>()

type WorkflowStoreProviderProps = {
    children: JSX.Element
    store: WorkflowStore
}

export function WorkflowStoreProvider(props: WorkflowStoreProviderProps) {
    return WorkflowStoreContext.Provider({
        get children() {
            return props.children
        },
        value: props.store,
    })
}

export function useWorkflowStore() {
    const store = useContext(WorkflowStoreContext)

    if (!store) {
        throw new Error('Workflow store context is missing')
    }

    return store
}

export type WorkflowSelection = {
    id: string | null
    name: string
    graphText: string
    configSchema: ConfigSchema
    archivedAt: string | null
    revision: number
    taskCount: number
    isNew: boolean
    isArchived: boolean
}

export type WorkflowGraphState = {
    parse: GraphParse
    graph: Comfy.Graph | undefined
    nodeOptions: Comfy.NodeOption[]
    mappingIssues: Comfy.MappingIssue[]
    lineMarks: Map<number, LineMark>
}
