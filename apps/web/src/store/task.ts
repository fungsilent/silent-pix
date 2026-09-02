import { createStore } from '#/lib/store'

export type TaskFeedFilter = 'all' | 'pinned' | 'discard'

type TaskStoreState = {
    selectedTaskId: string | undefined
    feedFilter: TaskFeedFilter
    feedSearch: string
}

const initialState: TaskStoreState = {
    selectedTaskId: undefined,
    feedFilter: 'all',
    feedSearch: '',
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
}))
