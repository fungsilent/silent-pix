import { z } from 'zod'

/* MARK: response */

export const imageGarbageCollectionResponse = z.object({
    orphanRowCount: z.number().int().nonnegative(),
    orphanRowFileCount: z.number().int().nonnegative(),
    strayFileCount: z.number().int().nonnegative(),
    temporaryFileCount: z.number().int().nonnegative(),
    unlinkFailureCount: z.number().int().nonnegative(),
})

/* MARK: inferred types */

export type ImageGarbageCollectionResponse = z.output<typeof imageGarbageCollectionResponse>
