import { refreshImageListCache } from '#/data/image/image.cache'
import { removeTaskCache, updateCreatedTaskSnapshotCache, updateTaskSnapshotCache } from '#/data/task/task.cache'

import type { Event } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

const tasksRemovedListeners = new Set<(taskIds: string[]) => void>()

export function handleTaskChanged(
    queryClient: QueryClient,
    event: Event.Task.Changed,
): void {
    updateTaskSnapshotCache(queryClient, event.task)
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
    tasksRemovedListeners.forEach(listener => listener(taskIds))
}

/* 本 client 的刪除與 task.removed 事件都經 applyTasksRemoved；回傳取消訂閱 */
export function subscribeTasksRemoved(listener: (taskIds: string[]) => void): () => void {
    tasksRemovedListeners.add(listener)
    return () => {
        tasksRemovedListeners.delete(listener)
    }
}
