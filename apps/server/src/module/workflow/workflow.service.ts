import { tasks, workflows } from '@silent-pix/db'
import { comfy } from '@silent-pix/shared'
import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm'

import { stringify } from '#/lib/json/json.stringify'
import { done, fail } from '#/lib/service-result'
import { castWorkflowModel } from '#/module/workflow/workflow.model'

import type { Database, UUID } from '@silent-pix/db'
import type { Comfy, ConfigSchema, WorkflowApi } from '@silent-pix/shared'
import type { WorkflowModel } from '#/module/workflow/workflow.model'

export const workflowService = {
    // MARK: CRUD
    async findWorkflow(database: Database, workflowId: WorkflowModel['id']) {
        const [workflow] = await workflowService.findWorkflows(database, [workflowId])

        return workflow ?? null
    },

    async findWorkflows(database: Database, workflowIds: readonly UUID[]) {
        if (!workflowIds.length) {
            return []
        }

        const workflowRows = await database
            .select()
            .from(workflows)
            .where(inArray(workflows.id, workflowIds))

        const workflowsById = new Map(
            workflowRows.map(workflow => [workflow.id, castWorkflowModel(workflow)]),
        )

        return workflowIds.flatMap(workflowId => {
            const workflow = workflowsById.get(workflowId)
            return workflow ? [workflow] : []
        })
    },

    async getWorkflowResponse(
        database: Database,
        workflowId: WorkflowModel['id'],
    ): Promise<WorkflowApi.GetWorkflowResponse | undefined> {
        const workflow = await workflowService.findWorkflow(database, workflowId)

        if (!workflow) {
            return undefined
        }

        return {
            id: workflow.id,
            name: workflow.name,
            revision: workflow.revision,
            archivedAt: workflow.archivedAt?.toISOString() ?? null,
            /* Delete 對話框要靠它預告會封存還是真刪 */
            taskCount: await workflowService.countTasks(database, workflow.id),
            graph: workflow.graph,
            configSchema: workflow.configSchema,
        }
    },

    async list(database: Database): Promise<WorkflowApi.WorkflowSummary[]> {
        const rows = await database
            .select()
            .from(workflows)
            .orderBy(asc(workflows.name), asc(workflows.id))

        return rows.map(row => {
            const workflow = castWorkflowModel(row)

            return {
                id: workflow.id,
                name: workflow.name,
                revision: workflow.revision,
                archivedAt: workflow.archivedAt?.toISOString() ?? null,
            }
        })
    },

    async create(
        database: Database,
        payload: Pick<WorkflowModel, 'name' | 'graph' | 'configSchema'>,
    ) {
        const checked = checkMapping(payload.graph, payload.configSchema)

        if (!checked.ok) {
            return checked
        }

        const now = Date.now()

        const [created] = await database
            .insert(workflows)
            .values({
                name: payload.name,
                graph: checked.data,
                configSchema: payload.configSchema,
                revision: 1,
                archivedAt: null,
                createdAt: now,
                updatedAt: now,
            })
            .returning()

        if (!created) {
            throw new Error('Workflow insert returned no row.')
        }

        return done(castWorkflowModel(created))
    },

    /*
     * Compare-and-swap：WHERE 帶上 revision 與 archived_at，讓「先讀再寫」之間
     * 插進來的另一次存檔不會被靜靜蓋掉。讀出來只是為了分辨要回哪一種錯誤。
     */
    async update(
        database: Database,
        workflowId: WorkflowModel['id'],
        expectedRevision: number,
        payload: Pick<WorkflowModel, 'name' | 'graph' | 'configSchema'>,
    ) {
        const checked = checkMapping(payload.graph, payload.configSchema)

        if (!checked.ok) {
            return checked
        }

        const current = await workflowService.findWorkflow(database, workflowId)

        if (!current) {
            return fail('WORKFLOW_NOT_FOUND')
        }

        if (current.archivedAt !== null) {
            return fail('WORKFLOW_ARCHIVED')
        }

        if (current.revision !== expectedRevision) {
            return fail('WORKFLOW_REVISION_CONFLICT')
        }

        /* 內容沒變就不推 revision，*/
        const unchanged = stringify(current.graph) === stringify(checked.data)
            && stringify(current.configSchema) === stringify(payload.configSchema)

        const [updated] = await database
            .update(workflows)
            .set({
                name: payload.name,
                graph: checked.data,
                configSchema: payload.configSchema,
                ...(unchanged ? {} : { revision: expectedRevision + 1 }),
                updatedAt: Date.now(),
            })
            .where(and(
                eq(workflows.id, workflowId),
                eq(workflows.revision, expectedRevision),
                isNull(workflows.archivedAt),
            ))
            .returning()

        /*
         * WHERE 沒中代表這幾行之間狀態變了，但不一定是 revision——也可能被封存或刪掉。
         * 重讀一次只為了分類錯誤；寫入已經被 CAS 拒絕，不會覆蓋別人的更新。
         */
        if (!updated) {
            const latest = await workflowService.findWorkflow(database, workflowId)

            if (!latest) {
                return fail('WORKFLOW_NOT_FOUND')
            }

            if (latest.archivedAt !== null) {
                return fail('WORKFLOW_ARCHIVED')
            }

            return fail('WORKFLOW_REVISION_CONFLICT')
        }

        return done(castWorkflowModel(updated))
    },

    async remove(database: Database, workflowId: WorkflowModel['id']) {
        const current = await workflowService.findWorkflow(database, workflowId)

        if (!current) {
            return fail('WORKFLOW_NOT_FOUND')
        }

        return database.transaction(async transaction => {
            const taskCount = await workflowService.countTasks(transaction, workflowId)

            if (taskCount === 0) {
                const [deleted] = await transaction
                    .delete(workflows)
                    .where(eq(workflows.id, workflowId))
                    .returning()

                /* 讀完到這裡之間被別人刪掉了 */
                if (!deleted) {
                    return fail('WORKFLOW_NOT_FOUND')
                }

                return done({
                    disposition: 'deleted' as const,
                    workflow: castWorkflowModel(deleted),
                })
            }

            /* 已經封存過的再按一次不重推 archivedAt */
            if (current.archivedAt !== null) {
                return done({
                    disposition: 'archived' as const,
                    workflow: current,
                })
            }

            const now = Date.now()
            const [archived] = await transaction
                .update(workflows)
                .set({ archivedAt: now, updatedAt: now })
                .where(eq(workflows.id, workflowId))
                .returning()

            if (!archived) {
                return fail('WORKFLOW_NOT_FOUND')
            }

            return done({
                disposition: 'archived' as const,
                workflow: castWorkflowModel(archived),
            })
        })
    },

    async countTasks(
        database: Pick<Database, 'select'>,
        workflowId: WorkflowModel['id'],
    ) {
        const [row] = await database
            .select({ value: count() })
            .from(tasks)
            .where(eq(tasks.workflowId, workflowId))

        return row?.value ?? 0
    },
}

function checkMapping(graph: Comfy.Graph, configSchema: ConfigSchema) {
    const issues = comfy.validateMapping(graph, configSchema)

    if (issues.length > 0) {
        return fail('WORKFLOW_MAPPING_INVALID', issues)
    }

    return done(graph)
}
