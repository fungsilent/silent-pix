import { useInfiniteQuery } from '@tanstack/solid-query'

import { imageApi } from '#/api/image'

import type { ImageApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

const imageListLimit = 30
type ImageListQueryInput = Omit<ImageApi.GetImagesQuery, 'cursor'>

const imageKeys = {
    all: ['images'] as const,
    lists: () => [...imageKeys.all, 'list'] as const,
    list: (input: ImageListQueryInput) => [...imageKeys.lists(), input] as const,
}

export function useImageListQuery(
    enabled: Accessor<boolean>,
    search: Accessor<string>,
    taskFlags: Accessor<ImageApi.GetImagesQuery['taskFlags']>,
    type: Accessor<ImageApi.GetImagesQuery['type']>,
) {
    return useInfiniteQuery(() => {
        const keyword = search().trim()
        const selectedTaskFlags = taskFlags()
        const selectedType = type()
        const request: ImageListQueryInput = {
            limit: imageListLimit,
            ...(keyword ? { search: keyword } : {}),
            ...(selectedTaskFlags ? { taskFlags: selectedTaskFlags } : {}),
            ...(selectedType ? { type: selectedType } : {}),
        }

        return {
            queryKey: imageKeys.list(request),
            enabled: enabled(),
            initialPageParam: undefined as string | undefined,
            queryFn: ({ pageParam }) => imageApi.list({
                ...request,
                ...(pageParam ? { cursor: pageParam } : {}),
            }),
            getNextPageParam: lastPage => lastPage.nextCursor,
        }
    })
}
