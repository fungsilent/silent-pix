import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query'

import { workflowApi } from '#/data/workflow/workflow.api'
import { removeWorkflowCache, updateArchivedOrDeletedWorkflowCache, updateSavedWorkflowCache } from '#/data/workflow/workflow.cache'
import { workflowKeys } from '#/data/workflow/workflow.key'
import { ApiError } from '#/lib/api-client'

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
    return useQuery<WorkflowApi.GetWorkflowResponse | null>(() => {
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
            queryFn: async ({ signal }) => {
                if (!request) {
                    throw new Error('Workflow detail query requires a workflow ID.')
                }

                try {
                    return await workflowApi.detail(request, signal)
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
            updateSavedWorkflowCache(queryClient, await workflowApi.create(request)),
    }))
}

export function useDeleteWorkflowMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: (request: WorkflowApi.GetWorkflowRequest) => workflowApi.remove(request),
        onSuccess: (result: WorkflowApi.DeleteWorkflowResponse) => {
            updateArchivedOrDeletedWorkflowCache(queryClient, result)
        },
    }))
}

export function useUpdateWorkflowMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: async (
            request: WorkflowApi.UpdateWorkflowParams & WorkflowApi.UpdateWorkflowRequest,
        ) => updateSavedWorkflowCache(queryClient, await workflowApi.update(request)),
        onError: (error, { workflowId }) => {
            if (isWorkflowNotFound(error)) removeWorkflowCache(queryClient, workflowId)
        },
    }))
}

function isWorkflowNotFound(error: unknown): boolean {
    return error instanceof ApiError && error.code === 'WORKFLOW_NOT_FOUND'
}
