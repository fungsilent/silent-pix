import { createEffect, Match, on, Switch } from 'solid-js'

import { ApiError } from '#/api/api.client'
import { useCreateTaskMutation, useTaskDetailQuery } from '#/features/task/task.query'
import { useRefreshWorkflowList } from '#/features/workflow/workflow.query'
import { TaskDetail } from '#/pages/generate/components/config/TaskDetail'
import { TaskList } from '#/pages/generate/components/task/TaskList'
import { CompareDetail } from '#/pages/generate/components/workspace/compare/CompareDetail'
import { Workspace } from '#/pages/generate/components/workspace/Workspace'
import { createGenerateDetail, GenerateDetailProvider } from '#/pages/generate/detail'
import { draftTask, toCreateTaskRequest } from '#/pages/generate/form'
import { toSubmitIssue } from '#/pages/generate/issue'
import {
    createGenerateStore,
    GenerateStoreProvider,
} from '#/pages/generate/store'
import { taskStore } from '#/store/task'
import { workspaceStore } from '#/store/workspace'

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

        if (isSubmitting()) {
            return
        }

        generateStore.clearSubmitIssues()

        try {
            await generateStore.form.handleSubmit()
        }
        catch (error) {
            if (error instanceof ApiError && error.code === 'WORKFLOW_NOT_FOUND') {
                refreshWorkflowList()
            }

            generateStore.reportSubmitIssues([toSubmitIssue(error)])
        }
    }

    return (
        <GenerateStoreProvider store={generateStore}>
            <GenerateDetailProvider value={detail}>
                <form
                    class='flex h-[calc(100dvh-48px)] min-h-0 overflow-hidden'
                    onSubmit={event => void handleSubmit(event)}
                >
                    <TaskList />
                    <Workspace />
                    <Switch>
                        <Match when={workspaceStore.state.mode === 'generate'}>
                            <TaskDetail mode='create' />
                        </Match>
                        <Match when={workspaceStore.state.mode === 'compare'}>
                            <CompareDetail />
                        </Match>
                    </Switch>
                </form>
            </GenerateDetailProvider>
        </GenerateStoreProvider>
    )
}
