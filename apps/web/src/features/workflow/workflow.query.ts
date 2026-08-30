import { useMutation, useQuery, useQueryClient } from '@tanstack/solid-query'

import { workflowApi } from '#/api/workflow'
import { cacheWorkflowRemoved, cacheWorkflowSaved } from '#/features/workflow/workflow.cache'
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
            queryFn: async () => {
                if (!request) {
                    throw new Error('Workflow detail query requires a workflow ID.')
                }

                return workflowApi.detail(request)
            },
        }
    })
}

export function useCreateWorkflowMutation() {
    const queryClient = useQueryClient()

    return useMutation(() => ({
        mutationFn: (request: WorkflowApi.CreateWorkflowRequest) => workflowApi.create(request),
        onSuccess: (created: WorkflowApi.CreateWorkflowResponse) => {
            cacheWorkflowSaved(queryClient, created)
        },
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
        mutationFn: (
            request: WorkflowApi.UpdateWorkflowParams & WorkflowApi.UpdateWorkflowRequest,
        ) => workflowApi.update(request),
        onSuccess: (updated: WorkflowApi.UpdateWorkflowResponse) => {
            cacheWorkflowSaved(queryClient, updated)
        },
    }))
}
