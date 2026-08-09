import { handleTaskChanged } from '#/features/task/task.event'

import type { Event } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

export function handleServerEvent(
    queryClient: QueryClient,
    serverEvent: Event.ServerEvent,
): void {
    switch (serverEvent.type) {
        case 'task.changed':
            handleTaskChanged(queryClient, serverEvent)
            return
    }
}
