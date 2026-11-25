import { refreshImageListCache } from '#/data/image/image.cache'
import { removeTaskCache, updateCreatedTaskSnapshotCache, updateTaskSnapshotCache } from '#/data/task/task.cache'
import { compareStore } from '#/store/compare'
import { taskStore } from '#/store/task'

import type { Event } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

export function handleTaskChanged(
    queryClient: QueryClient,
    event: Event.Task.Changed,
): void {
    updateTaskSnapshotCache(queryClient, event.task)
    compareStore.updateTaskName(event.task.id, event.task.name)
    refreshImageListCache(queryClient)
}

export function handleTaskCreated(
    queryClient: QueryClient,
    event: Event.Task.Created,
): void {
    updateCreatedTaskSnapshotCache(queryClient, event.task)
    refreshImageListCache(queryClient)
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
    removeTaskCache(queryClient, taskIds)
    refreshImageListCache(queryClient)

    if (taskIds.includes(taskStore.state.selectedTaskId ?? '')) {
        taskStore.clearTask()
    }
}
