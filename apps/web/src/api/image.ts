import { getApiClient, getApiEndpoint, unwrap } from '#/api/api.client'

import type { ImageApi } from '@silent-pix/shared'

export const imageApi = {
    list(query: ImageApi.GetImagesQuery): Promise<ImageApi.GetImagesResponse> {
        return unwrap(getApiClient().api.image.get({ query }))
    },
}

export function resolveImageUrl(url: string): string {
    return new URL(url, getApiEndpoint()).toString()
}
