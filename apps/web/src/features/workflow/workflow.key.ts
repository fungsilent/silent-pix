import type { WorkflowApi } from '@silent-pix/shared'

export const workflowKeys = {
    all: ['workflows'] as const,
    list: () => [...workflowKeys.all, 'list'] as const,
    details: () => [...workflowKeys.all, 'detail'] as const,
    detail: (request: WorkflowApi.GetWorkflowRequest) => [...workflowKeys.details(), request] as const,
}
