import { createHash } from 'node:crypto'

import { images, isUUID, taskImages, tasks } from '@silent-pix/db'
import { and, asc, desc, eq, gt, inArray, like, lt, ne, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'

import { readImageMeta } from '#/lib/image/image.meta'
import { contentExists, contentPath, writeContent } from '#/lib/image/image.store'
import { done, fail } from '#/lib/service-result'
import { toImageResource, toImageUsageType } from '#/module/image/image.model'

import type { Database, ImageSelect, UUID } from '@silent-pix/db'
import type { ImageApi } from '@silent-pix/shared'

type ImageCursor = { usedAt: number, sortIndex: number, id: UUID }

/* mask / control 還沒有 UI，對外只承認這兩種 */
const displayTypes = ['input', 'output'] as const

export const imageService = {
    /*
     * 內容定址的寫入。相同位元組只會有一列一檔，所以這裡對「同一張圖被上傳兩次」
     * 與「模型重複生出同一張圖」是同一條路徑，不需要特別處理。
     *
     * 呼叫端必須持有 image mutation lock，並把 ingest 與建立 task_images reference
     * 放在同一個 lock ownership 內。
     */
    async ingest(database: Database, bytes: Uint8Array) {
        if (bytes.byteLength === 0) {
            return fail('IMAGE_EMPTY')
        }

        const hash = createHash('sha256').update(bytes).digest('hex')
        const existing = await database
            .select()
            .from(images)
            .where(eq(images.hash, hash))
            .get()

        if (existing) {
            /* 列在但檔案不見了（unlink 成功、commit 失敗之類）就補寫回去 */
            if (!await contentExists(existing.path)) {
                await writeContent(existing.path, bytes)
            }

            return done({ image: existing, created: false })
        }

        const meta = readImageMeta(bytes)
        if (!meta) {
            return fail('IMAGE_UNSUPPORTED_TYPE')
        }

        const path = contentPath(hash, meta.mime)
        await writeContent(path, bytes)

        const [inserted] = await database
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
        const winner = await database
            .select()
            .from(images)
            .where(eq(images.hash, hash))
            .get()

        return winner
            ? done({ image: winner, created: false })
            : fail('IMAGE_STORE_FAILED')
    },

    findImage(database: Database, imageId: UUID): Promise<ImageSelect | undefined> {
        return database
            .select()
            .from(images)
            .where(eq(images.id, imageId))
            .get()
    },

    /* picker 的清單：一格一張圖。同一張圖被多個 task 用只出現一次，取最早那一次引用。 */
    async listImages(database: Database, query: ImageApi.GetImagesQuery) {
        const cursor = query.cursor === undefined ? undefined : decodeCursor(query.cursor)
        if (query.cursor !== undefined && !cursor) {
            return fail('INVALID_IMAGE_CURSOR')
        }

        const search = query.search?.trim()
        const earliest = alias(taskImages, 'earliest')
        const candidateUsage = alias(taskImages, 'candidateUsage')
        const candidateTask = alias(tasks, 'candidateTask')
        const matchingUsage = alias(taskImages, 'matchingUsage')
        const matchingTask = alias(tasks, 'matchingTask')

        const rows = await database
            .select({
                taskId: taskImages.taskId,
                taskName: tasks.name,
                type: taskImages.type,
                sortIndex: taskImages.sortIndex,
                matchTaskId: matchingUsage.taskId,
                matchTaskName: matchingTask.name,
                matchType: matchingUsage.type,
                matchSortIndex: matchingUsage.sortIndex,
                matchPin: matchingTask.pin,
                matchDiscard: matchingTask.discard,
                usedAt: taskImages.createdAt,
                referenceId: taskImages.id,
                image: images,
            })
            .from(taskImages)
            .innerJoin(images, eq(images.id, taskImages.imageId))
            .innerJoin(tasks, eq(tasks.id, taskImages.taskId))
            /* 一張圖只取最早的符合引用，讓搜尋、type 與旗標對應同一個 task。 */
            .innerJoin(matchingUsage, eq(matchingUsage.id, database
                .select({ id: candidateUsage.id })
                .from(candidateUsage)
                .innerJoin(candidateTask, eq(candidateTask.id, candidateUsage.taskId))
                .where(and(
                    eq(candidateUsage.imageId, taskImages.imageId),
                    query.type
                        ? eq(candidateUsage.type, query.type)
                        : inArray(candidateUsage.type, displayTypes),
                    query.taskFlags ? eq(candidateUsage.type, 'output') : undefined,
                    query.taskFlags
                        ? or(
                            query.taskFlags.includes('unflag')
                                ? and(eq(candidateTask.pin, false), eq(candidateTask.discard, false))
                                : undefined,
                            query.taskFlags.includes('pin') ? eq(candidateTask.pin, true) : undefined,
                            query.taskFlags.includes('discard') ? eq(candidateTask.discard, true) : undefined,
                        )
                        : undefined,
                    search
                        ? or(
                            like(candidateTask.name, `%${search}%`),
                            like(candidateTask.id, `%${search}%`),
                        )
                        : undefined,
                ))
                .orderBy(asc(candidateUsage.createdAt), asc(candidateUsage.id))
                .limit(1)))
            .innerJoin(matchingTask, eq(matchingTask.id, matchingUsage.taskId))
            .where(and(
                inArray(taskImages.type, displayTypes),
                /* 只留每張圖最早的那一次引用，這就是「一格一張圖」的實作 */
                eq(taskImages.id, database
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
                            lt(taskImages.id, cursor.id),
                        ),
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
                const originType = toImageUsageType(row.type)
                const matchType = toImageUsageType(row.matchType)
                const flag: ImageApi.ImageListItem['matchedUsage']['flag'] = matchType === 'output'
                    ? row.matchPin ? 'pin' : row.matchDiscard ? 'discard' : null
                    : null

                return originType && matchType
                    ? [{
                        image: toImageResource(row.image),
                        origin: {
                            taskId: row.taskId,
                            taskName: row.taskName,
                            type: originType,
                            sortIndex: row.sortIndex,
                        },
                        matchedUsage: {
                            taskId: row.matchTaskId,
                            taskName: row.matchTaskName,
                            type: matchType,
                            sortIndex: row.matchSortIndex,
                            flag,
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
        database: Database,
        imageId: UUID,
        excludeTaskId?: UUID,
    ): Promise<ImageApi.ImageUsage | undefined> {
        const row = await database
            .select({
                taskId: taskImages.taskId,
                taskName: tasks.name,
                type: taskImages.type,
                sortIndex: taskImages.sortIndex,
            })
            .from(taskImages)
            .innerJoin(tasks, eq(tasks.id, taskImages.taskId))
            .where(and(
                eq(taskImages.imageId, imageId),
                inArray(taskImages.type, displayTypes),
                excludeTaskId ? ne(taskImages.taskId, excludeTaskId) : undefined,
            ))
            .orderBy(asc(taskImages.createdAt), asc(taskImages.id))
            .limit(1)
            .get()

        if (!row) {
            return undefined
        }

        const type = toImageUsageType(row.type)

        return type
            ? {
                taskId: row.taskId,
                taskName: row.taskName,
                type,
                sortIndex: row.sortIndex,
            }
            : undefined
    },

}

function isImageCursor(value: unknown): value is ImageCursor {
    if (!value || typeof value !== 'object') {
        return false
    }

    const cursor = value as Record<string, unknown>

    return Number.isInteger(cursor.usedAt)
        && Number.isInteger(cursor.sortIndex)
        && typeof cursor.id === 'string'
        && isUUID(cursor.id)
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
