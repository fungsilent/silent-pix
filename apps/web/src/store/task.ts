import { task } from '@silent-pix/shared'

import { createStore } from '#/lib/store'

import type { TaskApi } from '@silent-pix/shared'

type TaskFilterFlag = TaskApi.TaskFilterFlag
const taskFilterFlagOrder = task.filterFlags

type TaskStoreState = {
    selectedTaskId: string | undefined
    feedTaskFlags: TaskFilterFlag[] | undefined
    feedSearch: string
    browserOpen: boolean
}

const initialState: TaskStoreState = {
    selectedTaskId: undefined,
    feedTaskFlags: undefined,
    feedSearch: '',
    browserOpen: false,
}

export const taskStore = createStore(initialState, store => ({
    clearTask() {
        store.set('selectedTaskId', undefined)
    },

    selectTask(taskId: string) {
        store.set('selectedTaskId', taskId)
    },

    setFeedTaskFlags(flags: TaskFilterFlag[] | undefined) {
        const normalized = flags && flags.length > 0 && flags.length < taskFilterFlagOrder.length
            ? taskFilterFlagOrder.filter(flag => flags.includes(flag))
            : undefined
        store.set('feedTaskFlags', normalized)
    },

    setFeedSearch(search: string) {
        store.set('feedSearch', search)
    },

    setBrowserOpen(open: boolean) {
        store.set('browserOpen', open)
    },
}))
