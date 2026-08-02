import { createStore } from '#/lib/store'

type TaskStoreState = {
    selectedTaskId: string | undefined
}

const initialState: TaskStoreState = {
    selectedTaskId: undefined,
}

export const taskStore = createStore(initialState, store => ({
    clearTask() {
        store.set('selectedTaskId', undefined)
    },

    selectTask(taskId: string) {
        store.set('selectedTaskId', taskId)
    },
}))