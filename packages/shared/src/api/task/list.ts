import { z } from 'zod'

import {
    cursorQuery,
    paginationLimitQuery,
    searchQuery,
    taskFlagsQuery,
} from '#shared/api/query'
import { taskListItem } from '#shared/contract/task'

/* MARK: query */

export const getTasksQuery = z.object({
    cursor: cursorQuery,
    search: searchQuery,
    taskFlags: taskFlagsQuery,
    limit: paginationLimitQuery,
})

/* MARK: response */

export const getTasksResponse = z.object({
    items: z.array(taskListItem),
    nextCursor: z.string().optional(),
})

/* MARK: inferred types */

export type GetTasksQuery = z.output<typeof getTasksQuery>
export type GetTasksResponse = z.output<typeof getTasksResponse>
