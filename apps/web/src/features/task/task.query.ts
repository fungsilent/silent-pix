import { useInfiniteQuery } from '@tanstack/solid-query'

import { taskApi } from '#/api/task'

import type { GetTasksQuery } from '@silent-pix/shared'

const taskFeedLimit = 30

export const taskKeys = {
    all: ['tasks'] as const,
    feeds: () => [...taskKeys.all, 'feed'] as const,
    feed: (input: GetTasksQuery) => [...taskKeys.feeds(), input] as const,
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
