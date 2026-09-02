import { createStore } from '#/lib/store'

import type { TaskApi } from '@silent-pix/shared'
import type { TaskFeedFilter } from '#/store/task'

export type TaskFlag = 'pinned' | 'discard'

export type TaskListItemWithShimFlags = TaskApi.TaskListItem & {
    pinned: boolean
    discard: boolean
    outputCount: number
}

type TaskShimState = {
    flags: Record<string, TaskFlag>
}

const initialState: TaskShimState = {
    flags: {},
}

export const taskShim = createStore(initialState, store => ({
    toggleFlag(taskId: string, flag: TaskFlag): void {
        if (readTaskFlag(taskId) === flag) {
            store.produce('flags', flags => {
                delete flags[taskId]
            })
            return
        }

        store.produce('flags', flags => {
            /* One local flag is the temporary equivalent of server exclusivity. */
            flags[taskId] = flag
        })
    },
}))

export function readTaskFlag(taskId: string): TaskFlag | undefined {
    return taskShim.state.flags[taskId]
}

export function decorateTask(task: TaskApi.TaskListItem): TaskListItemWithShimFlags {
    const flag = readTaskFlag(task.id)

    return {
        ...task,
        pinned: flag === 'pinned',
        discard: flag === 'discard',
        outputCount: task.thumbnail ? 1 : 0,
    }
}

export function filterTaskItems(
    tasks: TaskListItemWithShimFlags[],
    filter: TaskFeedFilter,
): TaskListItemWithShimFlags[] {
    if (filter === 'all') {
        return tasks
    }

    return tasks.filter(task => filter === 'pinned' ? task.pinned : task.discard)
}

export function toggleTaskFlag(taskId: string, flag: TaskFlag): void {
    taskShim.toggleFlag(taskId, flag)
}
