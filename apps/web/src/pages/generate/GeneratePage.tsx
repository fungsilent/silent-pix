import { useQueryClient } from '@tanstack/solid-query'
import { createEffect, Match, on, Show, Switch } from 'solid-js'

import { ApiError } from '#/api/api.client'
import { useCreateTaskMutation, useTaskDetailQuery, workflowKeys } from '#/features/task/task.query'
import { TaskDetail } from '#/pages/generate/components/config/TaskDetail'
import { TaskList } from '#/pages/generate/components/task/TaskList'
import { CompareDetail } from '#/pages/generate/components/workspace/compare/CompareDetail'
import { Workspace } from '#/pages/generate/components/workspace/Workspace'
import { toSubmitIssue, toValidationIssues } from '#/pages/generate/issue'
import {
    createGenerateStore,
    draftTask,
    generateSchema,
    GenerateStoreProvider,
    toCreateTaskRequest,
} from '#/pages/generate/store'
import { taskStore } from '#/store/task'
import { workspaceStore } from '#/store/workspace'

export function GeneratePage() {
    const queryClient = useQueryClient()
    const taskDetailQuery = useTaskDetailQuery(() => taskStore.state.selectedTaskId)
    const createTaskMutation = useCreateTaskMutation()
    const activeTask = () => taskStore.state.selectedTaskId
        ? taskDetailQuery.data
        : draftTask
    const generateStore = createGenerateStore(draftTask)

    /*
     * 只在「換了另一個 task」時重載，不是每次 detail query 有新資料就重載。
     * loadTask 是整包覆寫 values，所以原本的寫法會讓任何一則 task.changed
     * ——包含正在跑的那個 task 自己的進度更新——把使用者打到一半的表單抹掉。
     */
    createEffect(on(
        () => activeTask()?.id,
        () => {
            const task = activeTask()

            if (task) {
                generateStore.loadTask(task)
            }
        },
    ))

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault()
        generateStore.clearSubmitIssues()

        const result = generateSchema.safeParse(generateStore.state.values)

        if (!result.success) {
            generateStore.reportSubmitIssues(toValidationIssues(result.error.issues))
            return
        }

        try {
            const response = await createTaskMutation.mutateAsync(toCreateTaskRequest(result.data))
            taskStore.selectTask(response.id)
        }
        catch (error) {
            /* 清單過期是能自動修的，直接刷新，不要只丟一句話叫使用者自己去弄 */
            if (error instanceof ApiError && error.code === 'WORKFLOW_NOT_FOUND') {
                void queryClient.refetchQueries({ queryKey: workflowKeys.list(), type: 'all' })
            }

            generateStore.reportSubmitIssues([toSubmitIssue(error)])
        }
    }

    return (
        <GenerateStoreProvider store={generateStore}>
            <form
                class='flex h-[calc(100dvh-48px)] min-h-0 overflow-hidden'
                onSubmit={event => void handleSubmit(event)}
            >
                <TaskList />
                <Workspace />
                <Switch>
                    <Match when={workspaceStore.state.mode === 'generate'}>
                        <Show when={activeTask()}>
                            {task => (
                                <TaskDetail
                                    mode='create'
                                    task={task()}
                                />
                            )}
                        </Show>
                    </Match>
                    <Match when={workspaceStore.state.mode === 'compare'}>
                        <CompareDetail />
                    </Match>
                </Switch>
            </form>
        </GenerateStoreProvider>
    )
}
