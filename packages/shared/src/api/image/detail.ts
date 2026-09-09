import { z } from 'zod'

/* MARK: params */

export const getImageRequest = z.object({
    imageId: z.uuid(),
})
