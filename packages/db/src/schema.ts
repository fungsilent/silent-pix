import { sql } from 'drizzle-orm'
import {
    check,
    index,
    integer,
    primaryKey,
    sqliteTable,
    text,
} from 'drizzle-orm/sqlite-core'

import { createUUID, type UUID } from '#/uuid'

export type JsonObject = Record<string, unknown>
export type ConfigSchema = Record<string, {
    input: string
    nodeId: string
}>
export type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled'

const uuidCheck = (column: unknown) => sql`
    length(${column}) = 36
    AND substr(${column}, 9, 1) = '-'
    AND substr(${column}, 14, 1) = '-'
    AND substr(${column}, 19, 1) = '-'
    AND substr(${column}, 24, 1) = '-'
    AND lower(${column}) NOT GLOB '*[^0-9a-f-]*'
`

export const workflows = sqliteTable('workflows', {
    id: text('id').$type<UUID>().primaryKey().$defaultFn(createUUID),
    name: text('name').notNull(),
    graph: text('graph', { mode: 'json' }).$type<JsonObject>().notNull(),
    configSchema: text('config_schema', { mode: 'json' }).$type<ConfigSchema>().notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
}, table => [
    check('workflows_id_uuid_check', uuidCheck(table.id)),
    check('workflows_graph_json_check', sql`json_valid(${table.graph})`),
    check('workflows_config_schema_json_check', sql`json_valid(${table.configSchema})`),
])

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
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
}, table => [
    check('tasks_id_uuid_check', uuidCheck(table.id)),
    check('tasks_workflow_id_uuid_check', uuidCheck(table.workflowId)),
    index('tasks_created_at_id_idx').on(table.createdAt, table.id),
    index('tasks_status_idx').on(table.status),
    check('tasks_config_json_check', sql`json_valid(${table.config})`),
    check(
        'tasks_status_check',
        sql`${table.status} in ('queued', 'running', 'done', 'failed', 'cancelled')`,
    ),
])

export const taskImages = sqliteTable('task_images', {
    taskId: text('task_id').$type<UUID>().notNull().references(() => tasks.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
    }),
    path: text('path').notNull(),
    filename: text('filename').notNull(),
}, table => [
    check('task_images_task_id_uuid_check', uuidCheck(table.taskId)),
    primaryKey({ columns: [table.taskId, table.path] }),
    index('task_images_task_path_idx').on(table.taskId, table.path),
])

export type Workflow = typeof workflows.$inferSelect
export type NewWorkflow = typeof workflows.$inferInsert
export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert
export type TaskImage = typeof taskImages.$inferSelect
export type NewTaskImage = typeof taskImages.$inferInsert

export const schema = {
    workflows,
    tasks,
    taskImages,
}
