import { getImageRequest } from '#shared/api/image/detail'
import { imageGarbageCollectionResponse } from '#shared/api/image/garbage-collection'
import {
    getImagesQuery,
    getImagesResponse,
} from '#shared/api/image/list'
import {
    imageResource,
    imageUsage,
} from '#shared/contract/image'

/* MARK: catalog */

export const imageApi = {
    imageGarbageCollectionResponse,
    getImageRequest,
    getImagesQuery,
    getImagesResponse,
    imageResource,
    imageUsage,
} as const

/* MARK: inferred types */

export type {
    ImageMime,
    ImageResource,
    ImageUsage,
} from '#shared/contract/image'
export type { ImageGarbageCollectionResponse } from '#shared/api/image/garbage-collection'
export type {
    GetImagesQuery,
    GetImagesResponse,
    ImageListItem,
} from '#shared/api/image/list'
