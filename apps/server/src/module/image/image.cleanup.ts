import { images, taskImages } from '@silent-pix/db'
import { and, eq, inArray, notExists } from 'drizzle-orm'

import { unlinkContent } from '#/lib/image/image.store'

import type { Database, UUID } from '@silent-pix/db'

type RemovedImageContent = {
    id: UUID
    path: string
    unlink: 'removed' | 'missing' | 'failed'
}

export const imageCleanup = {
    /* Caller owns withImageMutation; every unlink target comes from DELETE RETURNING. */
    async removeUnreferenced(
        database: Database,
        imageIds: UUID[],
    ): Promise<RemovedImageContent[]> {
        const removed: RemovedImageContent[] = []

        for (const chunk of chunkArray([...new Set(imageIds)], 500)) {
            const rows = await database
                .delete(images)
                .where(and(
                    inArray(images.id, chunk),
                    notExists(
                        database
                            .select({ id: taskImages.id })
                            .from(taskImages)
                            .where(eq(taskImages.imageId, images.id)),
                    ),
                ))
                .returning({ id: images.id, path: images.path })

            /* DELETE commits before filesystem unlink; failure leaves recoverable stray content. */
            for (const row of rows) {
                try {
                    const unlinked = await unlinkContent(row.path)
                    removed.push({
                        ...row,
                        unlink: unlinked ? 'removed' : 'missing',
                    })
                }
                catch (cause) {
                    console.error(`Failed to unlink unreferenced image ${row.path}.`, cause)
                    removed.push({ ...row, unlink: 'failed' })
                }
            }
        }

        return removed
    },
}

function chunkArray<T>(values: T[], size: number): T[][] {
    const chunks: T[][] = []

    for (let index = 0; index < values.length; index += size) {
        chunks.push(values.slice(index, index + size))
    }

    return chunks
}
