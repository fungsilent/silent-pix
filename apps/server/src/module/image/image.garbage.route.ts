import { appApi, imageApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

import { databaseMiddleware } from '#/middleware/database'
import { imageGarbageCollection } from '#/module/image/image.garbage'

export const imageGarbageCollectionRoutes = new Elysia({
    name: 'image-garbage-collection-routes',
    prefix: '/image',
})
    .use(databaseMiddleware)
    .post(
        '/garbage-collection',
        async ({ database }) => imageGarbageCollection.collect(database),
        {
            response: {
                200: imageApi.imageGarbageCollectionResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
                503: appApi.errorResponse,
            },
        },
    )
