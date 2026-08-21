import type { TaskApi } from '@silent-pix/shared'

export const taskKeys = {
    all: ['tasks'] as const,
    create: () => [...taskKeys.all, 'create'] as const,
    feeds: () => [...taskKeys.all, 'feed'] as const,
    feed: (input: TaskApi.GetTasksQuery) => [...taskKeys.feeds(), input] as const,
    details: () => [...taskKeys.all, 'detail'] as const,
    detail: (request: TaskApi.GetTaskRequest) => [...taskKeys.details(), request] as const,
    snapshots: () => [...taskKeys.all, 'snapshot'] as const,
    snapshot: (taskId: string) => [...taskKeys.snapshots(), taskId] as const,
}
