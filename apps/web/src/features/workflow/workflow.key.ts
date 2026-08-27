import type { WorkflowApi } from '@silent-pix/shared'

export const workflowKeys = {
    all: ['workflows'] as const,
    lists: () => [...workflowKeys.all, 'list'] as const,
    list: (query: WorkflowApi.GetWorkflowsQuery) => [...workflowKeys.lists(), query] as const,
    details: () => [...workflowKeys.all, 'detail'] as const,
    detail: (request: WorkflowApi.GetWorkflowRequest) => [...workflowKeys.details(), request] as const,
}
