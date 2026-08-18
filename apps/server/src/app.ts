import { node } from '@elysiajs/node'
import { Elysia } from 'elysia'

import { serverStore } from '#/app.store'
import { loadConfig } from '#/config'
import { errorCatchMiddleware } from '#/middleware/error-catch'
import { createHealthBroadcaster } from '#/module/app/app.health'
import { appRoutes } from '#/module/app/app.route'
import { imageRoutes } from '#/module/image/image.route'
import { taskRoutes } from '#/module/task/task.route'
import { workflowRoutes } from '#/module/workflow/workflow.route'

export async function createApp() {
    const env = loadConfig()
    const store = await serverStore.init(env)

    const health = createHealthBroadcaster({
        channel: store.eventChannel,
        comfyClient: store.comfyClient,
        database: store.database,
    })

    store.comfyClient.onStatusChange(() => {
        health.publishStatusChange()
    })

    store.comfyClient.start()

    return new Elysia({ adapter: node() })
        .onStart(() => {
            store.comfyClient.start()
        })
        .onStop(() => {
            health.stop()
            store.eventChannel.close()
            store.comfyClient.close()
            store.database.close()
        })
        .use(errorCatchMiddleware)
        .ws('/api/event', {
            /*
             * 用 ws.raw 當 key：Elysia 在 open 與 close 交出的是不同的 wrapper 物件，
             * 拿 wrapper 本身當 key 會刪不掉，interval 也就永遠停不下來。
             */
            open: async ws => {
                store.eventChannel.connect(ws, ws.raw)
                health.syncTimer()
                /* 定點傳送，既有連線不該因為有人開新分頁而收到額外快照 */
                await health.sendInitial(ws)
            },
            close: ws => {
                store.eventChannel.disconnect(ws.raw)
                health.syncTimer()
            },
        })
        .group(
            '/api',
            app => app
                .use(appRoutes)
                .use(imageRoutes)
                .use(taskRoutes)
                .use(workflowRoutes),
        )
}

export type Api = Awaited<ReturnType<typeof createApp>>
