import { comfy } from '@silent-pix/shared'
import { createContextProvider } from '@solid-primitives/context'
import { createEffect, createMemo, on } from 'solid-js'

import { useWorkflowDetailQuery, useWorkflowListQuery } from '#/data/workflow/workflow.query'
import { t } from '#/lib/i18n'
import { toLineMarks as createLineMarks } from '#/pages/workflow/components/graph/graph.document'
import { parseGraphText } from '#/pages/workflow/graph'
import { toNodeOptions } from '#/pages/workflow/node-option'
import { useWorkflowSession } from '#/pages/workflow/state/session'
import { isColdLoading } from '#/store/dev'

import type { Comfy, GeneratorField, Mapping, WorkflowApi } from '@silent-pix/shared'
import type { LineMark } from '#/pages/workflow/components/graph/graph.document'
import type { GraphParse } from '#/pages/workflow/graph'
import type { WorkflowNodeOption } from '#/pages/workflow/node-option'

function createWorkflowStore() {
    const session = useWorkflowSession()
    const { form, isModified, isSubmitting, state } = session

    // MARK: Workflow selection
    const listQuery = useWorkflowListQuery()
    const remoteId = () => state.createDraftId ? null : state.selectedId
    const summaries = createMemo((): WorkflowApi.WorkflowSummary[] => listQuery.data?.options ?? [])
    const selectedSummary = createMemo(() => summaries().find(item => item.id === remoteId()))
    const missingFromList = () => remoteId() !== null && listQuery.isSuccess && !selectedSummary()
    const detailQuery = useWorkflowDetailQuery(remoteId)
    const isDeleted = () => remoteId() !== null && detailQuery.data === null
    const refreshWorkflowList = () => {
        void listQuery.refetch()
    }
    const record = createMemo((): WorkflowApi.GetWorkflowResponse | null => {
        const detail = detailQuery.data

        return detail && detail.id === remoteId()
            ? detail
            : null
    })

    const serverWorkflow = createMemo(() => {
        const current = record()
        const summary = selectedSummary()
        return summary && (!current || summary.revision >= current.revision) ? summary : current
    })
    const name = form.useSelector(state => state.values.name)

    const selection = createMemo(() => {
        const current = record()
        const isNew = state.createDraftId !== null

        return {
            id: state.createDraftId ?? state.selectedId,
            name: name(),
            revision: isNew ? 0 : state.baseRevision ?? current?.revision ?? 0,
            taskCount: isNew ? 0 : current?.taskCount ?? 0,
            isNew,
            isArchived: !isNew && Boolean(serverWorkflow()?.archivedAt),
        }
    })

    const draftLabel = createMemo((): string | null => {
        if (state.createDraftId !== null) {
            return t('task.draft')
        }

        return isModified() ? t('workflow.unsaved') : null
    })

    const hasSelection = () => selection().id !== null

    const isDetailLoading = isColdLoading(() => remoteId() !== null && !isDeleted() && detailQuery.isLoading)

    const isReadOnly = () => selection().isArchived
        || (state.createDraftId === null && (isDeleted() || !record()))

    const applyRemoved = (workflowId: string) => {
        if (state.selectedId === workflowId) {
            session.selectWorkflow(summaries().find(item => item.id !== workflowId)?.id ?? null)
        }
    }

    createEffect(on([record, session.isDefaultValue, isDeleted], ([current, isDefault, deleted]) => {
        if (current && isDefault && !deleted) session.loadWorkflow(current)
    }))

    createEffect(on([remoteId, missingFromList], ([id, missing]) => {
        if (!id || !missing || isDeleted()) return

        void detailQuery.refetch({ cancelRefetch: false }).then(result => {
            if (result.isSuccess && result.data?.id === id && remoteId() === id && missingFromList()) refreshWorkflowList()
        })
    }))

    createEffect(on([isDeleted, selectedSummary], ([deleted, summary]) => {
        if (deleted && summary && !listQuery.isFetching) refreshWorkflowList()
    }))

    createEffect(on(
        [() => listQuery.isSuccess, summaries, remoteId, isModified, isDeleted],
        ([loaded, options, selectedId, modified, deleted]) => {
            if (!loaded || modified || (selectedId !== null && (!deleted || options.some(item => item.id === selectedId)))) return

            session.selectWorkflow(options[0]?.id ?? null)
        },
    ))

    // MARK: Graph and mapping
    type WorkflowGraphState = {
        parse: GraphParse
        graph: Comfy.Graph | undefined
        nodeOptions: WorkflowNodeOption[]
        mappingIssues: Comfy.MappingIssue[]
        lineMarks: Map<number, LineMark>
    }

    const graphText = form.useSelector(state => state.values.graphText)
    const configSchema = form.useSelector(state => state.values.configSchema)

    const graphParse = createMemo(() => parseGraphText(graphText()))
    const nodeOptions = createMemo(() => {
        const parse = graphParse()

        return parse.status === 'ok' ? toNodeOptions(parse.graph) : []
    })
    const graphState = createMemo((): WorkflowGraphState => {
        const parse = graphParse()

        if (parse.status !== 'ok') {
            return {
                parse,
                graph: undefined,
                nodeOptions: [],
                mappingIssues: [],
                lineMarks: new Map<number, LineMark>(),
            }
        }

        const schema = configSchema()
        const mappingIssues = comfy.validateMapping(parse.graph, schema)

        return {
            parse,
            graph: parse.graph,
            nodeOptions: nodeOptions(),
            mappingIssues,
            lineMarks: createLineMarks(graphText(), schema, mappingIssues),
        }
    })

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

    // MARK: Save Workflow
    const isConflict = () => {
        const current = serverWorkflow()
        const baseRevision = state.baseRevision

        return Boolean(
            !state.createDraftId
            && isModified()
            && baseRevision !== null
            && current
            && current.revision !== baseRevision,
        )
    }

    const canSave = () => {
        const current = selection()
        const { graph, mappingIssues } = graphState()
        return isModified()
            && !isReadOnly()
            && !isSubmitting()
            && !isDetailLoading()
            && !isConflict()
            && current.name.trim().length > 0
            && graph !== undefined
            && mappingIssues.length === 0
    }

    const submit = () => canSave() ? session.submit() : undefined

    return {
        state,
        form,
        listQuery,
        detailQuery,
        dismissSaveError: session.dismissSaveError,
        refreshWorkflowList,
        summaries,
        selection,
        graphState,
        isModified,
        isConflict,
        isDeleted,
        hasSelection,
        isDetailLoading,
        isReadOnly,
        isSubmitting,
        draftLabel,
        selectWorkflow: session.selectWorkflow,
        startCreate: session.startCreate,
        setMapping,
        applyRemoved,
        canSave,
        submit,
    }
}

// MARK: Workflow page access
const [WorkflowStoreProvider, readWorkflowStore] = createContextProvider(createWorkflowStore)
export { WorkflowStoreProvider }

export function useWorkflowStore() {
    const page = readWorkflowStore()
    if (!page) throw new Error('useWorkflowStore must be used within WorkflowStoreProvider')

    return page
}
