import { apiClient, ApiError } from '#/api/client'

import type { AppApi } from '@silent-pix/shared'

export const appApi = {
    async health(): Promise<AppApi.GetHealthResponse> {
        const { data, error } = await apiClient.api.health.get()

        // /health 沒有宣告錯誤 response schema，拿不到 code/message
        if (error) {
            throw new ApiError(error.status, 'HEALTH_CHECK_FAILED', 'Failed to read service health.')
        }

        return data
    },
}
