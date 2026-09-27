import { taskKeys } from '#/features/task/task.key'

import type { Event, ImageApi, TaskApi } from '@silent-pix/shared'
import type { InfiniteData, QueryClient } from '@tanstack/solid-query'

type TaskFeedData = InfiniteData<TaskApi.GetTasksResponse, string | undefined>
type TaskFeedScope = ReturnType<typeof taskKeys.feed>[2]
type TaskFlagValues = Pick<TaskApi.TaskFlagState, 'pin' | 'discard'>
type FeedWriteResult = {
    data: TaskFeedData | undefined
    invalidate: boolean
}

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

    writeTaskFeeds(queryClient, (current, scope) => scope.search
        ? { data: current, invalidate: true }
        : updateTaskFeed(
            current,
            scope,
            toTaskListItem(toTaskSnapshot(task)),
        ))
}

export function cacheTaskCreated(
    queryClient: QueryClient,
    task: Event.Task.Snapshot,
): void {
    queryClient.setQueryData<Event.Task.Snapshot>(
        taskKeys.snapshot(task.id),
        current => current ?? task,
    )

    writeTaskFeeds(queryClient, (current, scope) => scope.search
        ? { data: current, invalidate: true }
        : updateTaskFeed(current, scope, toTaskListItem(task)))
}

export function cacheTaskChanged(
    queryClient: QueryClient,
    task: Event.Task.Snapshot,
): void {
    queryClient.setQueryData<Event.Task.Snapshot>(
        taskKeys.snapshot(task.id),
        task,
    )

    writeTaskFeeds(queryClient, (current, scope) => scope.search
        ? { data: current, invalidate: true }
        : updateTaskFeed(current, scope, toTaskListItem(task)))
    queryClient.setQueryData<TaskApi.GetTaskResponse>(
        taskKeys.detail({ taskId: task.id }),
        current => current ? applySnapshot(current, task) : current,
    )
}

export function cacheTaskFlagsPatched(
    queryClient: QueryClient,
    tasks: TaskApi.TaskFlagState[],
): void {
    const insertionItems = new Map<string, TaskApi.TaskListItem>()

    for (const task of tasks) {
        const snapshot = queryClient.getQueryData<Event.Task.Snapshot>(
            taskKeys.snapshot(task.id),
        )
        if (snapshot) {
            const updatedSnapshot = {
                ...snapshot,
                pin: task.pin,
                discard: task.discard,
            }
            queryClient.setQueryData<Event.Task.Snapshot>(
                taskKeys.snapshot(task.id),
                updatedSnapshot,
            )

            insertionItems.set(task.id, toTaskListItem(updatedSnapshot))
        }

        const detail = queryClient.getQueryData<TaskApi.GetTaskResponse>(
            taskKeys.detail({ taskId: task.id }),
        )
        if (detail) {
            const updatedDetail = {
                ...detail,
                pin: task.pin,
                discard: task.discard,
            }
            queryClient.setQueryData<TaskApi.GetTaskResponse>(
                taskKeys.detail({ taskId: task.id }),
                updatedDetail,
            )

            if (!snapshot) {
                insertionItems.set(
                    task.id,
                    toTaskListItem(toTaskSnapshot(updatedDetail)),
                )
            }
        }
    }

    const flagsById = new Map(tasks.map(task => [task.id, task]))

    writeTaskFeeds(queryClient, (current, scope) => {
        if (scope.search) {
            return { data: current, invalidate: true }
        }

        if (!current || flagsById.size === 0) {
            return { data: current, invalidate: false }
        }

        const missingIds = new Set(flagsById.keys())
        let data = patchTaskFeedItems(current, item => {
            const flags = flagsById.get(item.id)

            if (!flags) {
                return item
            }

            missingIds.delete(item.id)
            const updated = { ...item, pin: flags.pin, discard: flags.discard }

            return matchesTaskFeedFlags(updated, scope) ? updated : undefined
        })
        let invalidate = false

        for (const id of missingIds) {
            const flags = flagsById.get(id)!

            if (!matchesTaskFeedFlags(flags, scope)) {
                continue
            }

            const source = insertionItems.get(id)
            if (!source) {
                invalidate = true
                continue
            }

            const insertion = insertTask(data.pages, source)
            if (insertion.pages) {
                data = { ...data, pages: insertion.pages }
            }
            invalidate ||= insertion.invalidate
        }

        return { data, invalidate }
    })
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

    writeTaskFeeds(queryClient, current => ({
        data: current
            ? patchTaskFeedItems(current, item => removedIds.has(item.id) ? undefined : item)
            : current,
        invalidate: false,
    }))
}

function writeTaskFeeds(
    queryClient: QueryClient,
    writer: (
        current: TaskFeedData | undefined,
        scope: TaskFeedScope,
    ) => FeedWriteResult,
): void {
    for (const [queryKey, current] of queryClient.getQueriesData<TaskFeedData>({
        queryKey: taskKeys.feeds(),
    })) {
        const scope = queryKey[2] as TaskFeedScope

        const result = writer(current, scope)

        if (result.data !== current && result.data !== undefined) {
            queryClient.setQueryData<TaskFeedData>(queryKey, result.data)
        }

        if (result.invalidate) {
            void queryClient.invalidateQueries({
                queryKey,
                exact: true,
            })
        }
    }
}

/* 同一套遍歷保留未變動的 item/page 引用；回傳 undefined 表示移除項目。 */
function patchTaskFeedItems(
    current: TaskFeedData,
    patch: (item: TaskApi.TaskListItem) => TaskApi.TaskListItem | undefined,
): TaskFeedData {
    let changed = false
    const pages = current.pages.map(page => {
        let pageChanged = false
        const items: TaskApi.TaskListItem[] = []

        for (const item of page.items) {
            const updated = patch(item)

            if (!updated) {
                pageChanged = true
            }
            else if (updated === item || sameTaskListItem(item, updated)) {
                items.push(item)
            }
            else {
                pageChanged = true
                items.push(updated)
            }
        }

        if (!pageChanged) {
            return page
        }

        changed = true
        return { ...page, items }
    })

    return changed ? { ...current, pages } : current
}

function updateTaskFeed(
    current: TaskFeedData | undefined,
    scope: TaskFeedScope,
    task: TaskApi.TaskListItem,
): FeedWriteResult {
    if (!current) {
        return { data: current, invalidate: false }
    }

    if (scope.search) {
        return { data: current, invalidate: true }
    }

    if (current.pages.length === 0) {
        return {
            data: current,
            invalidate: matchesTaskFeedFlags(task, scope),
        }
    }

    let found = false
    const data = patchTaskFeedItems(current, item => {
        if (item.id !== task.id) {
            return item
        }

        found = true
        return matchesTaskFeedFlags(task, scope) ? task : undefined
    })

    if (found || !matchesTaskFeedFlags(task, scope)) {
        return { data, invalidate: false }
    }

    const insertion = insertTask(data.pages, task)

    return {
        data: insertion.pages ? { ...data, pages: insertion.pages } : data,
        invalidate: insertion.invalidate,
    }
}

function matchesTaskFeedFlags(
    item: TaskFlagValues,
    scope: TaskFeedScope,
): boolean {
    return scope.taskFlags === undefined || scope.taskFlags.some(flag => (
        flag === 'unflag'
            ? !item.pin && !item.discard
            : flag === 'pin'
                ? item.pin
                : item.discard
    ))
}

function insertTask(
    pages: TaskApi.GetTasksResponse[],
    task: TaskApi.TaskListItem,
): { pages?: TaskApi.GetTasksResponse[], invalidate: boolean } {
    for (const [pageIndex, page] of pages.entries()) {
        const insertAt = page.items.findIndex(item => comesBefore(task, item))

        if (insertAt >= 0) {
            return {
                pages: pages.map((currentPage, index) => index === pageIndex
                    ? {
                        ...currentPage,
                        items: [
                            ...currentPage.items.slice(0, insertAt),
                            task,
                            ...currentPage.items.slice(insertAt),
                        ],
                    }
                    : currentPage),
                invalidate: false,
            }
        }
    }

    const lastPage = pages.at(-1)
    if (!lastPage) {
        return { invalidate: true }
    }

    if (lastPage.nextCursor) {
        return { invalidate: true }
    }

    return {
        pages: pages.map((page, index) => index === pages.length - 1
            ? { ...page, items: [...page.items, task] }
            : page),
        invalidate: false,
    }
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
    if (
        task.name === snapshot.name
        && task.status === snapshot.status
        && task.pin === snapshot.pin
        && task.discard === snapshot.discard
        && sameImages(task.images, snapshot.images)
    ) {
        return task
    }

    return {
        ...task,
        name: snapshot.name,
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
