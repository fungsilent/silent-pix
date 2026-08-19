import { z } from 'zod'

export const imageMime = z.enum(['image/png', 'image/jpeg'])

export type ImageMime = z.output<typeof imageMime>

/* 圖片內容本身。id 是對外的公開把手，url 指向 GET /api/image/:imageId */
export const imageResource = z.object({
    id: z.uuid(),
    url: z.string(),
    mime: imageMime,
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    sizeBytes: z.number().int().positive(),
    createdAt: z.iso.datetime(),
})

export type ImageResource = z.output<typeof imageResource>

export const imageUsage = z.object({
    taskId: z.uuid(),
    taskName: z.string().nullable(),
    type: z.enum(['input', 'output']),
    sortIndex: z.number().int().nonnegative(),
})

export type ImageUsage = z.output<typeof imageUsage>

export const imageListItem = z.object({
    image: imageResource,
    origin: imageUsage.nullable(),
})

export type ImageListItem = z.output<typeof imageListItem>

export const getImagesQuery = z.object({
    cursor: z.string().max(512).optional(),
    search: z.string().trim().max(200).optional(),
    limit: z.union([
        z.number(),
        z.string().regex(/^[0-9]+$/).transform(Number),
    ]).pipe(z.number().int().min(1).max(100)).default(30),
})

export type GetImagesQuery = z.output<typeof getImagesQuery>

export const getImagesResponse = z.object({
    items: z.array(imageListItem),
    nextCursor: z.string().optional(),
})

export type GetImagesResponse = z.output<typeof getImagesResponse>

export const getImageRequest = z.object({
    imageId: z.uuid(),
})

export type GetImageRequest = z.output<typeof getImageRequest>
