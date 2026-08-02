import { sql } from 'drizzle-orm'
import {
    check,
    index,
    integer,
    primaryKey,
    sqliteTable,
    text,
} from 'drizzle-orm/sqlite-core'

export type JsonObject = Record<string, unknown>
export type TaskStatus = 'queued' | 'running' | 'done' | 'failed' | 'cancelled'

export const workflows = sqliteTable('workflows', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    graph: text('graph', { mode: 'json' }).$type<JsonObject>().notNull(),
    configSchema: text('config_schema', { mode: 'json' }).$type<JsonObject>().notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
}, table => [
    check('workflows_graph_json_check', sql`json_valid(${table.graph})`),
    check('workflows_config_schema_json_check', sql`json_valid(${table.configSchema})`),
])

export const tasks = sqliteTable('tasks', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    status: text('status', {
        enum: ['queued', 'running', 'done', 'failed', 'cancelled'],
    }).$type<TaskStatus>().notNull(),
    workflowId: text('workflow_id').notNull().references(() => workflows.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
    }),
    config: text('config', { mode: 'json' }).$type<JsonObject>().notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    errorCode: text('error_code'),
    errorMessage: text('error_message'),
}, table => [
    index('tasks_created_at_id_idx').on(table.createdAt, table.id),
    index('tasks_status_idx').on(table.status),
    check('tasks_config_json_check', sql`json_valid(${table.config})`),
    check(
        'tasks_status_check',
        sql`${table.status} in ('queued', 'running', 'done', 'failed', 'cancelled')`,
    ),
])

export const taskImages = sqliteTable('task_images', {
    taskId: text('task_id').notNull().references(() => tasks.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
    }),
    path: text('path').notNull(),
    filename: text('filename').notNull(),
}, table => [
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
