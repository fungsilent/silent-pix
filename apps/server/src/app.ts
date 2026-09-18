import { node } from '@elysiajs/node'
import { Elysia } from 'elysia'

import { serverStore } from '#/app.store'
import { errorCatchMiddleware } from '#/middleware/error-catch'
import { createHealthBroadcaster } from '#/module/app/app.health'
import { appRoutes } from '#/module/app/app.route'
import { createEventRoutes } from '#/module/event/event.route'
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
        eventServer: store.eventServer,
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
        .group(
            '/api',
            app => app
                .use(appRoutes)
                .use(imageRoutes)
                .use(imageGarbageCollectionRoutes)
                .use(taskRoutes)
                .use(workflowRoutes)
                .use(createEventRoutes({
                    eventServer: store.eventServer,
                    onConnected: async socket => {
                        health.syncTimer()
                        /* 定點傳送，既有連線不該因為有人開新分頁而收到額外快照 */
                        await health.sendInitial(socket)
                    },
                    onDisconnected: () => {
                        health.syncTimer()
                    },
                })),
        )

    return {
        app,
        async close(): Promise<void> {
            health.stop()
            store.eventServer.close()
            store.comfyClient.close()
            await waitForImageMutationDrain()
            store.databaseClient.close()
        },
    }
}

export type Api = Awaited<ReturnType<typeof createApp>>['app']
