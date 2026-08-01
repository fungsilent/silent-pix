import { node } from '@elysiajs/node'
import { Elysia } from 'elysia'

import { errorCatchMiddleware } from '#/middleware/error-catch'
import { appRoutes } from '#/module/app/app.route'
import { taskRoutes } from '#/module/task/task.route'

export function createApp() {
    return new Elysia({ adapter: node() })
        .use(errorCatchMiddleware)
        .group(
            '/api',
            app => app
                .use(appRoutes)
                .use(taskRoutes),
        )
}

export type Api = ReturnType<typeof createApp>