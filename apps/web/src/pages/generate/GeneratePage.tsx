import { batch, createEffect, on, Show } from 'solid-js'

import { useTaskDetailQuery, useTaskFeedQuery } from '#/data/task/task.query'
import { GenerateTaskDetail } from '#/pages/generate/components/config/GenerateTaskDetail'
import { TaskBrowser } from '#/pages/generate/components/task/browser/TaskBrowser'
import { TaskList } from '#/pages/generate/components/task/list/TaskList'
import { GenerateWorkspace } from '#/pages/generate/components/workspace/generate/GenerateWorkspace'
import { createGenerateDetail, GenerateDetailProvider } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'
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
    const sourceTaskQuery = useTaskDetailQuery(session.draftSourceTaskId)

    const detail = createGenerateDetail({
        draft: () => taskStore.state.selectedTaskId === undefined && session.state.draft !== undefined,
        error: () => Boolean(taskStore.state.selectedTaskId)
            && taskDetailQuery.isError
            && acceptedTask() === undefined,
        loading: () => Boolean(taskStore.state.selectedTaskId) && taskDetailQuery.isLoading,
        task: acceptedTask,
        sourceTask: () => taskStore.state.selectedTaskId === undefined ? sourceTaskQuery.data : undefined,
        retry: () => void taskDetailQuery.refetch(),
    })

    const taskFeedQuery = useTaskFeedQuery()
    const firstTaskId = () => taskFeedQuery.data?.pages.find(page => page.items.length > 0)?.items[0]?.id
    createEffect(() => {
        if (taskStore.state.selectedTaskId !== undefined || session.state.draft || taskFeedQuery.isLoading) {
            return
        }

        const taskId = firstTaskId()
        if (taskId) {
            taskStore.selectTask(taskId)
        }
        else if (taskFeedQuery.isSuccess) {
            session.startNewDraft()
        }
    })

    createEffect(on([detail.task, detail.draft], ([task, draft]) => {
        if (draft) {
            session.loadDraft()
        }
        else if (task) {
            session.loadTask(task)
        }
    }))

    const discardDraft = () => {
        batch(() => {
            session.discardDraft()
            const taskId = firstTaskId()
            if (taskId) taskStore.selectTask(taskId)
        })
    }

    const handleSubmit = (event: SubmitEvent) => {
        event.preventDefault()

        if (!detail.loading() && !detail.error()) {
            void session.submit()
        }
    }

    return (
        <GenerateDetailProvider value={detail}>
            <form
                class='flex min-h-0 flex-1 gap-1 overflow-hidden'
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
                            <TaskList onDiscardDraft={discardDraft} />
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
