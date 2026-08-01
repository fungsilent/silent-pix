import { createEffect, on } from 'solid-js'

import { TaskDetail } from '#/pages/generate/components/config/TaskDetail'
import { TaskList } from '#/pages/generate/components/task/TaskList'
import { Workspace } from '#/pages/generate/components/workspace/Workspace'
import { createGenerateStore, GenerateSchema, GenerateStoreProvider, toGenerateValues } from '#/pages/generate/store'
import { taskStore } from '#/store/task'

import type { GenerateValues } from '#/pages/generate/store'

export function GeneratePage() {
    const generateStore = createGenerateStore(toGenerateValues(taskStore.state.activeTask))

    createEffect(
        on(
            () => taskStore.state.activeTask.id,
            () => {
                generateStore.loadTask(taskStore.state.activeTask)
            },
            { defer: true },
        ),
    )

    const handleGenerate = (values: GenerateValues) => {
        console.log('Generate form submit', values)
    }

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault()

        const result = GenerateSchema.safeParse(generateStore.state.values)

        if (!result.success) {
            return
        }

        await Promise.resolve(handleGenerate(result.data))
    }

    return (
        <GenerateStoreProvider store={generateStore}>
            <form
                class='flex h-[calc(100dvh-56px)] min-h-0 overflow-hidden'
                onSubmit={event => void handleSubmit(event)}
            >
                <TaskList />
                <Workspace task={taskStore.state.activeTask} />
                <TaskDetail task={taskStore.state.activeTask} />
            </form>
        </GenerateStoreProvider>
    )
}
