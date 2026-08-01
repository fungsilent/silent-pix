import { appApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

export const appRoutes = new Elysia({ name: 'app-route' })
    .get(
        '/health',
        () => {
            return {
                database: false,
                comfy: false,
            }
        },
        {
            response: appApi.getHealthResponse
        }
    )
