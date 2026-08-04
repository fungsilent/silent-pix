import { createDatabaseClient } from '@silent-pix/db'

import { ComfyClient } from '#/lib/comfy/comfy.client'

import type { ServerConfig } from '#/config'

type Store = {
    database: Awaited<ReturnType<typeof createDatabaseClient>>
    comfyClient: ComfyClient
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

        store = {
            database,
            comfyClient,
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