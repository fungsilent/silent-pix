import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/solid-query'

import { refreshImageListCache } from '#/data/image/image.cache'
import { taskApi } from '#/data/task/task.api'
import {
    updateCreatedTaskCache,
    updateRenamedTaskCache,
    updateTaskFlagsCache,
} from '#/data/task/task.cache'
import { applyTasksRemoved } from '#/data/task/task.event'
import { taskKeys } from '#/data/task/task.key'

import type { TaskApi } from '@silent-pix/shared'
import type { InfiniteData } from '@tanstack/solid-query'
import type { Accessor } from 'solid-js'

export const samplerKeys = {
    all: ['samplers'] as const,
    list: () => [...samplerKeys.all, 'list'] as const,
}

export const loraKeys = {
    all: ['loras'] as const,
    list: () => [...loraKeys.all, 'list'] as const,
}

export type TaskFeedFilter = {
    search: string
    taskFlags: TaskApi.TaskFilterFlag[] | undefined
}

function taskFeedRequest(filter: TaskFeedFilter): Omit<TaskApi.GetTasksQuery, 'cursor'> {
    const search = filter.search.trim()

    return {
        limit: 30,
        ...(filter.taskFlags ? { taskFlags: filter.taskFlags } : {}),
        ...(search ? { search } : {}),
    }
}

export function useTaskFeedQuery(filter: Accessor<TaskFeedFilter>) {
    return useInfiniteQuery(() => {
        const request = taskFeedRequest(filter())

        return {
            queryKey: taskKeys.feed(request),
            initialPageParam: undefined as string | undefined,
            queryFn: ({ pageParam, signal }) => taskApi.list(
                pageParam === undefined ? request : { ...request, cursor: pageParam },
                signal,
            ),
            getNextPageParam: lastPage => lastPage.nextCursor,
        }
    })
}

export function useTaskFeedFirstId(filter: Accessor<TaskFeedFilter>) {
    const queryClient = useQueryClient()

    return () => queryClient
        .getQueryData<InfiniteData<TaskApi.GetTasksResponse, string | undefined>>(taskKeys.feed(taskFeedRequest(filter())))
        ?.pages.find(page => page.items.length > 0)?.items[0]?.id
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

export function useSamplerListQuery() {
    return useQuery(() => ({
        queryKey: samplerKeys.list(),
        queryFn: () => taskApi.listSamplers(),
    }))
}

export function useLoraListQuery(enabled: Accessor<boolean>) {
    return useQuery(() => ({
        queryKey: loraKeys.list(),
        enabled: enabled(),
        queryFn: () => taskApi.listLoras(),
    }))
}

export function useCreateTaskMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationKey: taskKeys.create(),
        mutationFn: (request: TaskApi.CreateTaskRequest) => taskApi.create(request),
        onSuccess: task => {
            updateCreatedTaskCache(queryClient, task)
            refreshImageListCache(queryClient)
        },
    }))
}

export function useRenameTaskMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: (
            request: TaskApi.RenameTaskParams & TaskApi.RenameTaskRequest,
        ) => taskApi.rename(request),
        onSuccess: task => {
            updateRenamedTaskCache(queryClient, task)
            refreshImageListCache(queryClient)
        },
    }))
}

export function useTaskFlagMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: (request: TaskApi.UpdateTaskFlagsRequest) => taskApi.setFlags(request),
        onSuccess: result => {
            updateTaskFlagsCache(queryClient, result.tasks)
            refreshImageListCache(queryClient)
        },
    }))
}

export function useDeleteSelectedTasksMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: (request: Extract<TaskApi.DeleteTasksRequest, { scope: 'selected' }>) => (
            taskApi.removeTasks(request)
        ),
        onSuccess: result => {
            applyTasksRemoved(queryClient, result.ids)
        },
    }))
}

export function useDeleteDiscardedTasksMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: () => taskApi.removeTasks({ scope: 'discard' }),
        onSuccess: result => {
            applyTasksRemoved(queryClient, result.ids)
        },
    }))
}

export function useDeleteTaskMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: (request: TaskApi.DeleteTaskRequest) => taskApi.removeTask(request),
        onSuccess: result => {
            applyTasksRemoved(queryClient, [result.id])
        },
    }))
}
