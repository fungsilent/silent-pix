import { useInfiniteQuery, useQuery } from '@tanstack/solid-query'

import { taskApi } from '#/api/task'

import type { TaskApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

const taskFeedLimit = 30

export const taskKeys = {
    all: ['tasks'] as const,
    feeds: () => [...taskKeys.all, 'feed'] as const,
    feed: (input: TaskApi.GetTasksQuery) => [...taskKeys.feeds(), input] as const,
    details: () => [...taskKeys.all, 'detail'] as const,
    detail: (request: TaskApi.GetTaskRequest) => [...taskKeys.details(), request] as const,
}

export function useTaskFeedQuery() {
    return useInfiniteQuery(() => ({
        queryKey: taskKeys.feed({ limit: taskFeedLimit }),
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) => taskApi.list({
            cursor: pageParam,
            limit: taskFeedLimit,
        }),
        getNextPageParam: lastPage => lastPage.nextCursor,
    }))
}

export function useTaskDetailQuery(taskId: Accessor<string | undefined>) {
    return useQuery(() => {
        const id = taskId()
        const request: TaskApi.GetTaskRequest | undefined = id
            ? { taskId: id }
            : undefined

        return {
            queryKey: request
                ? taskKeys.detail(request)
                : taskKeys.details(),
            enabled: Boolean(request),
            queryFn: async () => {
                if (!request) {
                    throw new Error('Task detail query requires a task ID.')
                }

                return taskApi.detail(request)
            },
        }
    })
}