import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/solid-query'

import { taskApi } from '#/api/task'
import { invalidateImageLists } from '#/features/image/image.cache'
import {
    cacheCreatedTaskResponse,
    cacheTaskFlagsPatched,
    cacheTaskRenamed,
} from '#/features/task/task.cache'
import { applyTasksRemoved } from '#/features/task/task.event'
import { taskKeys } from '#/features/task/task.key'
import { compareStore } from '#/store/compare'
import { taskStore } from '#/store/task'

import type { TaskApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

export const samplerKeys = {
    all: ['samplers'] as const,
    list: () => [...samplerKeys.all, 'list'] as const,
}

export const loraKeys = {
    all: ['loras'] as const,
    list: () => [...loraKeys.all, 'list'] as const,
}

export function useTaskFeedQuery() {
    return useInfiniteQuery(() => {
        const search = taskStore.state.feedSearch.trim()
        const taskFlags = taskStore.state.feedTaskFlags
        const request: Omit<TaskApi.GetTasksQuery, 'cursor'> = {
            limit: 30,
            ...(taskFlags ? { taskFlags } : {}),
            ...(search ? { search } : {}),
        }

        return {
            queryKey: taskKeys.feed(request),
            initialPageParam: undefined as string | undefined,
            queryFn: ({ pageParam }) => pageParam === undefined
                ? taskApi.list(request)
                : taskApi.list({ ...request, cursor: pageParam }),
            getNextPageParam: lastPage => lastPage.nextCursor,
        }
    })
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
            invalidateImageLists(queryClient)
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
            compareStore.updateTaskName(task.id, task.name)
            invalidateImageLists(queryClient)
        },
    }))
}

export function useTaskFlagMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: (request: TaskApi.UpdateTaskFlagsRequest) => taskApi.setFlags(request),
        onSuccess: result => {
            cacheTaskFlagsPatched(queryClient, result.tasks)
            invalidateImageLists(queryClient)
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
        mutationFn: () => taskApi.removeTasks(
            { scope: 'discard' },
            AbortSignal.timeout(60_000),
        ),
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
