import { sql } from 'drizzle-orm'
import {
    check,
    index,
    integer,
    sqliteTable,
    text,
    uniqueIndex,
} from 'drizzle-orm/sqlite-core'

import { images } from '#/schema/image'
import { uuidCheck } from '#/schema/schema.util'
import { tasks } from '#/schema/task'
import { createUUID } from '#/uuid'

import type { UpdateData } from '#/schema/schema.util'
import type { UUID } from '#/uuid'

/* mask = Inpainting / control = ControlNet */
export const taskImageTypes = ['input', 'output', 'mask', 'control'] as const

export type TaskImageType = typeof taskImageTypes[number]

/* task 與 image 的多對多關聯：某個 task 以某種身分、在第幾個位置用了某張圖 */
export const taskImages = sqliteTable('task_images', {
    id: text('id').$type<UUID>().primaryKey().$defaultFn(createUUID),
    taskId: text('task_id').$type<UUID>().notNull().references(() => tasks.id, {
        onDelete: 'cascade',
        onUpdate: 'cascade',
    }),
    /* restrict：還有任何 task 引用著就刪不掉 image，是共用檔案的結構性保護 */
    imageId: text('image_id').$type<UUID>().notNull().references(() => images.id, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
    }),
    type: text('type', { enum: taskImageTypes }).$type<TaskImageType>().notNull(),
    sortIndex: integer('sort_index').notNull(),
    createdAt: integer('created_at').notNull(),
}, table => [
    check('task_images_task_id_uuid_check', uuidCheck(table.taskId)),
    check('task_images_image_id_uuid_check', uuidCheck(table.imageId)),
    check('task_images_sort_index_check', sql`${table.sortIndex} >= 0`),
    uniqueIndex('task_images_slot_idx').on(table.taskId, table.type, table.sortIndex),
    /* 反向查「這張圖還有誰在用」；刪 task 後的零引用判定與 GC 都走這裡 */
    index('task_images_image_id_idx').on(table.imageId),
    /* picker 分頁的 keyset cursor：createdAt 定義順序、id 確保唯一 */
    index('task_images_cursor_idx').on(table.createdAt, table.id),
])

export type TaskImageSelect = typeof taskImages.$inferSelect
export type TaskImageInsert = typeof taskImages.$inferInsert
export type TaskImageUpdate = UpdateData<TaskImageInsert>
