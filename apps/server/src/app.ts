import { node } from '@elysiajs/node'
import { Elysia } from 'elysia'

import { serverStore } from '#/app.store'
import { loadConfig } from '#/config'
import { errorCatchMiddleware } from '#/middleware/error-catch'
import { appRoutes } from '#/module/app/app.route'
import { taskRoutes } from '#/module/task/task.route'

export async function createApp() {
    const env = loadConfig()
    const store = await serverStore.init(env)

    store.comfyClient.start()

    return new Elysia({ adapter: node() })
        .onStart(() => {
            store.comfyClient.start()
        })
        .onStop(() => {
            store.comfyClient.close()
            store.database.close()
        })
        .use(errorCatchMiddleware)
        .group(
            '/api',
            app => app
                .use(appRoutes)
                .use(taskRoutes),
        )
}

export type Api = ReturnType<typeof createApp>