import { createEventClient, createSameOriginEventsUrl } from '@silent-pix/event/client'
import { createSignal, onCleanup, onMount } from 'solid-js'

import { Header } from '#/components/Header'
import { GeneratePage } from '#/pages/generate/GeneratePage'

import type { EventConnectionStatus } from '@silent-pix/event/client'

export function App() {
    const [connectionStatus, setConnectionStatus] = createSignal<EventConnectionStatus>('disconnected')
    const [lastEventTime, setLastEventTime] = createSignal<string>('None')

    onMount(() => {
        const eventClient = createEventClient({
            url: createSameOriginEventsUrl(),
            onStatusChange: setConnectionStatus,
            onEvent(serverEvent) {
                setLastEventTime(String(serverEvent.serverTime))
            },
        })

        eventClient.connect()

        onCleanup(() => {
            eventClient.close()
        })
    })

    return (
        <main class='flex flex-col overflow-hidden bg-[#0b0f14] text-slate-50'>
            <Header
                connectionStatus={connectionStatus()}
                lastEventTime={lastEventTime()}
            />
            <GeneratePage />
        </main>
    )
}
