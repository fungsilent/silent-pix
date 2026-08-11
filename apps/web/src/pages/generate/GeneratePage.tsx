import { createEffect, createSignal, Show } from 'solid-js'

import { ApiError } from '#/api/client'
import { useCreateTaskMutation, useTaskDetailQuery } from '#/features/task/task.query'
import { TaskDetail } from '#/pages/generate/components/config/TaskDetail'
import { TaskList } from '#/pages/generate/components/task/TaskList'
import { Workspace } from '#/pages/generate/components/workspace/Workspace'
import {
    createGenerateStore,
    draftTask,
    generateSchema,
    GenerateStoreProvider,
    toCreateTaskRequest,
    toGenerateValues,
} from '#/pages/generate/store'
import { taskStore } from '#/store/task'


export function GeneratePage() {
    const taskDetailQuery = useTaskDetailQuery(() => taskStore.state.selectedTaskId)
    const createTaskMutation = useCreateTaskMutation()
    const [submitError, setSubmitError] = createSignal<string>()
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

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault()
        setSubmitError()

        const result = generateSchema.safeParse(generateStore.state.values)

        if (!result.success) {
            setSubmitError(result.error.issues[0]?.message ?? 'Please check the form values.')
            return
        }

        try {
            const response = await createTaskMutation.mutateAsync(toCreateTaskRequest(result.data))
            taskStore.selectTask(response.id)
        }
        catch (error) {
            setSubmitError(getSubmitError(error))
        }
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
                            <Workspace
                                task={task()}
                                isSubmitting={createTaskMutation.isPending}
                                submitError={submitError()}
                            />
                            <TaskDetail task={task()} />
                        </>
                    )}
                </Show>
            </form>
        </GenerateStoreProvider>
    )
}

function getSubmitError(error: unknown): string {
    if (error instanceof ApiError) {
        switch (error.code) {
            case 'WORKFLOW_NOT_FOUND':
                return 'Workflow is no longer available. Refresh and select it again.'
            default:
                return error.message || 'Failed to create task.'
        }
    }

    if (error instanceof Error && error.message) {
        return error.message
    }

    return 'Failed to create task. Please try again.'
}
