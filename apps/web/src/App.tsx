import { createEventClient, createSameOriginEventsUrl } from '@silent-pix/event/client'
import { event } from '@silent-pix/shared'
import { useQueryClient } from '@tanstack/solid-query'
import { onCleanup, onMount } from 'solid-js'

import { Header } from '#/components/Header'
import { taskKeys } from '#/features/task/task.key'
import { handleServerEvent } from '#/lib/event'
import { GeneratePage } from '#/pages/generate/GeneratePage'
import { appStore } from '#/store/app'

import type { Event } from '@silent-pix/shared'

export function App() {
    const queryClient = useQueryClient()

    onMount(() => {
        let hasConnected = false
        const eventClient = createEventClient<Event.ServerEvent>({
            url: createSameOriginEventsUrl(),
            staleTimeoutMs: event.health.staleTimeoutMs,
            parseEvent: value => {
                const result = event.serverEvent.safeParse(value)

                return result.success ? result.data : undefined
            },
            onStatusChange: status => {
                appStore.setConnection(status)

                if (status !== 'connected') {
                    return
                }

                if (hasConnected) {
                    void queryClient.invalidateQueries({
                        queryKey: taskKeys.all,
                    })
                    return
                }

                hasConnected = true
            },
            onEvent: serverEvent => {
                handleServerEvent(queryClient, serverEvent)
            },
        })

        eventClient.connect()

        onCleanup(() => {
            eventClient.close()
        })
    })

    return (
        <main class='flex flex-col overflow-hidden bg-canvas text-fg'>
            <Header />
            <GeneratePage />
        </main>
    )
}
