import { cacheTaskChanged, cacheTaskRemoved } from '#/features/task/task.cache'
import { taskStore } from '#/store/task'

import type { Event } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

export function handleTaskChanged(
    queryClient: QueryClient,
    event: Event.Task.Changed,
): void {
    cacheTaskChanged(queryClient, event.task)
}

export function handleTaskRemoved(
    queryClient: QueryClient,
    event: Event.Task.Removed,
): void {
    applyTaskRemoved(queryClient, event.taskId)
}

export function applyTaskRemoved(
    queryClient: QueryClient,
    taskId: string,
): void {
    cacheTaskRemoved(queryClient, taskId)

    if (taskStore.state.selectedTaskId === taskId) {
        taskStore.clearTask()
    }
}
