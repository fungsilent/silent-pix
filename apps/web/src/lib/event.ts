import { handleHealthSnapshot } from '#/features/app/app.event'
import { handleTaskChanged, handleTaskCreated, handleTaskRemoved } from '#/features/task/task.event'
import { handleWorkflowChanged, handleWorkflowRemoved } from '#/features/workflow/workflow.event'

import type { Event } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

export function handleServerEvent(
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
}
