import { apiClient, unwrap } from '#/api/api.client'

import type { ImageApi } from '@silent-pix/shared'

export const imageApi = {
    list(query: ImageApi.GetImagesQuery): Promise<ImageApi.GetImagesResponse> {
        return unwrap(apiClient.api.image.get({ query }))
    },
}
