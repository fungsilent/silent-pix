import { apiClient, unwrap } from '#/api/api.client'

import type { WorkflowApi } from '@silent-pix/shared'

export const workflowApi = {
    list(): Promise<WorkflowApi.GetWorkflowsResponse> {
        return unwrap(apiClient.api.workflow.get())
    },
}
