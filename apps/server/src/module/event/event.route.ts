import { appApi } from '@silent-pix/shared'

import type { EventServer, EventSocket } from '@silent-pix/event/server'
import type { Event } from '@silent-pix/shared'
import type { Elysia } from 'elysia'

type EventWebSocketOptions = {
    eventServer: EventServer<string, Event.ServerEvent>
    onConnected: (socket: EventSocket) => void | Promise<void>
    onDisconnected: () => void
}

export function createEventRoutes(options: EventWebSocketOptions) {
    const { eventServer, onConnected, onDisconnected } = options

    return (app: Elysia) => app
        .ws('/event', {
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
            open: async ws => {
                eventServer.connect({
                    key: ws.raw,
                    clientId: ws.data.query.clientId,
                    socket: ws,
                })
                await onConnected(ws)
            },
            close: ws => {
                eventServer.disconnect(ws.raw)
                onDisconnected()
            },
        })
}
