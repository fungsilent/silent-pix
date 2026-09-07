import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/solid-query'

import { taskApi } from '#/api/task'
import { cacheCreatedTaskResponse, cacheTaskRenamed } from '#/features/task/task.cache'
import { applyTasksRemoved } from '#/features/task/task.event'
import { taskKeys } from '#/features/task/task.key'

import type { TaskApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

const taskFeedLimit = 30

export const samplerKeys = {
    all: ['samplers'] as const,
    list: () => [...samplerKeys.all, 'list'] as const,
}

export const loraKeys = {
    all: ['loras'] as const,
    list: () => [...loraKeys.all, 'list'] as const,
}

export function useTaskFeedQuery() {
    return useInfiniteQuery(() => ({
        queryKey: taskKeys.feed({ limit: taskFeedLimit, view: 'all' }),
        initialPageParam: undefined as string | undefined,
        queryFn: ({ pageParam }) => taskApi.list({
            cursor: pageParam,
            limit: taskFeedLimit,
            view: 'all',
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
            cacheCreatedTaskResponse(queryClient, task)
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
            cacheTaskRenamed(queryClient, task)
        },
    }))
}

export function useDeleteTaskMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: (request: TaskApi.DeleteTaskRequest) => taskApi.remove(request),
        onSuccess: result => {
            applyTasksRemoved(queryClient, [result.id])
        },
    }))
}
