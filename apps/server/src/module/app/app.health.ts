import { event } from '@silent-pix/shared'

import { healthSnapshot } from '#/module/app/app.event'

import type { DatabaseClient } from '@silent-pix/db'
import type { EventChannel, EventSocket } from '@silent-pix/event/server'
import type { Event } from '@silent-pix/shared'
import type { ComfyClient } from '#/lib/comfy/comfy.client'

type HealthBroadcasterOptions = {
    channel: EventChannel<Event.ServerEvent>
    comfyClient: ComfyClient
    database: DatabaseClient
}

export type HealthBroadcaster = ReturnType<typeof createHealthBroadcaster>

export function createHealthBroadcaster(options: HealthBroadcasterOptions) {
    const { channel, comfyClient, database } = options

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
                cachedDatabase = await database.check()
            }
            finally {
                probing = undefined
            }
        })()

        return probing
    }

    const publish = (): void => {
        channel.broadcast(event.serverEvent.parse(healthSnapshot(snapshot())))
    }

    const tick = async (): Promise<void> => {
        await probeDatabase()
        publish()
    }

    return {
        syncTimer(): void {
            if (channel.size > 0 && !timer) {
                timer = setInterval(() => void tick(), event.health.heartbeatIntervalMs)
                return
            }

            if (channel.size === 0 && timer) {
                clearInterval(timer)
                timer = undefined
            }
        },

        publishStatusChange: publish,

        async sendInitial(socket: EventSocket): Promise<void> {
            await probeDatabase()
            channel.send(socket, event.serverEvent.parse(healthSnapshot(snapshot())))
        },

        stop(): void {
            if (timer) {
                clearInterval(timer)
                timer = undefined
            }
        },
    }
}
