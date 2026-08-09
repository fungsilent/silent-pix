export type EventSocket = {
    send: (data: string) => unknown
    close: () => unknown
}

export type EventChannel<TEvent> = ReturnType<typeof createEventChannel<TEvent>>

export function createEventChannel<TEvent>() {
    const clients = new Set<EventSocket>()

    const connect = (socket: EventSocket) => {
        clients.add(socket)
    }

    const disconnect = (socket: EventSocket) => {
        clients.delete(socket)
    }

    return {
        connect,
        disconnect,
        broadcast: (event: TEvent) => broadcastTo(clients, event),
        close: () => {
            for (const socket of clients) {
                socket.close()
            }

            clients.clear()
        },
    }
}

function broadcastTo<TEvent>(clients: Set<EventSocket>, event: TEvent): void {
    for (const socket of clients) {
        sendEvent(socket, event)
    }
}

function sendEvent<TEvent>(socket: EventSocket, event: TEvent): void {
    socket.send(JSON.stringify(event))
}
