import {
    check,
    index,
    sqliteTable,
    text,
} from 'drizzle-orm/sqlite-core'

import { uuidCheck } from '#/schema/schema.util'
import { tasks } from '#/schema/task'
import { createUUID } from '#/uuid'

import type { UpdateData } from '#/schema/schema.util'
import type { UUID } from '#/uuid'

export const taskImages = sqliteTable('task_images', {
    id: text('id').$type<UUID>().primaryKey().$defaultFn(createUUID),
    taskId: text('task_id').$type<UUID>().notNull().references(() => tasks.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
    }),
    path: text('path').notNull(),
    filename: text('filename').notNull(),
}, table => [
    check('task_images_task_id_uuid_check', uuidCheck(table.taskId)),
    index('task_images_task_path_idx').on(table.taskId, table.path),
])

export type TaskImageSelect = typeof taskImages.$inferSelect
export type TaskImageInsert = typeof taskImages.$inferInsert
export type TaskImageUpdate = UpdateData<TaskImageInsert>
