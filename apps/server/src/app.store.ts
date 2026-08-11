import { createDatabaseClient } from '@silent-pix/db'
import { createEventChannel } from '@silent-pix/event/server'
import { event } from '@silent-pix/shared'

import { ComfyClient } from '#/lib/comfy/comfy.client'

import type { EventChannel } from '@silent-pix/event/server'
import type { Event } from '@silent-pix/shared'
import type { ServerConfig } from '#/config'

export type PushEvent = (value: Event.ServerEvent) => void

type Store = {
    database: Awaited<ReturnType<typeof createDatabaseClient>>
    comfyClient: ComfyClient
    eventChannel: EventChannel<Event.ServerEvent>
    pushEvent: PushEvent
}

let initialized = false
let store: Store

export const serverStore = {
    async init(env: ServerConfig): Promise<Store> {
        if (initialized) {
            throw new Error('[ServerStore] Already initialized.')
        }

        const database = await createDatabaseClient(env.databasePath)
        const comfyClient = new ComfyClient(env.comfyuiBaseUrl)
        const eventChannel = createEventChannel<Event.ServerEvent>()
        const pushEvent: PushEvent = value => {
            const parsed = event.serverEvent.parse(value)
            eventChannel.broadcast(parsed)
        }

        store = {
            database,
            comfyClient,
            eventChannel,
            pushEvent,
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
