import { createEventClient, createSameOriginEventsUrl } from '@silent-pix/event/client'
import { useQueryClient } from '@tanstack/solid-query'
import { onCleanup, onMount } from 'solid-js'

import { Header } from '#/components/Header'
import { taskKeys } from '#/features/task/task.key'
import { handleServerEvent } from '#/lib/event'
import { GeneratePage } from '#/pages/generate/GeneratePage'

import type { Event } from '@silent-pix/shared'

export function App() {
    const queryClient = useQueryClient()

    onMount(() => {
        let hasConnected = false
        const eventClient = createEventClient<Event.ServerEvent>({
            url: createSameOriginEventsUrl(),
            onStatusChange: status => {
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
