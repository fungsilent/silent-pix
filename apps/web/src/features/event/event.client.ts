import { createEventClient, createSameOriginEventsUrl } from '@silent-pix/event/client'
import { event } from '@silent-pix/shared'

import { clientId } from '#/api/api.client'
import { handleHealthSnapshot } from '#/features/app/app.event'
import { invalidateImageLists } from '#/features/image/image.cache'
import { handleTaskChanged, handleTaskCreated, handleTaskRemoved } from '#/features/task/task.event'
import { taskKeys } from '#/features/task/task.key'
import { handleWorkflowChanged, handleWorkflowRemoved } from '#/features/workflow/workflow.event'
import { workflowKeys } from '#/features/workflow/workflow.key'
import { appStore } from '#/store/app'

import type { Event } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

export function startServerEvents(queryClient: QueryClient): () => void {
    let hasConnected = false
    const eventsUrl = new URL(createSameOriginEventsUrl())
    eventsUrl.searchParams.set('clientId', clientId)
    const eventClient = createEventClient<Event.ServerEvent>({
        url: eventsUrl.toString(),
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
                /* 斷線期間錯過的事件，相關 domain 都要補 */
                void queryClient.invalidateQueries({ queryKey: taskKeys.all })
                void queryClient.invalidateQueries({ queryKey: workflowKeys.all })
                void invalidateImageLists(queryClient)
                return
            }

            hasConnected = true
        },
        onEvent: serverEvent => {
            handleServerEvent(queryClient, serverEvent)
        },
    })

    eventClient.connect()

    return () => {
        eventClient.close()
    }
}

function handleServerEvent(
    queryClient: QueryClient,
    serverEvent: Event.ServerEvent,
): void {
    switch (serverEvent.type) {
        case 'task.created':
            handleTaskCreated(queryClient, serverEvent)
            return
        case 'task.changed':
            handleTaskChanged(queryClient, serverEvent)
            return
        case 'task.removed':
            handleTaskRemoved(queryClient, serverEvent)
            return
        case 'workflow.changed':
            handleWorkflowChanged(queryClient, serverEvent)
            return
        case 'workflow.removed':
            handleWorkflowRemoved(queryClient, serverEvent)
            return
        case 'health.snapshot':
            handleHealthSnapshot(queryClient, serverEvent)
            return
    }

    throw new Error(`Unhandled server event: ${JSON.stringify(serverEvent)}`)
}
