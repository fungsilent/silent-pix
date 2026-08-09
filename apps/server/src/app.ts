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
            store.eventChannel.close()
            store.comfyClient.close()
            store.database.close()
        })
        .use(errorCatchMiddleware)
        .ws('/api/event', {
            open: ws => {
                store.eventChannel.connect(ws)
            },
            close: ws => {
                store.eventChannel.disconnect(ws)
            },
        })
        .group(
            '/api',
            app => app
                .use(appRoutes)
                .use(taskRoutes),
        )
}

export type Api = Awaited<ReturnType<typeof createApp>>
