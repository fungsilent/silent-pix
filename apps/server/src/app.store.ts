import { createDatabaseClient } from '@silent-pix/db'
import { createEventServer } from '@silent-pix/event/server'
import { event } from '@silent-pix/shared'

import { ComfyClient } from '#/lib/comfy/comfy.client'

import type { EventServer } from '@silent-pix/event/server'
import type { Event } from '@silent-pix/shared'

export type PublishEvent = EventServer<string, Event.ServerEvent>['publish']

type Store = {
    databaseClient: Awaited<ReturnType<typeof createDatabaseClient>>
    comfyClient: ComfyClient
    eventServer: EventServer<string, Event.ServerEvent>
    publishEvent: PublishEvent
}

let initialized = false
let store: Store

export const serverStore = {
    async init(): Promise<Store> {
        if (initialized) {
            throw new Error('[ServerStore] Already initialized.')
        }

        const databaseClient = await createDatabaseClient()
        const comfyClient = new ComfyClient()
        const eventServer = createEventServer<string, Event.ServerEvent>({
            parseEvent: value => event.serverEvent.parse(value),
        })
        const publishEvent: PublishEvent = (type, payload) => {
            eventServer.publish(type, payload)
        }

        store = {
            databaseClient,
            comfyClient,
            eventServer,
            publishEvent,
        }

        initialized = true

        return store
    },

    get(): Readonly<Store> {
        if (!initialized) {
            throw new Error('[ServerStore] Accessed before createApp().')
        }

        return store
    },
}
