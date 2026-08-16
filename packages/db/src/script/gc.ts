import { readdir, unlink } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { and, eq, inArray, isNull, lt } from 'drizzle-orm'

import { createDatabaseClient } from '#/client'
import { loadConfig } from '#/config'
import { images, taskImages } from '#/schema/schema.export'

/*
 * 正常流程刪 task 時就會順手清掉零引用的圖，所以這支只處理「流程斷在中間」的殘留：
 *   A. DB commit 成功但 unlink 失敗 → 有檔案、沒有列
 *   B. 寫完檔案與 images 列後 process 掛掉 → 有列、沒有任何 task_images 指著它
 * 反過來的「有列沒檔案」不會發生，因為規則是檔案先落地、DB 後 commit。
 */

/*
 * 這個設計沒有「上傳了但還沒送出」的合法零引用狀態（上傳併在 Generate 那一次請求裡），
 * 所以零引用一律等於垃圾。緩衝期只是併發保險：避免掃到某個請求
 * 已插入 images 列、還沒插入關聯的那一瞬間。
 */
const graceMs = 10 * 60 * 1000

const config = loadConfig()
const imagesRoot = resolve(config.appStorageDir, 'images')
const database = await createDatabaseClient(config.databasePath)

try {
    const orphanRowCount = await sweepOrphanRows()
    const orphanFileCount = await sweepOrphanFiles()

    console.log(`Removed ${orphanRowCount} unreferenced image row(s) and ${orphanFileCount} stray file(s).`)
} finally {
    database.close()
}

/* Pass 1：沒有任何 task_images 引用、且過了緩衝期的 images 列 */
async function sweepOrphanRows(): Promise<number> {
    const cutoff = Date.now() - graceMs

    const orphans = await database.db
        .select({ id: images.id, path: images.path })
        .from(images)
        .leftJoin(taskImages, eq(taskImages.imageId, images.id))
        .where(and(isNull(taskImages.id), lt(images.createdAt, cutoff)))
        .all()

    if (orphans.length === 0) {
        return 0
    }

    await database.db
        .delete(images)
        .where(inArray(images.id, orphans.map(orphan => orphan.id)))
        .run()

    /* DB 先 commit、檔案後刪：反過來一旦失敗就會留下指向不存在檔案的有效列 */
    for (const orphan of orphans) {
        await unlinkQuietly(resolve(config.appStorageDir, orphan.path))
    }

    return orphans.length
}

/* Pass 2：磁碟上沒有對應 images 列的檔案 */
async function sweepOrphanFiles(): Promise<number> {
    const buckets = await readdirQuietly(imagesRoot)
    if (buckets === undefined) {
        return 0
    }

    const knownPaths = new Set(
        await database.db.select({ path: images.path }).from(images).all()
            .then(rows => rows.map(row => row.path)),
    )

    let removed = 0

    for (const bucket of buckets) {
        if (!bucket.isDirectory()) {
            continue
        }

        const entries = await readdirQuietly(join(imagesRoot, bucket.name)) ?? []

        for (const entry of entries) {
            if (!entry.isFile()) {
                continue
            }

            /* images.path 一律是 posix 相對路徑，比對時不能用 platform 的 separator */
            if (knownPaths.has(`images/${bucket.name}/${entry.name}`)) {
                continue
            }

            await unlinkQuietly(join(imagesRoot, bucket.name, entry.name))
            removed += 1
        }
    }

    return removed
}

async function readdirQuietly(directory: string) {
    try {
        return await readdir(directory, { withFileTypes: true })
    } catch (cause) {
        if (isMissingEntry(cause)) {
            return undefined
        }
        throw cause
    }
}

/* 刪不掉就留給下一次執行，不要讓整趟 sweep 因為單一檔案中止 */
async function unlinkQuietly(filePath: string): Promise<void> {
    try {
        await unlink(filePath)
    } catch (cause) {
        if (isMissingEntry(cause)) {
            return
        }
        console.error(`Failed to unlink ${filePath}:`, cause)
    }
}

function isMissingEntry(cause: unknown): boolean {
    return cause instanceof Error && 'code' in cause && cause.code === 'ENOENT'
}
