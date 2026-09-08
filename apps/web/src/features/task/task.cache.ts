import { taskKeys } from '#/features/task/task.key'

import type { Event, ImageApi, TaskApi } from '@silent-pix/shared'
import type { InfiniteData, QueryClient } from '@tanstack/solid-query'

type TaskFeedData = InfiniteData<TaskApi.GetTasksResponse, string | undefined>
type TaskFeedScope = ReturnType<typeof taskKeys.feed>[2]
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
            true,
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
        : updateTaskFeed(current, scope, toTaskListItem(task), true))
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
        : updateTaskFeed(current, scope, toTaskListItem(task), true))
    queryClient.setQueryData<TaskApi.GetTaskResponse>(
        taskKeys.detail({ taskId: task.id }),
        current => updateTaskDetail(current, task),
    )
}

export function cacheTaskFlagsPatched(
    queryClient: QueryClient,
    tasks: TaskApi.TaskFlagState[],
): void {
    for (const task of tasks) {
        const snapshot = queryClient.getQueryData<Event.Task.Snapshot>(
            taskKeys.snapshot(task.id),
        )
        if (snapshot) {
            queryClient.setQueryData<Event.Task.Snapshot>(
                taskKeys.snapshot(task.id),
                { ...snapshot, pin: task.pin, discard: task.discard },
            )
        }

        const detail = queryClient.getQueryData<TaskApi.GetTaskResponse>(
            taskKeys.detail({ taskId: task.id }),
        )
        if (detail) {
            queryClient.setQueryData<TaskApi.GetTaskResponse>(
                taskKeys.detail({ taskId: task.id }),
                { ...detail, pin: task.pin, discard: task.discard },
            )
        }
    }

    const insertionItems = new Map<string, TaskApi.TaskListItem>()

    for (const task of tasks) {
        const snapshot = queryClient.getQueryData<Event.Task.Snapshot>(
            taskKeys.snapshot(task.id),
        )
        if (snapshot) {
            insertionItems.set(task.id, toTaskListItem({
                ...snapshot,
                pin: task.pin,
                discard: task.discard,
            }))
            continue
        }

        const detail = queryClient.getQueryData<TaskApi.GetTaskResponse>(
            taskKeys.detail({ taskId: task.id }),
        )
        if (detail) {
            insertionItems.set(task.id, toTaskListItem({
                ...toTaskSnapshot(detail),
                pin: task.pin,
                discard: task.discard,
            }))
        }
    }

    writeTaskFeeds(queryClient, (current, scope) => {
        if (scope.search) {
            return { data: current, invalidate: true }
        }

        let result: FeedWriteResult = {
            data: current,
            invalidate: false,
        }

        for (const task of tasks) {
            const currentUpdate = updateTaskFeedFlags(result.data, scope, task)
            result = mergeFeedWriteResult(result, currentUpdate)

            if (currentUpdate.found) {
                continue
            }

            const source = insertionItems.get(task.id)
            if (source) {
                result = mergeFeedWriteResult(
                    result,
                    updateTaskFeed(result.data, scope, source, true),
                )
            }
            else if (current && mayMatchTaskFeedFlags(task, scope)) {
                result.invalidate = true
            }
        }

        return result
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
        data: removeFromTaskFeed(current, removedIds),
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

function updateTaskFeed(
    current: TaskFeedData | undefined,
    scope: TaskFeedScope,
    task: TaskApi.TaskListItem,
    insertIfMissing: boolean,
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
            invalidate: insertIfMissing && matchesTaskFeedFlags(task, scope),
        }
    }

    let found = false
    let changed = false
    const pages = current.pages.map(page => {
        const items = page.items.flatMap(currentTask => {
            if (currentTask.id !== task.id) {
                return [currentTask]
            }

            found = true

            if (!matchesTaskFeedFlags(task, scope)) {
                changed = true
                return []
            }

            if (!sameTaskListItem(currentTask, task)) {
                changed = true
                return [task]
            }

            return [currentTask]
        })

        return items.length !== page.items.length
            || items.some((item, index) => item !== page.items[index])
            ? { ...page, items }
            : page
    })

    if (found || !insertIfMissing || !matchesTaskFeedFlags(task, scope)) {
        return {
            data: changed ? { ...current, pages } : current,
            invalidate: false,
        }
    }

    const insertion = insertTask(pages, task)

    return {
        data: insertion.pages ? { ...current, pages: insertion.pages } : current,
        invalidate: insertion.invalidate,
    }
}

type TaskFeedFlagWriteResult = FeedWriteResult & { found: boolean }

function updateTaskFeedFlags(
    current: TaskFeedData | undefined,
    scope: TaskFeedScope,
    task: TaskApi.TaskFlagState,
): TaskFeedFlagWriteResult {
    if (!current) {
        return { data: current, invalidate: false, found: false }
    }

    let found = false
    let changed = false
    const pages = current.pages.map(page => {
        const items = page.items.flatMap(currentTask => {
            if (currentTask.id !== task.id) {
                return [currentTask]
            }

            found = true

            const updatedTask = {
                ...currentTask,
                pin: task.pin,
                discard: task.discard,
            }

            if (!matchesTaskFeedFlags(updatedTask, scope)) {
                changed = true
                return []
            }

            if (currentTask.pin !== task.pin || currentTask.discard !== task.discard) {
                changed = true
                return [updatedTask]
            }

            return [currentTask]
        })

        return items.length !== page.items.length
            || items.some((item, index) => item !== page.items[index])
            ? { ...page, items }
            : page
    })

    return {
        data: changed ? { ...current, pages } : current,
        invalidate: false,
        found,
    }
}

function mergeFeedWriteResult(
    previous: FeedWriteResult,
    next: FeedWriteResult,
): FeedWriteResult {
    return {
        data: next.data,
        invalidate: previous.invalidate || next.invalidate,
    }
}

function matchesTaskFeedFlags(
    item: TaskApi.TaskListItem,
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

function mayMatchTaskFeedFlags(
    task: TaskApi.TaskFlagState,
    scope: TaskFeedScope,
): boolean {
    return scope.taskFlags === undefined || scope.taskFlags.some(flag => (
        flag === 'unflag'
            ? !task.pin && !task.discard
            : flag === 'pin'
                ? task.pin
                : task.discard
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
