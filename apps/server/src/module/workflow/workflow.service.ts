import { tasks, workflows } from '@silent-pix/db'
import { comfy } from '@silent-pix/shared'
import { and, asc, count, eq, inArray, isNull } from 'drizzle-orm'

import { stringify } from '#/lib/json/json.stringify'
import { done, fail } from '#/lib/service-result'
import { castWorkflowModel } from '#/module/workflow/workflow.model'

import type { DatabaseClient, UUID, WorkflowInsert } from '@silent-pix/db'
import type { Comfy, ConfigSchema, WorkflowApi } from '@silent-pix/shared'
import type { WorkflowModel } from '#/module/workflow/workflow.model'

export const workflowService = {
    // MARK: CRUD
    async findWorkflow(database: DatabaseClient, workflowId: WorkflowModel['id']) {
        const [workflow] = await workflowService.findWorkflows(database, [workflowId])

        return workflow ?? null
    },

    async findWorkflows(database: DatabaseClient, workflowIds: readonly UUID[]) {
        if (!workflowIds.length) {
            return []
        }

        const workflowRows = await database.db
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
        database: DatabaseClient,
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

    // MARK: service
    checkMapping(graph: Comfy.Graph, configSchema: ConfigSchema) {
        const issues = comfy.validateMapping(graph, configSchema)

        if (issues.length > 0) {
            return fail('WORKFLOW_MAPPING_INVALID', issues)
        }

        return done(graph)
    },

    async list(database: DatabaseClient): Promise<WorkflowApi.WorkflowSummary[]> {
        const rows = await database.db
            .select()
            .from(workflows)
            .orderBy(asc(workflows.name))

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
        database: DatabaseClient,
        payload: Pick<WorkflowInsert, 'name' | 'graph' | 'configSchema'>,
    ) {
        const now = Date.now()

        const [created] = await database.db
            .insert(workflows)
            .values({
                name: payload.name,
                graph: payload.graph,
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

        return castWorkflowModel(created)
    },

    /*
     * Compare-and-swap：WHERE 帶上 revision 與 archived_at，讓「先讀再寫」之間
     * 插進來的另一次存檔不會被靜靜蓋掉。讀出來只是為了分辨要回哪一種錯誤。
     */
    async update(
        database: DatabaseClient,
        workflowId: WorkflowModel['id'],
        expectedRevision: number,
        payload: Pick<WorkflowInsert, 'name' | 'graph' | 'configSchema'>,
    ) {
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
        const unchanged = stringify(current.graph) === stringify(payload.graph)
            && stringify(current.configSchema) === stringify(payload.configSchema)

        const [updated] = await database.db
            .update(workflows)
            .set({
                name: payload.name,
                graph: payload.graph,
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

    async remove(database: DatabaseClient, workflowId: WorkflowModel['id']) {
        const current = await workflowService.findWorkflow(database, workflowId)

        if (!current) {
            return fail('WORKFLOW_NOT_FOUND')
        }

        return database.db.transaction(async transaction => {
            const [counted] = await transaction
                .select({ value: count() })
                .from(tasks)
                .where(eq(tasks.workflowId, workflowId))

            if ((counted?.value ?? 0) === 0) {
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

    async countTasks(database: DatabaseClient, workflowId: WorkflowModel['id']) {
        const [row] = await database.db
            .select({ value: count() })
            .from(tasks)
            .where(eq(tasks.workflowId, workflowId))

        return row?.value ?? 0
    },
}
