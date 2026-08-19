import { useInfiniteQuery } from '@tanstack/solid-query'

import { imageApi } from '#/api/image'

import type { ImageApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

const imageListLimit = 30

const imageKeys = {
    all: ['images'] as const,
    lists: () => [...imageKeys.all, 'list'] as const,
    list: (input: ImageApi.GetImagesQuery) => [...imageKeys.lists(), input] as const,
}

export function useImageListQuery(enabled: Accessor<boolean>, search: Accessor<string>) {
    return useInfiniteQuery(() => {
        const keyword = search().trim()

        return {
            queryKey: imageKeys.list({ limit: imageListLimit, search: keyword }),
            enabled: enabled(),
            initialPageParam: undefined as string | undefined,
            queryFn: ({ pageParam }) => imageApi.list({
                limit: imageListLimit,
                ...(keyword ? { search: keyword } : {}),
                ...(pageParam ? { cursor: pageParam } : {}),
            }),
            getNextPageParam: lastPage => lastPage.nextCursor,
        }
    })
}
