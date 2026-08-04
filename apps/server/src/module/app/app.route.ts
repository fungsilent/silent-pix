import { appApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

import { comfyMiddleware } from '#/middleware/comfy'
import { databaseMiddleware } from '#/middleware/database'

export const appRoutes = new Elysia({ name: 'app-route' })
    .use(databaseMiddleware)
    .use(comfyMiddleware)
    .get(
        '/health',
        ({ comfyClient, database }) => {
            return {
                database: database.check(),
                comfy: comfyClient.isConnected(),
            }
        },
        {
            response: {
                200: appApi.getHealthResponse,
            },
        },
    )
