import { apiClient, ApiError } from '#/api/client'

import type { WorkflowApi } from '@silent-pix/shared'

export const workflowApi = {
    async list(): Promise<WorkflowApi.GetWorkflowsResponse> {
        const { data, error } = await apiClient.api.workflow.get()

        if (error) {
            const { code, message } = error.value.error

            throw new ApiError(error.status, code, message)
        }

        return data
    },
}
