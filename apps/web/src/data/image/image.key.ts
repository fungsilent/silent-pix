import type { ImageApi } from '@silent-pix/shared'

export type ImageListQueryInput = Omit<ImageApi.GetImagesQuery, 'cursor'>

export const imageKeys = {
    all: ['images'] as const,
    lists: () => [...imageKeys.all, 'list'] as const,
    list: (input: ImageListQueryInput) => [...imageKeys.lists(), input] as const,
}
