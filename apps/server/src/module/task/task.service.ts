import { done, fail } from '#/lib/service-result'
import { mockTaskDetails, mockTasks } from '#/module/task/task.data'

import type { TaskApi } from '@silent-pix/shared'
import type { ServiceResult } from '#/lib/service-result'

type TaskCursor = {
    createdAt: string
    id: string
}

function isTaskCursor(value: unknown): value is TaskCursor {
    if (!value || typeof value !== 'object') {
        return false
    }

    const cursor = value as Record<string, unknown>

    return typeof cursor.createdAt === 'string'
        && !Number.isNaN(Date.parse(cursor.createdAt))
        && typeof cursor.id === 'string'
}

function compareTasks(left: TaskApi.TaskListItem, right: TaskApi.TaskListItem): number {
    return right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id)
}

function encodeCursor(task: TaskApi.TaskListItem): string {
    const cursor: TaskCursor = {
        createdAt: task.createdAt,
        id: task.id,
    }

    return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url')
}

function decodeCursor(value: string): TaskCursor | undefined {
    try {
        const decoded = Buffer.from(value, 'base64url').toString('utf8')
        const parsed = JSON.parse(decoded) as unknown

        return isTaskCursor(parsed) ? parsed : undefined
    }
    catch {
        return undefined
    }
}

export const taskService = {
    findTasks(query: TaskApi.GetTasksQuery): ServiceResult<TaskApi.GetTasksResponse, 'INVALID_TASK_CURSOR'> {
        const tasks = [...mockTasks].sort(compareTasks)
        let start = 0

        if (query.cursor) {
            const cursor = decodeCursor(query.cursor)

            if (!cursor) {
                return fail('INVALID_TASK_CURSOR')
            }

            const cursorIndex = tasks.findIndex(task => (
                task.createdAt === cursor.createdAt && task.id === cursor.id
            ))

            if (cursorIndex < 0) {
                return fail('INVALID_TASK_CURSOR')
            }

            start = cursorIndex + 1
        }

        const items = tasks.slice(start, start + query.limit)
        const lastItem = items.at(-1)

        if (lastItem && start + items.length < tasks.length) {
            return done({
                items,
                nextCursor: encodeCursor(lastItem),
            })
        }

        return done({ items })
    },

    findTask(request: TaskApi.GetTaskRequest): TaskApi.GetTaskResponse | undefined {
        return mockTaskDetails.find(task => task.id === request.taskId)
    },
}