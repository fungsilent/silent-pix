export type EventSocket = {
    send: (data: string) => unknown
    close: () => unknown
}

type EventConnection<TClientId> = {
    key: unknown
    clientId: TClientId
    socket: EventSocket
}

type EventType<TEvent extends { type: string }> = TEvent['type']

type EventPayload<
    TEvent extends { type: string },
    TType extends EventType<TEvent>,
> = Omit<Extract<TEvent, { type: TType }>, 'type'>

type EventServerOptions<TEvent extends { type: string }> = {
    parseEvent: (value: unknown) => TEvent
}

export type EventServer<
    TClientId,
    TEvent extends { type: string },
> = ReturnType<typeof createEventServer<TClientId, TEvent>>

export function createEventServer<
    TClientId,
    TEvent extends { type: string },
>({ parseEvent }: EventServerOptions<TEvent>) {
    const connections = new Map<unknown, EventConnection<TClientId>>()

    /*
     * key 由呼叫端指定，因為 socket 物件本身未必是穩定的識別——
     * 有些 adapter 在 open 與 close 交出的是不同的 wrapper，
     * 那會讓 disconnect 刪不掉東西，連線數永遠降不回 0。
     */
    const connect = (connection: EventConnection<TClientId>): void => {
        connections.set(connection.key, connection)
    }

    const disconnect = (key: unknown): void => {
        connections.delete(key)
    }

    const send = <TType extends EventType<TEvent>>(
        socket: EventSocket,
        type: TType,
        payload: EventPayload<TEvent, TType>,
    ): void => {
        const event = parseEvent({ ...payload, type })
        sendEvent(socket, event)
    }

    const publish = <TType extends EventType<TEvent>>(
        type: TType,
        payload: EventPayload<TEvent, TType>,
    ): void => {
        const event = parseEvent({ ...payload, type })

        for (const { socket } of connections.values()) {
            sendEvent(socket, event)
        }
    }

    return {
        connect,
        disconnect,
        /* 讓呼叫端能依連線數啟停背景工作，沒有人在聽時不必空轉 */
        get size(): number {
            return connections.size
        },
        /* 定點傳送：初始快照只該給剛連上的那個 client，不是廣播給所有人 */
        send,
        publish,
        close: (): void => {
            for (const { socket } of connections.values()) {
                socket.close()
            }

            connections.clear()
        },
    }
}

function sendEvent<TEvent>(socket: EventSocket, event: TEvent): void {
    socket.send(JSON.stringify(event))
}
