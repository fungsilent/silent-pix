import { createEffect, on, Show } from 'solid-js'

import { ApiError } from '#/api/api.client'
import { useCreateTaskMutation, useTaskDetailQuery } from '#/features/task/task.query'
import { useRefreshWorkflowList } from '#/features/workflow/workflow.query'
import { GenerateTaskDetail } from '#/pages/generate/components/config/GenerateTaskDetail'
import { TaskBrowser } from '#/pages/generate/components/task/browser/TaskBrowser'
import { TaskList } from '#/pages/generate/components/task/list/TaskList'
import { GenerateWorkspace } from '#/pages/generate/components/workspace/generate/GenerateWorkspace'
import { createGenerateDetail, GenerateDetailProvider } from '#/pages/generate/detail'
import { draftTask, toCreateTaskRequest } from '#/pages/generate/form'
import { toSubmitIssue } from '#/pages/generate/issue'
import {
    createGenerateStore,
    GenerateStoreProvider,
} from '#/pages/generate/store'
import { taskStore } from '#/store/task'

export function GeneratePage() {
    const taskDetailQuery = useTaskDetailQuery(() => taskStore.state.selectedTaskId)
    const createTaskMutation = useCreateTaskMutation()
    const refreshWorkflowList = useRefreshWorkflowList()
    const acceptedTask = () => {
        const selectedTaskId = taskStore.state.selectedTaskId

        if (!selectedTaskId) {
            return draftTask
        }

        return taskDetailQuery.data?.id === selectedTaskId
            ? taskDetailQuery.data
            : undefined
    }
    const detail = createGenerateDetail({
        error: () => Boolean(taskStore.state.selectedTaskId)
            && taskDetailQuery.isError
            && acceptedTask() === undefined,
        loading: () => Boolean(taskStore.state.selectedTaskId) && taskDetailQuery.isLoading,
        task: acceptedTask,
    })
    const generateStore = createGenerateStore(draftTask, {
        onSubmit: async values => {
            const response = await createTaskMutation.mutateAsync(toCreateTaskRequest(values))
            taskStore.selectTask(response.id)
        },
    })
    const isSubmitting = generateStore.form.useSelector(state => state.isSubmitting)

    /*
     * 只在「換了另一個 task」時重載，不是每次 detail query 有新資料就重載。
     * loadTask 是整包覆寫 values，所以原本的寫法會讓任何一則 task.changed
     * ——包含正在跑的那個 task 自己的進度更新——把使用者打到一半的表單抹掉。
     */
    createEffect(on(
        () => [taskStore.state.selectedTaskId, taskDetailQuery.data?.id] as const,
        () => {
            /* query refetch 暫時沒有 data 時，保留同一 task 的編輯內容。 */
            const task = detail.task()

            if (task) {
                generateStore.loadTask(task)
            }
        },
    ))

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault()

        if (isSubmitting() || detail.loading()) {
            return
        }

        generateStore.clearSubmitIssues()

        try {
            await generateStore.form.handleSubmit()
        }
        catch (error) {
            const code = error instanceof ApiError ? error.code : undefined

            /* 兩者都代表本地清單過期了 */
            if (code === 'WORKFLOW_NOT_FOUND' || code === 'WORKFLOW_ARCHIVED') {
                refreshWorkflowList()
            }

            if (code === 'WORKFLOW_ARCHIVED') {
                return
            }

            generateStore.reportSubmitIssues([toSubmitIssue(error)])
        }
    }

    return (
        <GenerateStoreProvider store={generateStore}>
            <GenerateDetailProvider value={detail}>
                <form
                    class='flex h-[calc(100dvh-48px)] min-h-0 overflow-hidden'
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
                    onSubmit={event => void handleSubmit(event)}
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
        </GenerateStoreProvider>
    )
}
