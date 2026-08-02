import { createEffect, Show } from 'solid-js'

import { useTaskDetailQuery } from '#/features/task/task.query'
import { TaskDetail } from '#/pages/generate/components/config/TaskDetail'
import { TaskList } from '#/pages/generate/components/task/TaskList'
import { Workspace } from '#/pages/generate/components/workspace/Workspace'
import { createGenerateStore, draftTask, GenerateSchema, GenerateStoreProvider, toGenerateValues } from '#/pages/generate/store'
import { taskStore } from '#/store/task'

import type { GenerateValues } from '#/pages/generate/store'

export function GeneratePage() {
    const taskDetailQuery = useTaskDetailQuery(() => taskStore.state.selectedTaskId)
    const activeTask = () => taskStore.state.selectedTaskId
        ? taskDetailQuery.data
        : draftTask
    const generateStore = createGenerateStore(toGenerateValues(draftTask))

    createEffect(() => {
        const task = activeTask()

        if (task) {
            generateStore.loadTask(task)
        }
    })

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
                <Show
                    when={activeTask()}
                    fallback={(
                        <section class='flex min-w-0 flex-1 items-center justify-center bg-[#0e131a] text-sm font-bold text-[#9fb0c7]'>
                            {taskDetailQuery.isError ? 'Failed to load task detail.' : 'Loading task detail...'}
                        </section>
                    )}
                >
                    {task => (
                        <>
                            <Workspace task={task()} />
                            <TaskDetail task={task()} />
                        </>
                    )}
                </Show>
            </form>
        </GenerateStoreProvider>
    )
}