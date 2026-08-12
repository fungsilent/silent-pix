import { apiClient } from '#/api/client'

import type { AppApi } from '@silent-pix/shared'

export const appApi = {
    async health(): Promise<AppApi.GetHealthResponse> {
        const { data, error } = await apiClient.api.health.get()

        // /health 沒有結構化的錯誤回應，只有 status 可用
        if (error) {
            throw new Error(`Health check failed with status ${error.status}.`)
        }

        return data
    },
}
