import { batch, createEffect, on, Show } from 'solid-js'

import { useTaskDetailQuery, useTaskFeedQuery } from '#/data/task/task.query'
import { GenerateTaskDetail } from '#/pages/generate/components/config/GenerateTaskDetail'
import { TaskBrowser } from '#/pages/generate/components/task/browser/TaskBrowser'
import { TaskList } from '#/pages/generate/components/task/list/TaskList'
import { GenerateWorkspace } from '#/pages/generate/components/workspace/generate/GenerateWorkspace'
import { createGenerateDetail, GenerateDetailProvider } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'

export function GeneratePage() {
    const generateSession = useGenerateSession()
    const taskDetailQuery = useTaskDetailQuery(() => generateSession.state.selectedTaskId)
    const acceptedTask = () => {
        const selectedTaskId = generateSession.state.selectedTaskId

        if (!selectedTaskId) {
            return undefined
        }

        return taskDetailQuery.data?.id === selectedTaskId
            ? taskDetailQuery.data
            : undefined
    }
    const sourceTaskQuery = useTaskDetailQuery(generateSession.draftSourceTaskId)

    const detail = createGenerateDetail({
        draft: () => generateSession.state.selectedTaskId === undefined && generateSession.state.draft !== undefined,
        error: () => Boolean(generateSession.state.selectedTaskId)
            && taskDetailQuery.isError
            && acceptedTask() === undefined,
        loading: () => Boolean(generateSession.state.selectedTaskId) && taskDetailQuery.isLoading,
        task: acceptedTask,
        sourceTask: () => generateSession.state.selectedTaskId === undefined ? sourceTaskQuery.data : undefined,
        retry: () => void taskDetailQuery.refetch(),
    })

    const taskFeedQuery = useTaskFeedQuery(generateSession.feedFilter)
    const firstTaskId = () => taskFeedQuery.data?.pages.find(page => page.items.length > 0)?.items[0]?.id
    createEffect(() => {
        if (generateSession.state.selectedTaskId !== undefined || generateSession.state.draft || taskFeedQuery.isLoading) {
            return
        }

        const taskId = firstTaskId()
        if (taskId) {
            generateSession.selectTask(taskId)
        }
        else if (taskFeedQuery.isSuccess) {
            generateSession.startNewDraft()
        }
    })

    createEffect(on([detail.task, detail.draft], ([task, draft]) => {
        if (draft) {
            generateSession.loadDraft()
        }
        else if (task) {
            generateSession.loadTask(task)
        }
    }))

    const discardDraft = () => {
        batch(() => {
            generateSession.discardDraft()
            const taskId = firstTaskId()
            if (taskId) generateSession.selectTask(taskId)
        })
    }

    const handleSubmit = (event: SubmitEvent) => {
        event.preventDefault()

        if (!detail.loading() && !detail.error()) {
            void generateSession.submit()
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
                    when={generateSession.state.browserOpen}
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
