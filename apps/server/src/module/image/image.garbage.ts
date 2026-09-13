import { lstat, readdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { images, taskImages } from '@silent-pix/db'
import { and, eq, lt, notExists } from 'drizzle-orm'

import { loadConfig } from '#/config'
import { unlinkContent } from '#/lib/image/image.store'
import { withImageMutation } from '#/module/image/image.mutation'
import { deleteUnreferencedRows } from '#/module/image/image.service'

import type { DatabaseClient } from '@silent-pix/db'
import type { ImageApi } from '@silent-pix/shared'

const config = loadConfig()
const defaultGraceMs = 10 * 60 * 1000
const formalImageName = /^[a-f0-9]{64}\.(?:jpg|png)$/
const temporaryImageName = /^[a-f0-9]{64}\.(?:jpg|png)\.tmp-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export type ImageGarbageCollectionOptions = {
    graceMs?: number
    now?: number
    storageRoot?: string
}

export const imageGarbageCollection = {
    collect(
        database: DatabaseClient,
        options: ImageGarbageCollectionOptions = {},
    ): Promise<ImageApi.ImageGarbageCollectionResponse> {
        return withImageMutation(async () => {
            const graceMs = options.graceMs ?? defaultGraceMs
            const cutoff = (options.now ?? Date.now()) - graceMs
            const storageRoot = options.storageRoot ?? config.appStorageDir
            const knownPaths = new Set(
                await database.db
                    .select({ path: images.path })
                    .from(images)
                    .all()
                    .then(rows => rows.map(row => row.path)),
            )

            const orphanCandidates = await database.db
                .select({ id: images.id })
                .from(images)
                .where(and(
                    lt(images.createdAt, cutoff),
                    notExists(
                        database.db
                            .select({ id: taskImages.id })
                            .from(taskImages)
                            .where(eq(taskImages.imageId, images.id)),
                    ),
                ))
                .all()

            const orphanRows = await deleteUnreferencedRows(
                database,
                orphanCandidates.map(row => row.id),
            )

            let orphanRowFileCount = 0
            let unlinkFailureCount = 0

            for (const orphan of orphanRows) {
                const result = await unlinkForImageGarbageCollection(storageRoot, orphan.path)
                if (result === 'removed') {
                    orphanRowFileCount += 1
                }
                else if (result === 'failed') {
                    unlinkFailureCount += 1
                }
            }

            const files = await sweepImageGarbageCollectionFiles(
                storageRoot,
                knownPaths,
                cutoff,
            )

            return {
                orphanRowCount: orphanRows.length,
                orphanRowFileCount,
                strayFileCount: files.strayFileCount,
                temporaryFileCount: files.temporaryFileCount,
                unlinkFailureCount: unlinkFailureCount + files.unlinkFailureCount,
            }
        })
    },
}

type ImageGarbageCollectionUnlinkResult = 'missing' | 'removed' | 'failed'

async function unlinkForImageGarbageCollection(
    storageRoot: string,
    relativePath: string,
): Promise<ImageGarbageCollectionUnlinkResult> {
    try {
        return await unlinkContent(storageRoot, relativePath) ? 'removed' : 'missing'
    }
    catch (cause) {
        console.error(`Failed to unlink image garbage-collection file ${relativePath}.`, cause)
        return 'failed'
    }
}

async function sweepImageGarbageCollectionFiles(
    storageRoot: string,
    knownPaths: Set<string>,
    cutoff: number,
): Promise<{
    strayFileCount: number
    temporaryFileCount: number
    unlinkFailureCount: number
}> {
    const imagesRoot = resolve(storageRoot, 'images')
    let entries

    try {
        entries = await readdir(imagesRoot, { withFileTypes: true })
    }
    catch (cause) {
        if (isMissingEntry(cause)) {
            return {
                strayFileCount: 0,
                temporaryFileCount: 0,
                unlinkFailureCount: 0,
            }
        }

        throw cause
    }

    let strayFileCount = 0
    let temporaryFileCount = 0
    let unlinkFailureCount = 0

    for (const entry of entries) {
        if (!entry.isFile() || entry.isSymbolicLink()) {
            continue
        }

        const relativePath = `images/${entry.name}`
        if (knownPaths.has(relativePath)) {
            continue
        }

        const kind = formalImageName.test(entry.name)
            ? 'stray'
            : temporaryImageName.test(entry.name)
                ? 'temporary'
                : undefined
        if (!kind) {
            continue
        }

        let modifiedAt: number
        try {
            modifiedAt = (await lstat(join(imagesRoot, entry.name))).mtimeMs
        }
        catch (cause) {
            if (isMissingEntry(cause)) {
                continue
            }

            console.error(`Failed to inspect image garbage-collection file ${relativePath}.`, cause)
            unlinkFailureCount += 1
            continue
        }

        if (modifiedAt >= cutoff) {
            continue
        }

        const result = await unlinkForImageGarbageCollection(storageRoot, relativePath)
        if (result === 'failed') {
            unlinkFailureCount += 1
            continue
        }
        if (result === 'missing') {
            continue
        }

        if (kind === 'stray') {
            strayFileCount += 1
        }
        else {
            temporaryFileCount += 1
        }
    }

    return {
        strayFileCount,
        temporaryFileCount,
        unlinkFailureCount,
    }
}

function isMissingEntry(cause: unknown): boolean {
    return cause instanceof Error
        && 'code' in cause
        && cause.code === 'ENOENT'
}
