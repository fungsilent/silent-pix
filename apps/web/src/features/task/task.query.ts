import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/solid-query'

import { taskApi } from '#/api/task'
import { workflowApi } from '#/api/workflow'
import { cacheCreatedTaskResponse, cacheTaskRenamed } from '#/features/task/task.cache'
import { applyTaskRemoved } from '#/features/task/task.event'
import { taskKeys } from '#/features/task/task.key'

import type { TaskApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

const taskFeedLimit = 30

export const workflowKeys = {
    all: ['workflows'] as const,
    list: () => [...workflowKeys.all, 'list'] as const,
}

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

export function useWorkflowListQuery() {
    return useQuery(() => ({
        queryKey: workflowKeys.list(),
        queryFn: () => workflowApi.list(),
    }))
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
            applyTaskRemoved(queryClient, result.id)
        },
    }))
}
