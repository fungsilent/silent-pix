import { createStore } from '#/lib/store'
import { tasks, tasksDetail } from '#/temp/task'

import type { TaskDetail, TaskItemData } from '#/temp/task'

const draftTask: TaskDetail = {
    id: '#',
    name: '',
    status: null,
    createdAt: null,
    workflow: 'anime-xl-v1',
    config: {
        seed: '',
        steps: 40,
        cfg: 4,
        width: 1536,
        height: 1536,
        batch: 1,
        sampler: 'dpmpp-2m-karras',
    },
    lora: [],
    prompt: {
        negative: [
            {
                id: 'draft-negative-quality',
                label: 'Quality',
                text: 'low quality, worst quality, lowres, blurry',
            },
        ],
        positive: [
            {
                id: 'draft-positive-quality',
                label: 'Quality',
                text: 'masterpiece, best quality, ultra detailed',
            },
        ],
    },
    images: [],
}

type TaskStoreState = {
    activeTask: TaskDetail
    draftTask: TaskDetail
    selectedTask: TaskDetail | undefined
    selectedTaskId: string | undefined
    taskDetails: TaskDetail[]
    tasks: TaskItemData[]
}

const initialState: TaskStoreState = {
    activeTask: draftTask,
    draftTask,
    selectedTask: undefined,
    selectedTaskId: undefined,
    taskDetails: tasksDetail,
    tasks,
}

export const taskStore = createStore(initialState, store => ({
    clearTask() {
        store.set({
            activeTask: store.state.draftTask,
            selectedTask: undefined,
            selectedTaskId: undefined,
        })
    },

    selectTask(taskId: string) {
        const selectedTask = store.state.taskDetails.find(task => task.id === taskId)

        store.set({
            activeTask: selectedTask ?? store.state.draftTask,
            selectedTask,
            selectedTaskId: taskId,
        })
    },
}))
