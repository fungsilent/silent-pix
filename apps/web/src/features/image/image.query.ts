import { useInfiniteQuery } from '@tanstack/solid-query'

import { imageApi } from '#/api/image'
import { imageKeys } from '#/features/image/image.key'

import type { ImageApi } from '@silent-pix/shared'
import type { ImageListQueryInput } from '#/features/image/image.key'
import type { Accessor } from 'solid-js'

const imageListLimit = 30

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
