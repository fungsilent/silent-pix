import { images, taskImages, tasks } from '@silent-pix/db'
import { and, desc, eq, inArray, isNull, like, or, sql } from 'drizzle-orm'

import { loadConfig } from '#/config'
import { hashBytes } from '#/lib/image/image.hash'
import { readImageMeta } from '#/lib/image/image.meta'
import { contentExists, contentPath, unlinkContent, writeContent } from '#/lib/image/image.store'
import { done, fail } from '#/lib/service-result'
import { toImageResource, toImageUsageType } from '#/module/image/image.model'

import type { DatabaseClient, ImageSelect, UUID } from '@silent-pix/db'
import type { ImageApi } from '@silent-pix/shared'

const config = loadConfig()

type ImageCursor = { createdAt: number, id: string }

export const imageService = {
    /*
     * 內容定址的寫入。相同位元組只會有一列一檔，所以這裡對「同一張圖被上傳兩次」
     * 與「模型重複生出同一張圖」是同一條路徑，不需要特別處理。
     */
    async ingest(database: DatabaseClient, bytes: Uint8Array) {
        if (bytes.byteLength === 0) {
            return fail('IMAGE_EMPTY')
        }

        const hash = hashBytes(bytes)
        const existing = await database.db
            .select()
            .from(images)
            .where(eq(images.hash, hash))
            .get()

        if (existing) {
            /* 列在但檔案不見了（unlink 成功、commit 失敗之類）就補寫回去 */
            if (!await contentExists(config.appStorageDir, existing.path)) {
                await writeContent(config.appStorageDir, existing.path, bytes)
            }

            return done({ image: existing, created: false })
        }

        const meta = readImageMeta(bytes)
        if (!meta) {
            return fail('IMAGE_UNSUPPORTED_TYPE')
        }

        const path = contentPath(hash, meta.mime)
        await writeContent(config.appStorageDir, path, bytes)

        const [inserted] = await database.db
            .insert(images)
            .values({
                hash,
                path,
                mime: meta.mime,
                width: meta.width,
                height: meta.height,
                sizeBytes: bytes.byteLength,
                createdAt: Date.now(),
            })
            .onConflictDoNothing({ target: images.hash })
            .returning()

        if (inserted) {
            return done({ image: inserted, created: true })
        }

        /* 併發輸家：贏家寫的是同一份位元組，讀它的列就好，檔案不必也不能刪 */
        const winner = await database.db
            .select()
            .from(images)
            .where(eq(images.hash, hash))
            .get()

        return winner
            ? done({ image: winner, created: false })
            : fail('IMAGE_STORE_FAILED')
    },

    findImage(database: DatabaseClient, imageId: UUID): Promise<ImageSelect | undefined> {
        return database.db
            .select()
            .from(images)
            .where(eq(images.id, imageId))
            .get()
    },

    /*
     * picker 的清單。一列是一次引用而不是一張圖，所以同一張圖被多個 task 用就會
     * 出現多次——那正是「依 task 名稱搜尋」要的行為。
     */
    async listReferences(database: DatabaseClient, query: ImageApi.GetImagesQuery) {
        const cursor = query.cursor === undefined ? undefined : decodeCursor(query.cursor)
        if (query.cursor !== undefined && !cursor) {
            return fail('INVALID_IMAGE_CURSOR')
        }

        const search = query.search?.trim()

        const rows = await database.db
            .select({
                referenceId: taskImages.id,
                taskId: taskImages.taskId,
                taskName: tasks.name,
                type: taskImages.type,
                sortIndex: taskImages.sortIndex,
                /* cursor 走的是「引用」的時間，不是圖片內容的建立時間 */
                usedAt: taskImages.createdAt,
                image: images,
            })
            .from(taskImages)
            .innerJoin(images, eq(images.id, taskImages.imageId))
            .innerJoin(tasks, eq(tasks.id, taskImages.taskId))
            .where(and(
                inArray(taskImages.type, ['input', 'output']),
                /*
                 * keyset seek：一次 batch 的 output 是在同一個 transaction 插入的，
                 * createdAt 完全相同，所以一定要用 id 當第二個比較欄位補成全序，
                 * 否則分頁邊界會漏掉或重複整批圖。
                 */
                cursor
                    ? sql`(${taskImages.createdAt}, ${taskImages.id}) < (${cursor.createdAt}, ${cursor.id})`
                    : undefined,
                search
                    ? or(like(tasks.name, `%${search}%`), like(tasks.id, `%${search}%`))
                    : undefined,
            ))
            .orderBy(desc(taskImages.createdAt), desc(taskImages.id))
            /* 多撈一筆就知道還有沒有下一頁，不必另外 count */
            .limit(query.limit + 1)
            .all()

        const hasMore = rows.length > query.limit
        const page = hasMore ? rows.slice(0, query.limit) : rows

        const items = page.flatMap(row => {
            const type = toImageUsageType(row.type)
            if (!type) {
                return []
            }

            return [{
                usage: {
                    referenceId: row.referenceId,
                    taskId: row.taskId,
                    taskName: row.taskName,
                    type,
                    sortIndex: row.sortIndex,
                },
                image: toImageResource(row.image),
            }]
        })

        const last = page.at(-1)

        return done({
            items,
            ...(hasMore && last
                ? { nextCursor: encodeCursor({ createdAt: last.usedAt, id: last.referenceId }) }
                : {}),
        })
    },

    /* 找出這張圖是哪個 task 生成的 */
    async findOrigin(
        database: DatabaseClient,
        imageId: UUID,
    ): Promise<ImageApi.ImageUsage | undefined> {
        const row = await database.db
            .select({
                referenceId: taskImages.id,
                taskId: taskImages.taskId,
                taskName: tasks.name,
                type: taskImages.type,
                sortIndex: taskImages.sortIndex,
            })
            .from(taskImages)
            .innerJoin(tasks, eq(tasks.id, taskImages.taskId))
            .where(and(
                eq(taskImages.imageId, imageId),
                eq(taskImages.type, 'output'),
            ))
            .orderBy(taskImages.createdAt, taskImages.id)
            .get()

        if (!row) {
            return undefined
        }

        const type = toImageUsageType(row.type)

        return type ? { ...row, type } : undefined
    },

    /*
     * 只刪掉「已經沒有任何 task_images 指著」的那些。呼叫端要在 DB 交易 commit 之後
     * 才呼叫，順序反過來一旦失敗就會留下指向不存在檔案的有效列。
     */
    async deleteUnreferenced(database: DatabaseClient, imageIds: UUID[]): Promise<number> {
        if (imageIds.length === 0) {
            return 0
        }

        const orphans = await database.db
            .select({ id: images.id, path: images.path })
            .from(images)
            .leftJoin(taskImages, eq(taskImages.imageId, images.id))
            .where(and(inArray(images.id, imageIds), isNull(taskImages.id)))
            .all()

        if (orphans.length === 0) {
            return 0
        }

        await database.db
            .delete(images)
            .where(inArray(images.id, orphans.map(orphan => orphan.id)))
            .run()

        for (const orphan of orphans) {
            await unlinkContent(config.appStorageDir, orphan.path)
        }

        return orphans.length
    },
}

function isImageCursor(value: unknown): value is ImageCursor {
    if (!value || typeof value !== 'object') {
        return false
    }

    const cursor = value as Record<string, unknown>

    return Number.isInteger(cursor.createdAt) && typeof cursor.id === 'string'
}

function encodeCursor(cursor: ImageCursor): string {
    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

function decodeCursor(value: string): ImageCursor | undefined {
    try {
        const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown
        return isImageCursor(parsed) ? parsed : undefined
    }
    catch {
        return undefined
    }
}
