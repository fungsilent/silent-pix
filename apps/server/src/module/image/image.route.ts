import { toUUID } from '@silent-pix/db'
import { appApi, imageApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

import { loadConfig } from '#/config'
import { readContent } from '#/lib/image/image.store'
import { databaseMiddleware } from '#/middleware/database'
import { imageService } from '#/module/image/image.service'

import type { ImageApi } from '@silent-pix/shared'

const storageRoot = loadConfig().appStorageDir

export const imageRoutes = new Elysia({ name: 'image-routes', prefix: '/image' })
    .use(databaseMiddleware)
    .get(
        '/',
        async ({ database, query, status }) => {
            const result = await imageService.listImages(database, query)

            if (!result.ok) {
                return status(422, {
                    error: {
                        code: result.error,
                        message: 'Invalid image cursor.',
                    },
                })
            }

            return result.data
        },
        {
            query: imageApi.getImagesQuery,
            response: {
                200: imageApi.getImagesResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )
    .get(
        '/:imageId',
        async ({ database, params, request, status }) => {
            const image = await imageService.findImage(database, toUUID(params.imageId, 'imageId'))

            if (!image) {
                return status(404, {
                    error: {
                        code: 'IMAGE_NOT_FOUND',
                        message: 'Image not found.',
                    },
                })
            }

            const etag = `"${image.hash}"`

            /* immutable 讓瀏覽器連 revalidate 都省了，但 Ctrl+R 仍會問，所以 ETag 要在 */
            if (request.headers.get('if-none-match') === etag) {
                return new Response(null, { status: 304, headers: cacheHeaders(image, etag) })
            }

            try {
                const bytes = new Uint8Array(await readContent(storageRoot, image.path))

                return new Response(bytes, { headers: cacheHeaders(image, etag) })
            }
            catch (error) {
                if (isFileNotFoundError(error)) {
                    return status(404, {
                        error: {
                            code: 'IMAGE_FILE_NOT_FOUND',
                            message: 'Image file not found.',
                        },
                    })
                }

                throw error
            }
        },
        {
            params: imageApi.getImageRequest,
            response: {
                404: appApi.errorResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )

/* 內容定址：同一個位址的位元組依定義永遠不會改變，這正是 immutable 的用途 */
function cacheHeaders(image: { mime: ImageApi.ImageMime, sizeBytes: number }, etag: string): HeadersInit {
    return {
        'content-type': image.mime,
        'content-length': String(image.sizeBytes),
        'cache-control': 'public, max-age=31536000, immutable',
        etag,
    }
}

function isFileNotFoundError(error: unknown): boolean {
    return error instanceof Error
        && 'code' in error
        && error.code === 'ENOENT'
}
