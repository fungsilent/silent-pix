import { z } from 'zod'

import {
    cursorQuery,
    paginationLimitQuery,
    searchQuery,
    taskFlagsQuery,
} from '#shared/api/query'
import { imageResource, imageUsage } from '#shared/contract/image'
import { taskFlag } from '#shared/contract/task'

/* MARK: query */

export const getImagesQuery = z.object({
    cursor: cursorQuery,
    search: searchQuery,
    taskFlags: taskFlagsQuery,
    type: z.enum(['input', 'output']).optional(),
    limit: paginationLimitQuery,
})

/* MARK: response */

/* NOTE: origin 是最早引用；matchedUsage 是依目前搜尋與篩選選出的引用，旗標只屬於 output。 */
const imageListItem = z.object({
    image: imageResource,
    origin: imageUsage,
    matchedUsage: imageUsage.extend({ flag: taskFlag.nullable() }),
})

export const getImagesResponse = z.object({
    items: z.array(imageListItem),
    nextCursor: z.string().optional(),
})

/* MARK: inferred types */

export type GetImagesQuery = z.output<typeof getImagesQuery>
export type ImageListItem = z.output<typeof imageListItem>
export type GetImagesResponse = z.output<typeof getImagesResponse>
