import { comfy, config } from '@silent-pix/shared'
import { createContext, createEffect, createMemo, on, useContext } from 'solid-js'

import { useWorkflowDetailQuery, useWorkflowListQuery } from '#/features/workflow/workflow.query'
import { createStore } from '#/lib/store'
import { parseGraphText, toLineMarks } from '#/pages/workflow/components/graph/graph.document'

import type { Comfy, ConfigSchema, GeneratorField, Mapping, WorkflowApi } from '@silent-pix/shared'
import type { GraphParse, LineMark } from '#/pages/workflow/components/graph/graph.document'
import type { JSX } from 'solid-js'

export type WorkflowRecord = {
    id: string
    name: string
    revision: number
    archivedAt: string | null
    taskCount: number
    graph: Comfy.Graph
    graphText: string
    configSchema: ConfigSchema
}

export type WorkflowDraft = {
    id: string
    name: string
    graphText: string
    configSchema: ConfigSchema
    revision: number
    isNew: boolean
}

/* store 只擁有 UI 狀態。遠端資料的擁有者是 query cache。 */
type WorkflowState = {
    selectedId: string | null
    draft: WorkflowDraft | null
}

function createInitialState(): WorkflowState {
    return {
        selectedId: null,
        draft: null,
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
        graphText: `${JSON.stringify(detail.graph, null, 2)}\n`,
        configSchema: detail.configSchema,
    }
}

function toDraft(record: WorkflowRecord): WorkflowDraft {
    return {
        id: record.id,
        name: record.name,
        graphText: record.graphText,
        configSchema: { ...record.configSchema },
        revision: record.revision,
        isNew: false,
    }
}

function sameConfigSchema(left: ConfigSchema, right: ConfigSchema): boolean {
    return config.generatorFields.every(field => {
        const a = left[field]
        const b = right[field]

        return a?.nodeId === b?.nodeId && a?.input === b?.input
    })
}

export function createWorkflowStore() {
    const core = createStore(createInitialState())

    const remoteId = createMemo(() => core.state.draft?.isNew
        ? null
        : core.state.selectedId)

    const listQuery = useWorkflowListQuery('all')
    const detailQuery = useWorkflowDetailQuery(remoteId)

    const summaries = createMemo((): WorkflowApi.WorkflowSummary[] => listQuery.data?.options ?? [])

    const record = createMemo((): WorkflowRecord | null => {
        const detail = detailQuery.data

        return detail && detail.id === remoteId()
            ? toWorkflowRecord(detail)
            : null
    })

    function ensureDraft() {
        if (core.state.draft) {
            return
        }

        const current = record()

        if (current) {
            core.set('draft', toDraft(current))
        }
    }

    function currentName(): string {
        return core.state.draft?.name ?? record()?.name ?? ''
    }

    function currentGraphText(): string {
        return core.state.draft?.graphText ?? record()?.graphText ?? ''
    }

    const actions = {
        selectWorkflow(id: string) {
            if (core.state.selectedId === id) {
                return
            }

            core.set('selectedId', id)
            core.set('draft', null)
        },

        startCreate() {
            draftSequence += 1
            const id = `draft-${draftSequence}`

            core.set('draft', {
                id,
                name: '',
                graphText: '',
                configSchema: {},
                revision: 0,
                isNew: true,
            })
            core.set('selectedId', id)
        },

        cancelCreate() {
            if (!core.state.draft?.isNew) {
                return
            }

            core.set('draft', null)
            core.set('selectedId', summaries()[0]?.id ?? null)
        },

        setName(value: string) {
            if (currentName() === value) {
                return
            }

            ensureDraft()
            core.produce('draft', draft => {
                if (draft) {
                    draft.name = value.slice(0, 120)
                }
            })
        },

        commitName(value: string) {
            if (currentName() === value.trim()) {
                return
            }

            ensureDraft()
            core.produce('draft', draft => {
                if (draft) {
                    draft.name = value.trim().slice(0, 120)
                }
            })
        },

        setGraphText(text: string) {
            if (currentGraphText() === text) {
                return
            }

            ensureDraft()
            core.produce('draft', draft => {
                if (draft) {
                    draft.graphText = text
                }
            })
        },

        setMapping(field: GeneratorField, value: Mapping | undefined) {
            const current = (core.state.draft ?? record())?.configSchema[field]

            if (current?.nodeId === value?.nodeId && current?.input === value?.input) {
                return
            }

            ensureDraft()
            core.produce('draft', draft => {
                if (!draft) {
                    return
                }

                if (value) {
                    draft.configSchema[field] = value
                    return
                }

                delete draft.configSchema[field]
            })
        },

        applySaved(detail: WorkflowApi.GetWorkflowResponse) {
            core.set('draft', null)
            core.set('selectedId', detail.id)
        },

        discardDraft() {
            core.set('draft', null)
        },
    }

    const selection = createMemo((): WorkflowSelection => {
        const draft = core.state.draft
        const current = record()
        const archivedAt = current?.archivedAt ?? null

        if (draft) {
            return {
                id: draft.id,
                name: draft.name,
                archivedAt: draft.isNew ? null : archivedAt,
                graphText: draft.graphText,
                configSchema: draft.configSchema,
                revision: draft.revision,
                taskCount: draft.isNew ? 0 : current?.taskCount ?? 0,
                isNew: draft.isNew,
                isArchived: !draft.isNew && archivedAt !== null,
            }
        }

        return {
            id: current?.id ?? null,
            name: current?.name ?? '',
            archivedAt,
            graphText: current?.graphText ?? '',
            configSchema: current?.configSchema ?? {},
            revision: current?.revision ?? 0,
            taskCount: current?.taskCount ?? 0,
            isNew: false,
            isArchived: archivedAt !== null,
        }
    })

    const graphState = createMemo((): WorkflowGraphState => {
        const { graphText, configSchema } = selection()
        const parse = parseGraphText(graphText)

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
            /* 標記算在「畫面上那份文字」上，不是正規化後的版本，否則行號會對不上 */
            lineMarks: toLineMarks(graphText, configSchema, mappingIssues),
        }
    })

    const isDirty = createMemo(() => {
        const draft = core.state.draft

        if (!draft) {
            return false
        }

        if (draft.isNew) {
            return true
        }

        const current = record()

        if (!current || current.id !== draft.id) {
            return true
        }

        if (draft.name !== current.name) {
            return true
        }

        if (!sameConfigSchema(draft.configSchema, current.configSchema)) {
            return true
        }

        const graph = graphState().graph

        /* parse 不過就是有改動——存得進去的東西一定 parse 得過 */
        if (!graph) {
            return true
        }

        /* 兩邊都經過同一個 Zod schema，key 順序一致，直接比字串就夠 */
        return JSON.stringify(graph) !== JSON.stringify(current.graph)
    })

    const draftLabel = createMemo((): 'Draft' | 'Unsaved' | null => {
        if (core.state.draft?.isNew) {
            return 'Draft'
        }

        return isDirty() ? 'Unsaved' : null
    })

    /* draft 的 base revision 落後遠端，代表別人在你編輯期間存過了 */
    const isConflict = createMemo(() => {
        const draft = core.state.draft
        const current = record()

        return Boolean(
            draft
            && !draft.isNew
            && current
            && draft.id === current.id
            && draft.revision !== current.revision,
        )
    })

    const summaryIds = createMemo(() => summaries().map(item => item.id).join(','))

    createEffect(on(summaryIds, ids => {
        const options = summaries()

        if (ids.length === 0 || core.state.draft?.isNew) {
            return
        }

        if (options.some(item => item.id === core.state.selectedId)) {
            return
        }

        const first = options[0]

        if (first) {
            actions.selectWorkflow(first.id)
        }
    }))

    return {
        ...core,
        ...actions,
        detailQuery,
        draftLabel,
        graphState,
        isConflict,
        isDirty,
        listQuery,
        record,
        remoteId,
        selection,
        summaries,
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

/* MARK: derived */

export type WorkflowSelection = {
    id: string | null
    name: string
    archivedAt: string | null
    graphText: string
    configSchema: ConfigSchema
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
