import { workflowApi } from '@silent-pix/shared'
import { createContext, createMemo, useContext } from 'solid-js'

import { createStore } from '#/lib/store'
import { parseGraphText, toLineMarks } from '#/pages/workflow/components/graph/graph.document'
import { workflowFixtures } from '#/pages/workflow/fixture'

import type { WorkflowApi } from '@silent-pix/shared'
import type { GraphParse, LineMark } from '#/pages/workflow/components/graph/graph.document'
import type { JSX } from 'solid-js'

export type WorkflowRecord = {
    id: string
    name: string
    archivedAt: number | null
    graphText: string
    configSchema: WorkflowApi.ConfigSchema
}

export type WorkflowDraft = {
    id: string
    name: string
    graphText: string
    configSchema: WorkflowApi.ConfigSchema
    /* 還沒建立的那一筆：Enter 才成為 record，Esc 直接丟掉 */
    isNew: boolean
}

type WorkflowState = {
    records: WorkflowRecord[]
    selectedId: string | null
    draft: WorkflowDraft | null
}

const initialState: WorkflowState = {
    records: workflowFixtures,
    selectedId: workflowFixtures[0]?.id ?? null,
    draft: null,
}

let draftSequence = 0

function toDraft(record: WorkflowRecord): WorkflowDraft {
    return {
        id: record.id,
        name: record.name,
        graphText: record.graphText,
        configSchema: { ...record.configSchema },
        isNew: false,
    }
}

export function createWorkflowStore() {
    const store = createStore(initialState, core => ({
        /*
         * 兩個 derived 掛在 store 上，面板各自 useWorkflowStore() 取用。
         * 放在頁面層再往下傳的話，每個面板的標題列都要多接幾個 prop。
         */
        selection: createMemo((): WorkflowSelection => {
            const draft = core.state.draft
            const record = core.state.records.find(item => item.id === core.state.selectedId)
            const archivedAt = record?.archivedAt ?? null

            if (draft) {
                return {
                    id: draft.id,
                    name: draft.name,
                    archivedAt,
                    graphText: draft.graphText,
                    configSchema: draft.configSchema,
                    isNew: draft.isNew,
                    isDirty: true,
                    isArchived: archivedAt !== null,
                }
            }

            return {
                id: record?.id ?? null,
                name: record?.name ?? '',
                archivedAt,
                graphText: record?.graphText ?? '',
                configSchema: record?.configSchema ?? {},
                isNew: false,
                isDirty: false,
                isArchived: archivedAt !== null,
            }
        }),

        selectWorkflow(id: string) {
            core.set('selectedId', id)
            core.set('draft', null)
        },

        /* + 建立一筆未持久化的 draft，名稱在右欄的 Name 欄位輸入 */
        startCreate() {
            draftSequence += 1
            const id = `draft-${draftSequence}`

            core.set('draft', {
                id,
                name: '',
                graphText: '',
                configSchema: {},
                isNew: true,
            })
            core.set('selectedId', id)
        },

        cancelCreate() {
            if (!core.state.draft?.isNew) {
                return
            }

            core.set('draft', null)
            core.set('selectedId', core.state.records[0]?.id ?? null)
        },

        commitName(id: string, value: string) {
            const name = value.trim()

            if (name.length === 0 || name.length > 120) {
                return
            }

            const draft = core.state.draft

            if (draft && draft.id === id) {
                core.produce('draft', value => {
                    if (value) {
                        value.name = name
                    }
                })
                return
            }

            core.produce('records', records => {
                const record = records.find(item => item.id === id)

                if (record) {
                    record.name = name
                }
            })
        },

        setGraphText(text: string) {
            ensureDraft(core)
            core.produce('draft', draft => {
                if (draft) {
                    draft.graphText = text
                }
            })
        },

        setMapping(field: WorkflowApi.GeneratorField, value: WorkflowApi.Mapping | undefined) {
            ensureDraft(core)
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

        discardDraft() {
            core.set('draft', null)
        },
    }))

    /*
     * draft 只在真的動到內容時才建立。沒有 draft 就直接讀 record，
     * dirty 判斷因此不必逐欄比對。
     */
    function ensureDraft(core: { state: WorkflowState, set: (key: 'draft', value: WorkflowDraft | null) => void }) {
        if (core.state.draft) {
            return
        }

        const record = core.state.records.find(item => item.id === core.state.selectedId)

        if (record) {
            core.set('draft', toDraft(record))
        }
    }

    const graphState = createMemo((): WorkflowGraphState => {
        const { graphText, configSchema } = store.selection()
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

        const mappingIssues = workflowApi.validateMapping(parse.graph, configSchema)

        return {
            parse,
            graph: parse.graph,
            nodeOptions: workflowApi.toNodeOptions(parse.graph),
            mappingIssues,
            /* 標記算在「畫面上那份文字」上，不是正規化後的版本，否則行號會對不上 */
            lineMarks: toLineMarks(graphText, configSchema, mappingIssues),
        }
    })

    return { ...store, graphState }
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
    archivedAt: number | null
    graphText: string
    configSchema: WorkflowApi.ConfigSchema
    isNew: boolean
    isDirty: boolean
    isArchived: boolean
}

export type WorkflowGraphState = {
    parse: GraphParse
    graph: WorkflowApi.ComfyGraph | undefined
    nodeOptions: WorkflowApi.ComfyNodeOption[]
    mappingIssues: WorkflowApi.MappingIssue[]
    lineMarks: Map<number, LineMark>
}
