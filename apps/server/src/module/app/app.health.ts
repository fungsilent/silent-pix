import { event } from '@silent-pix/shared'

import type { DatabaseClient } from '@silent-pix/db'
import type { EventServer, EventSocket } from '@silent-pix/event/server'
import type { Event } from '@silent-pix/shared'
import type { ComfyClient } from '#/lib/comfy/comfy.client'

type HealthBroadcasterOptions = {
    eventServer: EventServer<string, Event.ServerEvent>
    comfyClient: ComfyClient
    databaseClient: DatabaseClient
}

export type HealthBroadcaster = ReturnType<typeof createHealthBroadcaster>

export function createHealthBroadcaster(options: HealthBroadcasterOptions) {
    const { eventServer, comfyClient, databaseClient } = options

    let cachedDatabase = false
    let probing: Promise<void> | undefined
    let timer: ReturnType<typeof setInterval> | undefined

    const snapshot = (): Event.Health.Snapshot => ({
        database: cachedDatabase,
        comfy: comfyClient.isConnected(),
    })

    const probeDatabase = (): Promise<void> => {
        if (probing) {
            return probing
        }

        probing = (async () => {
            try {
                cachedDatabase = await databaseClient.check()
            }
            finally {
                probing = undefined
            }
        })()

        return probing
    }

    const publish = (): void => {
        eventServer.publish('health.snapshot', { health: snapshot() })
    }

    const tick = async (): Promise<void> => {
        await probeDatabase()
        publish()
    }

    return {
        syncTimer(): void {
            if (eventServer.size > 0 && !timer) {
                timer = setInterval(() => void tick(), event.health.heartbeatIntervalMs)
                return
            }

            if (eventServer.size === 0 && timer) {
                clearInterval(timer)
                timer = undefined
            }
        },

        publishStatusChange: publish,

        async sendInitial(socket: EventSocket): Promise<void> {
            await probeDatabase()
            eventServer.send(socket, 'health.snapshot', { health: snapshot() })
        },

        stop(): void {
            if (timer) {
                clearInterval(timer)
                timer = undefined
            }
        },
    }
}
