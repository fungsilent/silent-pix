import { createEffect, on, Show } from 'solid-js'

import { useTaskDetailQuery } from '#/features/task/task.query'
import { GenerateTaskDetail } from '#/pages/generate/components/config/GenerateTaskDetail'
import { TaskBrowser } from '#/pages/generate/components/task/browser/TaskBrowser'
import { TaskList } from '#/pages/generate/components/task/list/TaskList'
import { GenerateWorkspace } from '#/pages/generate/components/workspace/generate/GenerateWorkspace'
import { createGenerateDetail, GenerateDetailProvider } from '#/pages/generate/detail'
import { useGenerateSession } from '#/pages/generate/session'
import { taskStore } from '#/store/task'

export function GeneratePage() {
    const taskDetailQuery = useTaskDetailQuery(() => taskStore.state.selectedTaskId)
    const session = useGenerateSession()
    const acceptedTask = () => {
        const selectedTaskId = taskStore.state.selectedTaskId

        if (!selectedTaskId) {
            return undefined
        }

        return taskDetailQuery.data?.id === selectedTaskId
            ? taskDetailQuery.data
            : undefined
    }
    const detail = createGenerateDetail({
        draft: () => taskStore.state.selectedTaskId === undefined,
        error: () => Boolean(taskStore.state.selectedTaskId)
            && taskDetailQuery.isError
            && acceptedTask() === undefined,
        loading: () => Boolean(taskStore.state.selectedTaskId) && taskDetailQuery.isLoading,
        task: acceptedTask,
        retry: () => void taskDetailQuery.refetch(),
    })

    createEffect(on([detail.task, detail.draft], ([task, draft]) => {
        if (draft) {
            session.loadDraft()
        }
        else if (task) {
            session.loadTask(task)
        }
    }))

    const handleSubmit = (event: SubmitEvent) => {
        event.preventDefault()

        if (!detail.loading()) {
            void session.submit()
        }
    }

    return (
        <GenerateDetailProvider value={detail}>
            <form
                class='flex min-h-0 flex-1 overflow-hidden'
                onKeyDown={event => {
                    if (
                        event.key === 'Enter'
                        && event.target instanceof HTMLInputElement
                        && !event.defaultPrevented
                        && !event.isComposing
                    ) {
                        event.preventDefault()
                    }
                }}
                onSubmit={handleSubmit}
            >
                <Show
                    when={taskStore.state.browserOpen}
                    fallback={(
                        <>
                            <TaskList />
                            <GenerateWorkspace />
                        </>
                    )}
                >
                    <TaskBrowser />
                </Show>
                <GenerateTaskDetail />
            </form>
        </GenerateDetailProvider>
    )
}
