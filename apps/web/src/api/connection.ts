import { createApiClient, unwrap } from '#/api/api.client'

export async function probeConnection(serverUrl: string): Promise<void> {
    const apiClient = createApiClient(serverUrl)
    await unwrap(apiClient.api.health.get())
}
