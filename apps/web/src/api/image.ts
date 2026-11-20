import { getApiClient, getApiEndpoint, requestSignal, unwrap } from '#/api/api.client'

import type { ImageApi } from '@silent-pix/shared'

export const imageApi = {
    list(query: ImageApi.GetImagesQuery, signal: AbortSignal): Promise<ImageApi.GetImagesResponse> {
        return unwrap(getApiClient().api.image.get({ query, fetch: { signal: requestSignal({ signal }) } }))
    },
}

export function resolveImageUrl(url: string): string {
    return new URL(url, getApiEndpoint()).toString()
}
