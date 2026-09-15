import { z } from 'zod'

/* MARK: primitives */

export const imageMimeValues = ['image/png', 'image/jpeg'] as const
export const imageMime = z.enum(imageMimeValues)

/* MARK: resources */

/* NOTE: 圖片內容本身。id 是對外的公開把手，url 指向 GET /api/image/:imageId。 */
export const imageResource = z.object({
    id: z.uuid(),
    url: z.string(),
    mime: imageMime,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    sizeBytes: z.number().int().positive(),
    createdAt: z.iso.datetime(),
})

export const imageUsage = z.object({
    taskId: z.uuid(),
    taskName: z.string().nullable(),
    type: z.enum(['input', 'output']),
    sortIndex: z.number().int().nonnegative(),
})

export const imageListItem = z.object({
    image: imageResource,
    origin: imageUsage.nullable(),
})

/* MARK: inferred types */

export type ImageMime = z.output<typeof imageMime>
export type ImageResource = z.output<typeof imageResource>
export type ImageUsage = z.output<typeof imageUsage>
export type ImageListItem = z.output<typeof imageListItem>
