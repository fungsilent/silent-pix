import { invalidateImageLists } from '#/features/image/image.cache'
import { cacheTaskChanged, cacheTaskCreated, cacheTasksRemoved } from '#/features/task/task.cache'
import { compareStore } from '#/store/compare'
import { taskStore } from '#/store/task'

import type { Event } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

export function handleTaskChanged(
    queryClient: QueryClient,
    event: Event.Task.Changed,
): void {
    cacheTaskChanged(queryClient, event.task)
    compareStore.updateTaskName(event.task.id, event.task.name)
    invalidateImageLists(queryClient)
}

export function handleTaskCreated(
    queryClient: QueryClient,
    event: Event.Task.Created,
): void {
    cacheTaskCreated(queryClient, event.task)
    invalidateImageLists(queryClient)
}

export function handleTaskRemoved(
    queryClient: QueryClient,
    event: Event.Task.Removed,
): void {
    applyTasksRemoved(queryClient, event.taskIds)
}

export function applyTasksRemoved(
    queryClient: QueryClient,
    taskIds: string[],
): void {
    cacheTasksRemoved(queryClient, taskIds)
    invalidateImageLists(queryClient)

    if (taskIds.includes(taskStore.state.selectedTaskId ?? '')) {
        taskStore.clearTask()
    }
}
