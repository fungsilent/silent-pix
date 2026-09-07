import { taskKeys } from '#/features/task/task.key'

import type { Event, ImageApi, TaskApi } from '@silent-pix/shared'
import type { InfiniteData, QueryClient } from '@tanstack/solid-query'

type TaskFeedData = InfiniteData<TaskApi.GetTasksResponse, string | undefined>

export function cacheCreatedTaskResponse(
    queryClient: QueryClient,
    task: TaskApi.CreateTaskResponse,
): void {
    const latestSnapshot = queryClient.getQueryData<Event.Task.Snapshot>(
        taskKeys.snapshot(task.id),
    )
    const currentTask = latestSnapshot
        ? applySnapshot(task, latestSnapshot)
        : task

    queryClient.setQueryData<TaskApi.GetTaskResponse>(
        taskKeys.detail({ taskId: task.id }),
        current => current ?? currentTask,
    )
    cacheTaskCreated(queryClient, latestSnapshot ?? toTaskSnapshot(task))
}

export function cacheTaskRenamed(
    queryClient: QueryClient,
    task: TaskApi.RenameTaskResponse,
): void {
    queryClient.setQueryData<TaskApi.GetTaskResponse>(
        taskKeys.detail({ taskId: task.id }),
        task,
    )
    queryClient.setQueryData<Event.Task.Snapshot>(
        taskKeys.snapshot(task.id),
        toTaskSnapshot(task),
    )

    const listItem = toTaskListItem(toTaskSnapshot(task))
    queryClient.setQueriesData<TaskFeedData>(
        { queryKey: taskKeys.feeds() },
        current => updateTaskFeed(current, listItem, false),
    )
}

export function cacheTaskCreated(
    queryClient: QueryClient,
    task: Event.Task.Snapshot,
): void {
    queryClient.setQueryData<Event.Task.Snapshot>(
        taskKeys.snapshot(task.id),
        current => current ?? task,
    )
    const listItem = toTaskListItem(task)

    queryClient.setQueriesData<TaskFeedData>(
        { queryKey: taskKeys.feeds() },
        current => updateTaskFeed(current, listItem, true),
    )
}

export function cacheTaskChanged(
    queryClient: QueryClient,
    task: Event.Task.Snapshot,
): void {
    queryClient.setQueryData<Event.Task.Snapshot>(
        taskKeys.snapshot(task.id),
        task,
    )
    const listItem = toTaskListItem(task)

    queryClient.setQueriesData<TaskFeedData>(
        { queryKey: taskKeys.feeds() },
        current => updateTaskFeed(current, listItem, false),
    )
    queryClient.setQueryData<TaskApi.GetTaskResponse>(
        taskKeys.detail({ taskId: task.id }),
        current => updateTaskDetail(current, task),
    )
}

export function cacheTasksRemoved(
    queryClient: QueryClient,
    taskIds: string[],
): void {
    const removedIds = new Set(taskIds)

    taskIds.forEach(taskId => {
        queryClient.removeQueries({ queryKey: taskKeys.snapshot(taskId) })
        queryClient.removeQueries({ queryKey: taskKeys.detail({ taskId }) })
    })

    queryClient.setQueriesData<TaskFeedData>(
        { queryKey: taskKeys.feeds() },
        current => removeFromTaskFeed(current, removedIds),
    )
}

function removeFromTaskFeed(
    current: TaskFeedData | undefined,
    taskIds: ReadonlySet<string>,
): TaskFeedData | undefined {
    if (!current) {
        return current
    }

    let found = false
    const pages = current.pages.map(page => {
        const items = page.items.filter(item => !taskIds.has(item.id))

        if (items.length === page.items.length) {
            return page
        }

        found = true
        return { ...page, items }
    })

    return found ? { ...current, pages } : current
}

function toTaskSnapshot(task: TaskApi.GetTaskResponse): Event.Task.Snapshot {
    return {
        id: task.id,
        name: task.name,
        status: task.status,
        pin: task.pin,
        discard: task.discard,
        createdAt: task.createdAt,
        outputCount: task.images.length,
        images: task.images,
    }
}

function applySnapshot(
    task: TaskApi.GetTaskResponse,
    snapshot: Event.Task.Snapshot,
): TaskApi.GetTaskResponse {
    return {
        ...task,
        status: snapshot.status,
        pin: snapshot.pin,
        discard: snapshot.discard,
        images: snapshot.images,
    }
}

function toTaskListItem(task: Event.Task.Snapshot): TaskApi.TaskListItem {
    const thumbnail = task.images[0]?.url

    return {
        id: task.id,
        name: task.name,
        status: task.status,
        pin: task.pin,
        discard: task.discard,
        outputCount: task.outputCount,
        createdAt: task.createdAt,
        ...(thumbnail ? { thumbnail } : {}),
    }
}

function updateTaskFeed(
    current: TaskFeedData | undefined,
    task: TaskApi.TaskListItem,
    insertIfMissing: boolean,
): TaskFeedData | undefined {
    if (!current || current.pages.length === 0) {
        return current
    }

    let found = false
    let changed = false
    const pages = current.pages.map(page => {
        const items = page.items.map(currentTask => {
            if (currentTask.id !== task.id) {
                return currentTask
            }

            found = true
            if (!insertIfMissing && !sameTaskListItem(currentTask, task)) {
                changed = true
                return task
            }

            return currentTask
        })

        return items.some((item, index) => item !== page.items[index])
            ? { ...page, items }
            : page
    })

    if (found) {
        return changed ? { ...current, pages } : current
    }

    if (!insertIfMissing) {
        return current
    }

    const firstPage = pages[0]
    if (!firstPage) {
        return current
    }

    const insertAt = firstPage.items.findIndex(item => comesBefore(task, item))
    const index = insertAt < 0 ? firstPage.items.length : insertAt

    return {
        ...current,
        pages: [
            {
                ...firstPage,
                items: [
                    ...firstPage.items.slice(0, index),
                    task,
                    ...firstPage.items.slice(index),
                ],
            },
            ...pages.slice(1),
        ],
    }
}

function updateTaskDetail(
    current: TaskApi.GetTaskResponse | undefined,
    task: Event.Task.Snapshot,
): TaskApi.GetTaskResponse | undefined {
    if (!current) {
        return current
    }

    if (
        current.status === task.status
        && current.pin === task.pin
        && current.discard === task.discard
        && sameImages(current.images, task.images)
    ) {
        return current
    }

    return {
        ...current,
        status: task.status,
        pin: task.pin,
        discard: task.discard,
        images: task.images,
    }
}

function comesBefore(task: TaskApi.TaskListItem, other: TaskApi.TaskListItem): boolean {
    if (task.createdAt !== other.createdAt) {
        return task.createdAt > other.createdAt
    }

    return task.id > other.id
}

function sameImages(left: ImageApi.ImageResource[], right: ImageApi.ImageResource[]): boolean {
    return left.length === right.length
        && left.every((image, index) => image.id === right[index]?.id)
}

function sameTaskListItem(left: TaskApi.TaskListItem, right: TaskApi.TaskListItem): boolean {
    return left.id === right.id
        && left.name === right.name
        && left.status === right.status
        && left.pin === right.pin
        && left.discard === right.discard
        && left.outputCount === right.outputCount
        && left.createdAt === right.createdAt
        && left.thumbnail === right.thumbnail
}
