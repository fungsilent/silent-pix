import { z } from 'zod'

import {
    cursorQuery,
    paginationLimitQuery,
    searchQuery,
    taskFlagsQuery,
} from '#shared/api/query'
import { imageListItem } from '#shared/contract/image'

/* MARK: query */

export const getImagesQuery = z.object({
    cursor: cursorQuery,
    search: searchQuery,
    taskFlags: taskFlagsQuery,
    type: z.enum(['input', 'output']).optional(),
    limit: paginationLimitQuery,
})

/* MARK: response */

export const getImagesResponse = z.object({
    items: z.array(imageListItem),
    nextCursor: z.string().optional(),
})

/* MARK: inferred types */

export type GetImagesQuery = z.output<typeof getImagesQuery>
export type GetImagesResponse = z.output<typeof getImagesResponse>
