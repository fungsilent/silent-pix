import { appApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

import { databaseMiddleware } from '#/middleware/database'

export const appRoutes = new Elysia({ name: 'app-route' })
    .use(databaseMiddleware)
    .get(
        '/health',
        ({ database }) => {
            return {
                database: database.check(),
                comfy: false,
            }
        },
        {
            response: {
                200: appApi.getHealthResponse,
            },
        },
    )
