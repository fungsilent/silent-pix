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
import { createUUID } from '#/uuid'

import type { UpdateData } from '#/schema/schema.util'
import type { UUID } from '#/uuid'

export const imageMimes = ['image/png', 'image/jpeg'] as const

export type ImageMime = typeof imageMimes[number]

/* 內容定址：一張圖只以 sha256 存一份，task 透過 task_images 引用它。 */
export const images = sqliteTable('images', {
    id: text('id').$type<UUID>().primaryKey().$defaultFn(createUUID),
    hash: text('hash').notNull(),
    path: text('path').notNull(),
    mime: text('mime', { enum: imageMimes }).$type<ImageMime>().notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: integer('created_at').notNull(),
}, table => [
    check('images_id_uuid_check', uuidCheck(table.id)),
    check(
        'images_hash_check',
        sql`length(${table.hash}) = 64 AND lower(${table.hash}) NOT GLOB '*[^0-9a-f]*'`,
    ),
    check('images_dimension_check', sql`${table.width} > 0 AND ${table.height} > 0`),
    check('images_size_check', sql`${table.sizeBytes} > 0`),
    /* 「相同圖片不重複儲存」是靠這個 unique index，不是靠應用層先查再寫 */
    uniqueIndex('images_hash_idx').on(table.hash),
    /* GC 掃零引用時用 createdAt 截斷，只掃過了緩衝期的那一段 */
    index('images_created_at_idx').on(table.createdAt),
])

export type ImageSelect = typeof images.$inferSelect
export type ImageInsert = typeof images.$inferInsert
export type ImageUpdate = UpdateData<ImageInsert>
