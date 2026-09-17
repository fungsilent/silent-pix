import { node } from '@elysiajs/node'
import { appApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

import { serverStore } from '#/app.store'
import { errorCatchMiddleware } from '#/middleware/error-catch'
import { createHealthBroadcaster } from '#/module/app/app.health'
import { appRoutes } from '#/module/app/app.route'
import { imageGarbageCollectionRoutes } from '#/module/image/image.garbage.route'
import { waitForImageMutationDrain } from '#/module/image/image.mutation'
import { imageRoutes } from '#/module/image/image.route'
import { taskRoutes } from '#/module/task/task.route'
import { taskService } from '#/module/task/task.service'
import { workflowRoutes } from '#/module/workflow/workflow.route'

export async function createApp() {
    const store = await serverStore.init()

    const recoveredTaskIds = await taskService.failInterruptedTasks(store.databaseClient.database)
    if (recoveredTaskIds.length > 0) {
        console.info(`Recovered ${recoveredTaskIds.length} interrupted task(s) after server restart.`)
    }

    const health = createHealthBroadcaster({
        channel: store.eventChannel,
        comfyClient: store.comfyClient,
        databaseClient: store.databaseClient,
    })

    store.comfyClient.onStatusChange(() => {
        health.publishStatusChange()
    })

    store.comfyClient.start()

    const app = new Elysia({ adapter: node() })
        .onStart(() => {
            store.comfyClient.start()
        })
        .use(errorCatchMiddleware)
        .ws('/api/event', {
            beforeHandle: ({ request, status }) => {
                const origin = request.headers.get('origin')
                const host = request.headers.get('host')
                let originHost: string | undefined

                if (origin) {
                    try {
                        originHost = new URL(origin).host
                    }
                    catch {
                        originHost = undefined
                    }
                }

                if (!host || originHost !== host) {
                    return status(403, {
                        error: {
                            code: 'ORIGIN_NOT_ALLOWED',
                            message: 'WebSocket origin is not allowed.',
                        },
                    })
                }
            },
            query: appApi.eventQuery,
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
                .use(imageGarbageCollectionRoutes)
                .use(taskRoutes)
                .use(workflowRoutes),
        )

    return {
        app,
        async close(): Promise<void> {
            health.stop()
            store.eventChannel.close()
            store.comfyClient.close()
            await waitForImageMutationDrain()
            store.databaseClient.close()
        },
    }
}

export type Api = Awaited<ReturnType<typeof createApp>>['app']
