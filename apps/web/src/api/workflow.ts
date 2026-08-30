import { apiClient, unwrap } from '#/api/api.client'

import type { WorkflowApi } from '@silent-pix/shared'

export const workflowApi = {
    list(): Promise<WorkflowApi.GetWorkflowsResponse> {
        return unwrap(apiClient.api.workflow.get())
    },

    detail(request: WorkflowApi.GetWorkflowRequest): Promise<WorkflowApi.GetWorkflowResponse> {
        return unwrap(apiClient.api.workflow({ workflowId: request.workflowId }).get())
    },

    create(request: WorkflowApi.CreateWorkflowRequest): Promise<WorkflowApi.CreateWorkflowResponse> {
        return unwrap(apiClient.api.workflow.post(request))
    },

    remove(request: WorkflowApi.GetWorkflowRequest): Promise<WorkflowApi.DeleteWorkflowResponse> {
        return unwrap(apiClient.api.workflow({ workflowId: request.workflowId }).delete())
    },

    update(request: WorkflowApi.UpdateWorkflowParams & WorkflowApi.UpdateWorkflowRequest): Promise<WorkflowApi.UpdateWorkflowResponse> {
        return unwrap(apiClient.api.workflow({ workflowId: request.workflowId }).put({
            revision: request.revision,
            name: request.name,
            graph: request.graph,
            configSchema: request.configSchema,
        }))
    },
}
