import { createEventClient, createSameOriginEventsUrl } from '@silent-pix/event/client'
import { useQueryClient } from '@tanstack/solid-query'
import { createSignal, onCleanup, onMount } from 'solid-js'

import { Header } from '#/components/Header'
import { handleServerEvent } from '#/lib/event'
import { GeneratePage } from '#/pages/generate/GeneratePage'

import type { EventConnectionStatus } from '@silent-pix/event/client'
import type { Event } from '@silent-pix/shared'

export function App() {
    const queryClient = useQueryClient()
    const [connectionStatus, setConnectionStatus] = createSignal<EventConnectionStatus>('disconnected')
    const [lastEventTime, setLastEventTime] = createSignal<string>('None')

    onMount(() => {
        const eventClient = createEventClient<Event.ServerEvent>({
            url: createSameOriginEventsUrl(),
            onStatusChange: setConnectionStatus,
            onEvent: serverEvent => {
                setLastEventTime(new Date().toISOString())
                handleServerEvent(queryClient, serverEvent)
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
