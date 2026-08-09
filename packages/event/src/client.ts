export type EventConnectionStatus = 'connected' | 'disconnected' | 'reconnecting'

export type EventClientOptions<TEvent> = {
    url: string
    reconnectDelayMs?: number
    onStatusChange?: (status: EventConnectionStatus) => void
    onEvent?: (event: TEvent) => void
}

export type EventClient = {
    connect: () => void
    close: () => void
}

export function createEventClient<TEvent>(options: EventClientOptions<TEvent>): EventClient {
    const reconnectDelayMs = options.reconnectDelayMs ?? 2000
    let wsClient: WebSocket | undefined
    let reconnectTimer: number | undefined
    let closed = false

    const setStatus = (status: EventConnectionStatus) => {
        options.onStatusChange?.(status)
    }

    const clearReconnectTimer = () => {
        if (reconnectTimer === undefined) {
            return
        }

        window.clearTimeout(reconnectTimer)
        reconnectTimer = undefined
    }

    const scheduleReconnect = () => {
        if (closed || reconnectTimer !== undefined) {
            return
        }

        setStatus('disconnected')
        reconnectTimer = window.setTimeout(() => {
            reconnectTimer = undefined
            connect()
        }, reconnectDelayMs)
    }

    const connect = () => {
        closed = false

        if (wsClient && wsClient.readyState !== WebSocket.CLOSED) {
            return
        }

        clearReconnectTimer()
        setStatus('reconnecting')

        const socket = new WebSocket(options.url)
        wsClient = socket

        socket.onopen = () => {
            setStatus('connected')
        }

        socket.onmessage = event => {
            if (typeof event.data !== 'string') {
                return
            }

            let payload: TEvent

            try {
                payload = JSON.parse(event.data) as TEvent
            } catch {
                return
            }

            options.onEvent?.(payload)
        }

        socket.onclose = () => {
            if (wsClient === socket) {
                wsClient = undefined
            }

            scheduleReconnect()
        }

        socket.onerror = () => {
            socket.close()
        }
    }

    const close = () => {
        closed = true
        clearReconnectTimer()

        const socket = wsClient
        wsClient = undefined

        if (!socket) {
            setStatus('disconnected')
            return
        }

        socket.onclose = null
        socket.onerror = null
        socket.close()
        setStatus('disconnected')
    }

    return {
        connect,
        close,
    }
}

export function createSameOriginEventsUrl(locationValue: Location = location): string {
    return `${locationValue.protocol === 'https:' ? 'wss:' : 'ws:'}//${locationValue.host}/api/event`
}
