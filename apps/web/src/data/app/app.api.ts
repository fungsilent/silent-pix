import { createApiClient, getApiClient, unwrap } from '#/lib/api-client'

import type { AppApi } from '@silent-pix/shared'

export const appApi = {
    health(): Promise<AppApi.GetHealthResponse> {
        return unwrap(getApiClient().api.health.get())
    },
}

export async function probeConnection(serverUrl: string): Promise<void> {
    const apiClient = createApiClient(serverUrl)
    await unwrap(apiClient.api.health.get())
}
