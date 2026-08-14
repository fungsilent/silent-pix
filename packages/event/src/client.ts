export type EventConnectionStatus = 'connected' | 'disconnected' | 'reconnecting'

export type EventClientOptions<TEvent> = {
    url: string
    reconnectDelayMs?: number
    /*
     * 多久沒收到合法事件就判定失聯。
     * 這個值必須由 server 的心跳間隔推導，不可各寫各的。
     */
    staleTimeoutMs?: number
    onStatusChange?: (status: EventConnectionStatus) => void
    onEvent?: (event: TEvent) => void
    /*
     * 回傳 undefined 代表訊息不合法。
     * 不合法的訊息不算「server 還活著」的證據
     */
    parseEvent?: (value: unknown) => TEvent | undefined
}

export type EventClient = {
    connect: () => void
    close: () => void
}

export function createEventClient<TEvent>(options: EventClientOptions<TEvent>): EventClient {
    const reconnectDelayMs = options.reconnectDelayMs ?? 2000
    let wsClient: WebSocket | undefined
    let reconnectTimer: number | undefined
    let staleTimer: number | undefined
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

    const clearStaleTimer = () => {
        if (staleTimer === undefined) {
            return
        }

        window.clearTimeout(staleTimer)
        staleTimer = undefined
    }

    /* 每收到一則合法事件就重新計時；重連成功後也要重新武裝 */
    const armStaleTimer = () => {
        clearStaleTimer()

        if (closed || options.staleTimeoutMs === undefined || !wsClient) {
            return
        }

        staleTimer = window.setTimeout(dropStaleConnection, options.staleTimeoutMs)
    }

    /*
     * 和公開的 close() 不同：這裡不設 closed，也不拆掉重連路徑。
     * close() 是給元件卸載用的永久關閉，拿來當 watchdog 的收尾會讓連線再也回不來。
     */
    const dropStaleConnection = () => {
        clearStaleTimer()

        const socket = wsClient
        wsClient = undefined

        if (socket) {
            /* 先拆 handler，稍後真的關閉時才不會重複觸發 */
            socket.onclose = null
            socket.onerror = null
            socket.onmessage = null
            socket.close()
        }

        /*
         * 不依賴 onclose 來觸發重連——半開連線的關閉握手會等一個
         * 永遠不會來的回應，那時 onclose 可能遲遲不發。
         */
        scheduleReconnect()
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

    /*
     * 背景分頁的 timer 會被瀏覽器節流，倒數可能在切回來的瞬間才一次到期。
     * 分頁重新可見時給連線一個完整的新視窗，避免每次切分頁都白白重連一次。
     */
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && wsClient) {
            armStaleTimer()
        }
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
            armStaleTimer()
        }

        socket.onmessage = event => {
            if (typeof event.data !== 'string') {
                return
            }

            let raw: unknown

            try {
                raw = JSON.parse(event.data)
            } catch {
                return
            }

            const payload = options.parseEvent
                ? options.parseEvent(raw)
                : raw as TEvent

            if (payload === undefined) {
                return
            }

            /* 只有走到這裡才算收到 server 的存活證明 */
            armStaleTimer()
            options.onEvent?.(payload)
        }

        socket.onclose = () => {
            if (wsClient === socket) {
                wsClient = undefined
            }

            clearStaleTimer()
            scheduleReconnect()
        }

        socket.onerror = () => {
            socket.close()
        }
    }

    const close = () => {
        closed = true
        clearReconnectTimer()
        clearStaleTimer()

        document.removeEventListener('visibilitychange', handleVisibilityChange)

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

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return {
        connect,
        close,
    }
}

export function createSameOriginEventsUrl(locationValue: Location = location): string {
    return `${locationValue.protocol === 'https:' ? 'wss:' : 'ws:'}//${locationValue.host}/api/event`
}
