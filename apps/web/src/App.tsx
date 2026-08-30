import { createEventClient, createSameOriginEventsUrl } from '@silent-pix/event/client'
import { event } from '@silent-pix/shared'
import { useQueryClient } from '@tanstack/solid-query'
import { Match, onCleanup, onMount, Switch } from 'solid-js'

import { Header } from '#/components/Header'
import { taskKeys } from '#/features/task/task.key'
import { workflowKeys } from '#/features/workflow/workflow.key'
import { handleServerEvent } from '#/lib/event'
import { GeneratePage } from '#/pages/generate/GeneratePage'
import { WorkflowPage } from '#/pages/workflow/WorkflowPage'
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
                    /* 斷線期間錯過的事件，兩個 domain 都要補 */
                    void queryClient.invalidateQueries({ queryKey: taskKeys.all })
                    void queryClient.invalidateQueries({ queryKey: workflowKeys.all })
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
            <Switch>
                <Match when={appStore.state.page === 'generate'}>
                    <GeneratePage />
                </Match>
                <Match when={appStore.state.page === 'workflow'}>
                    <WorkflowPage />
                </Match>
            </Switch>
        </main>
    )
}
