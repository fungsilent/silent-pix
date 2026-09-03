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
    setTaskFlag(taskId: string, flag: TaskFlag, value: boolean): void {
        store.produce('flags', flags => {
            if (value) {
                /* One local flag is the temporary equivalent of server exclusivity. */
                flags[taskId] = flag
            }
            else if (flags[taskId] === flag) {
                delete flags[taskId]
            }
        })
    },

    setTaskFlags(taskIds: string[], flag: TaskFlag, value: boolean): void {
        store.produce('flags', flags => {
            /* Batch operations set every row to one value; they never toggle. */
            taskIds.forEach(taskId => {
                if (value) {
                    flags[taskId] = flag
                }
                else if (flags[taskId] === flag) {
                    delete flags[taskId]
                }
            })
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

export function searchTaskItems(
    tasks: TaskListItemWithShimFlags[],
    search: string,
): TaskListItemWithShimFlags[] {
    const keyword = search.trim().toLowerCase()

    if (!keyword) {
        return tasks
    }

    return tasks.filter(task => (
        task.id.toLowerCase().includes(keyword)
        || task.name?.toLowerCase().includes(keyword) === true
    ))
}

export function setTaskFlag(taskId: string, flag: TaskFlag, value: boolean): void {
    taskShim.setTaskFlag(taskId, flag, value)
}

export function setTaskFlags(taskIds: string[], flag: TaskFlag, value: boolean): void {
    taskShim.setTaskFlags(taskIds, flag, value)
}
