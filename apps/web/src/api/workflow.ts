import { apiClient, unwrap } from '#/api/api.client'

import type { WorkflowApi } from '@silent-pix/shared'

export const workflowApi = {
    /* Generate 的挑選器只要 active；editor 的 all 在 PHASE 6 接 */
    list(): Promise<WorkflowApi.GetWorkflowsResponse> {
        return unwrap(apiClient.api.workflow.get({ query: { scope: 'active' } }))
    },
}
