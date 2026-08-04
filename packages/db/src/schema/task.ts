import { sql } from 'drizzle-orm'
import {
    check,
    index,
    integer,
    sqliteTable,
    text,
    uniqueIndex,
} from 'drizzle-orm/sqlite-core'

import { uuidCheck } from '#/schema/schema.util'
import { workflows } from '#/schema/workflow'
import { createUUID } from '#/uuid'

import type { JsonObject, UpdateData } from '#/schema/schema.util'
import type { UUID } from '#/uuid'

export type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled'

export const tasks = sqliteTable('tasks', {
    id: text('id').$type<UUID>().primaryKey().$defaultFn(createUUID),
    name: text('name').notNull(),
    status: text('status', {
        enum: ['queued', 'running', 'done', 'failed', 'cancelled'],
    }).$type<TaskStatus>().notNull(),
    workflowId: text('workflow_id').$type<UUID>().notNull().references(() => workflows.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
    }),
    config: text('config', { mode: 'json' }).$type<JsonObject>().notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    comfyPromptId: text('comfy_prompt_id'),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
}, table => [
    check('tasks_id_uuid_check', uuidCheck(table.id)),
    check('tasks_workflow_id_uuid_check', uuidCheck(table.workflowId)),
    index('tasks_created_at_id_idx').on(table.createdAt, table.id),
    index('tasks_status_idx').on(table.status),
    uniqueIndex('tasks_comfy_prompt_id_idx').on(table.comfyPromptId),
    check('tasks_config_json_check', sql`json_valid(${table.config})`),
    check(
        'tasks_status_check',
        sql`${table.status} in ('queued', 'running', 'done', 'failed', 'cancelled')`,
    ),
])

export type TaskSelect = typeof tasks.$inferSelect
export type TaskInsert = typeof tasks.$inferInsert
export type TaskUpdate = UpdateData<TaskInsert>
