import { sql } from 'drizzle-orm'
import {
    check,
    integer,
    sqliteTable,
    text,
} from 'drizzle-orm/sqlite-core'

import { uuidCheck } from '#/schema/schema.util'
import { createUUID } from '#/uuid'

import type { JsonObject, UpdateData } from '#/schema/schema.util'
import type { UUID } from '#/uuid'

export type ConfigSchema = Record<string, {
    input: string
    nodeId: string
}>

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

export type WorkflowSelect = typeof workflows.$inferSelect
export type WorkflowInsert = typeof workflows.$inferInsert
export type WorkflowUpdate = UpdateData<WorkflowInsert>
