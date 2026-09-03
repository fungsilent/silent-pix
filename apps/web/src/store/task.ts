import { createStore } from '#/lib/store'

export type TaskFeedFilter = 'all' | 'pinned' | 'discard'

type TaskStoreState = {
    selectedTaskId: string | undefined
    feedFilter: TaskFeedFilter
    feedSearch: string
    browserOpen: boolean
}

const initialState: TaskStoreState = {
    selectedTaskId: undefined,
    feedFilter: 'all',
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

    setFeedFilter(filter: TaskFeedFilter) {
        store.set('feedFilter', filter)
    },

    setFeedSearch(search: string) {
        store.set('feedSearch', search)
    },

    setBrowserOpen(open: boolean) {
        store.set('browserOpen', open)
    },
}))
