import { getApiClient, unwrap } from '#/api/api.client'

import type { AppApi } from '@silent-pix/shared'

export const appApi = {
    health(): Promise<AppApi.GetHealthResponse> {
        return unwrap(getApiClient().api.health.get())
    },
}
