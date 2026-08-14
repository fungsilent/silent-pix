import { apiClient, unwrap } from '#/api/api.client'

import type { AppApi } from '@silent-pix/shared'

export const appApi = {
    health(): Promise<AppApi.GetHealthResponse> {
        return unwrap(apiClient.api.health.get())
    },
}
