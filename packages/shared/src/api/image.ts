import { getImageRequest } from '#shared/api/image/detail'
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
    getImageRequest,
    getImagesQuery,
    getImagesResponse,
    imageResource,
    imageUsage,
} as const

/* MARK: inferred types */

export type {
    ImageListItem,
    ImageMime,
    ImageResource,
    ImageUsage,
} from '#shared/contract/image'
export type {
    GetImagesQuery,
    GetImagesResponse,
} from '#shared/api/image/list'
