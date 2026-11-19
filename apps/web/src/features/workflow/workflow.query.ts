import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query'

import { ApiError } from '#/api/api.client'
import { workflowApi } from '#/api/workflow'
import { applyWorkflowRemoved, cacheWorkflowRemoved, cacheWorkflowSaved } from '#/features/workflow/workflow.cache'
import { workflowKeys } from '#/features/workflow/workflow.key'

import type { WorkflowApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

export function useWorkflowListQuery() {
    return useQuery(() => ({
        queryKey: workflowKeys.list(),
        queryFn: () => workflowApi.list(),
    }))
}

export function useRefreshWorkflowList() {
    const queryClient = useQueryClient()

    return () => {
        void queryClient.refetchQueries({ queryKey: workflowKeys.list(), type: 'all' })
    }
}

export function useWorkflowDetailQuery(workflowId: Accessor<string | null>) {
    return useQuery(() => {
        const id = workflowId()
        const request: WorkflowApi.GetWorkflowRequest | undefined = id
            ? { workflowId: id }
            : undefined

        return {
            queryKey: request
                ? workflowKeys.detail(request)
                : workflowKeys.details(),
            enabled: Boolean(request),
            staleTime: query => query.state.data === null ? Infinity : 0,
            queryFn: async () => {
                if (!request) {
                    throw new Error('Workflow detail query requires a workflow ID.')
                }

                try {
                    return await workflowApi.detail(request)
                }
                catch (error) {
                    if (isWorkflowNotFound(error)) return null

                    throw error
                }
            },
        }
    })
}

export function useCreateWorkflowMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: async (request: WorkflowApi.CreateWorkflowRequest) =>
            cacheWorkflowSaved(queryClient, await workflowApi.create(request)),
    }))
}

export function useDeleteWorkflowMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: (request: WorkflowApi.GetWorkflowRequest) => workflowApi.remove(request),
        onSuccess: (result: WorkflowApi.DeleteWorkflowResponse) => {
            cacheWorkflowRemoved(queryClient, result)
        },
    }))
}

export function useUpdateWorkflowMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: async (
            request: WorkflowApi.UpdateWorkflowParams & WorkflowApi.UpdateWorkflowRequest,
        ) => cacheWorkflowSaved(queryClient, await workflowApi.update(request)),
        onError: (error, { workflowId }) => {
            if (isWorkflowNotFound(error)) applyWorkflowRemoved(queryClient, workflowId)
        },
    }))
}

function isWorkflowNotFound(error: unknown): boolean {
    return error instanceof ApiError && error.code === 'WORKFLOW_NOT_FOUND'
}
