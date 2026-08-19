import { images, taskImages, tasks } from '@silent-pix/db'
import { and, asc, desc, eq, exists, gt, inArray, isNull, like, lt, ne, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'

import { loadConfig } from '#/config'
import { hashBytes } from '#/lib/image/image.hash'
import { readImageMeta } from '#/lib/image/image.meta'
import { contentExists, contentPath, unlinkContent, writeContent } from '#/lib/image/image.store'
import { done, fail } from '#/lib/service-result'
import { toImageResource, toImageUsageType } from '#/module/image/image.model'

import type { DatabaseClient, ImageSelect, UUID } from '@silent-pix/db'
import type { ImageApi } from '@silent-pix/shared'

const config = loadConfig()

type ImageCursor = { usedAt: number, sortIndex: number, id: string }

/* mask / control 還沒有 UI，對外只承認這兩種 */
const displayTypes = ['input', 'output'] as const

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

    /* picker 的清單：一格一張圖。同一張圖被多個 task 用只出現一次，取最早那一次引用。 */
    async listImages(database: DatabaseClient, query: ImageApi.GetImagesQuery) {
        const cursor = query.cursor === undefined ? undefined : decodeCursor(query.cursor)
        if (query.cursor !== undefined && !cursor) {
            return fail('INVALID_IMAGE_CURSOR')
        }

        const search = query.search?.trim()
        const earliest = alias(taskImages, 'earliest')
        const searched = alias(taskImages, 'searched')
        const searchedTask = alias(tasks, 'searchedTask')

        const rows = await database.db
            .select({
                taskId: taskImages.taskId,
                taskName: tasks.name,
                type: taskImages.type,
                sortIndex: taskImages.sortIndex,
                usedAt: taskImages.createdAt,
                referenceId: taskImages.id,
                image: images,
            })
            .from(taskImages)
            .innerJoin(images, eq(images.id, taskImages.imageId))
            .innerJoin(tasks, eq(tasks.id, taskImages.taskId))
            .where(and(
                inArray(taskImages.type, displayTypes),
                /* 只留每張圖最早的那一次引用，這就是「一格一張圖」的實作 */
                eq(taskImages.id, database.db
                    .select({ id: earliest.id })
                    .from(earliest)
                    .where(and(
                        eq(earliest.imageId, taskImages.imageId),
                        inArray(earliest.type, displayTypes),
                    ))
                    .orderBy(asc(earliest.createdAt), asc(earliest.id))
                    .limit(1)),
                /*
                 * 排序是混合方向（時間新的在前、批次內序號小的在前），row value
                 * 比較只支援同方向，所以要展開成三段。
                 */
                cursor
                    ? or(
                        lt(taskImages.createdAt, cursor.usedAt),
                        and(
                            eq(taskImages.createdAt, cursor.usedAt),
                            gt(taskImages.sortIndex, cursor.sortIndex),
                        ),
                        and(
                            eq(taskImages.createdAt, cursor.usedAt),
                            eq(taskImages.sortIndex, cursor.sortIndex),
                            sql`${taskImages.id} < ${cursor.id}`,
                        ),
                    )
                    : undefined,
                /* 圖片本身沒有名字，所以搜尋是搜「用過它的 task」，不限最早那一次 */
                search
                    ? exists(
                        database.db
                            .select({ one: sql`1` })
                            .from(searched)
                            .innerJoin(searchedTask, eq(searchedTask.id, searched.taskId))
                            .where(and(
                                eq(searched.imageId, taskImages.imageId),
                                or(
                                    like(searchedTask.name, `%${search}%`),
                                    like(searchedTask.id, `%${search}%`),
                                ),
                            )),
                    )
                    : undefined,
            ))
            .orderBy(desc(taskImages.createdAt), asc(taskImages.sortIndex), desc(taskImages.id))
            /* 多撈一筆就知道還有沒有下一頁，不必另外 count */
            .limit(query.limit + 1)
            .all()

        const hasMore = rows.length > query.limit
        const page = hasMore ? rows.slice(0, query.limit) : rows
        const last = page.at(-1)

        return done({
            items: page.flatMap(row => {
                const type = toImageUsageType(row.type)

                return type
                    ? [{
                        image: toImageResource(row.image),
                        origin: {
                            taskId: row.taskId,
                            taskName: row.taskName,
                            type,
                            sortIndex: row.sortIndex,
                        },
                    }]
                    : []
            }),
            ...(hasMore && last
                ? {
                    nextCursor: encodeCursor({
                        usedAt: last.usedAt,
                        sortIndex: last.sortIndex,
                        id: last.referenceId,
                    }),
                }
                : {}),
        })
    },

    /*
     * 這張圖最早被誰用過。excludeTaskId 是呼叫端自己——一張剛上傳的圖只有
     * 自己這一次引用，那不構成出處，回 undefined 讓 UI 不畫來源按鈕。
     */
    async findOrigin(
        database: DatabaseClient,
        imageId: UUID,
        excludeTaskId?: UUID,
    ): Promise<ImageApi.ImageUsage | undefined> {
        const rows = await selectOrigins(database, [imageId], excludeTaskId)

        return rows[0]?.usage
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

async function selectOrigins(
    database: DatabaseClient,
    imageIds: UUID[],
    excludeTaskId?: UUID,
) {
    const rows = await database.db
        .select({
            imageId: taskImages.imageId,
            taskId: taskImages.taskId,
            taskName: tasks.name,
            type: taskImages.type,
            sortIndex: taskImages.sortIndex,
        })
        .from(taskImages)
        .innerJoin(tasks, eq(tasks.id, taskImages.taskId))
        .where(and(
            inArray(taskImages.imageId, imageIds),
            excludeTaskId ? ne(taskImages.taskId, excludeTaskId) : undefined,
        ))
        .orderBy(asc(taskImages.createdAt), asc(taskImages.id))
        .all()

    return rows.flatMap(row => {
        const type = toImageUsageType(row.type)

        return type
            ? [{
                imageId: row.imageId,
                usage: {
                    taskId: row.taskId,
                    taskName: row.taskName,
                    type,
                    sortIndex: row.sortIndex,
                },
            }]
            : []
    })
}

function isImageCursor(value: unknown): value is ImageCursor {
    if (!value || typeof value !== 'object') {
        return false
    }

    const cursor = value as Record<string, unknown>

    return Number.isInteger(cursor.usedAt)
        && Number.isInteger(cursor.sortIndex)
        && typeof cursor.id === 'string'
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
