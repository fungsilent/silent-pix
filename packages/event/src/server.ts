export type EventSocket = {
    send: (data: string) => unknown
    close: () => unknown
}

export type EventChannel<TEvent> = ReturnType<typeof createEventChannel<TEvent>>

export function createEventChannel<TEvent>() {
    const clients = new Map<unknown, EventSocket>()

    /*
     * key 由呼叫端指定，因為 socket 物件本身未必是穩定的識別——
     * 有些 adapter 在 open 與 close 交出的是不同的 wrapper，
     * 那會讓 disconnect 刪不掉東西，連線數永遠降不回 0。
     */
    const connect = (socket: EventSocket, key: unknown = socket) => {
        clients.set(key, socket)
    }

    const disconnect = (key: unknown) => {
        clients.delete(key)
    }

    return {
        connect,
        disconnect,
        /* 讓呼叫端能依連線數啟停背景工作，沒有人在聽時不必空轉 */
        get size(): number {
            return clients.size
        },
        /* 定點傳送：初始快照只該給剛連上的那個 client，不是廣播給所有人 */
        send: (socket: EventSocket, event: TEvent) => sendEvent(socket, event),
        broadcast: (event: TEvent) => broadcastTo(clients.values(), event),
        close: () => {
            for (const socket of clients.values()) {
                socket.close()
            }

            clients.clear()
        },
    }
}

function broadcastTo<TEvent>(clients: Iterable<EventSocket>, event: TEvent): void {
    for (const socket of clients) {
        sendEvent(socket, event)
    }
}

function sendEvent<TEvent>(socket: EventSocket, event: TEvent): void {
    socket.send(JSON.stringify(event))
}
