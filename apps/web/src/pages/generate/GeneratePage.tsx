import { useQueryClient } from '@tanstack/solid-query'
import { createEffect, createSignal, on, Show } from 'solid-js'

import { ApiError } from '#/api/api.client'
import { useCreateTaskMutation, useTaskDetailQuery, workflowKeys } from '#/features/task/task.query'
import { TaskDetail } from '#/pages/generate/components/config/TaskDetail'
import { TaskList } from '#/pages/generate/components/task/TaskList'
import { Workspace } from '#/pages/generate/components/workspace/Workspace'
import { toSubmitIssue, toValidationIssues } from '#/pages/generate/issue'
import {
    createGenerateStore,
    draftTask,
    generateSchema,
    GenerateStoreProvider,
    toCreateTaskRequest,
    toGenerateValues,
} from '#/pages/generate/store'
import { taskStore } from '#/store/task'

import type { GenerateIssue } from '#/pages/generate/issue'


export function GeneratePage() {
    const queryClient = useQueryClient()
    const taskDetailQuery = useTaskDetailQuery(() => taskStore.state.selectedTaskId)
    const createTaskMutation = useCreateTaskMutation()
    const [submitIssues, setSubmitIssues] = createSignal<GenerateIssue[]>([])
    /* 每次送出都遞增，讓 chip 知道「剛剛按了 Generate」而不只是清單變了 */
    const [submitToken, setSubmitToken] = createSignal(0)
    const activeTask = () => taskStore.state.selectedTaskId
        ? taskDetailQuery.data
        : draftTask
    const generateStore = createGenerateStore(toGenerateValues(draftTask))

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

    const reportIssues = (issues: GenerateIssue[]) => {
        setSubmitIssues(issues)
        setSubmitToken(token => token + 1)
    }

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault()
        setSubmitIssues([])

        const result = generateSchema.safeParse(generateStore.state.values)

        if (!result.success) {
            reportIssues(toValidationIssues(result.error.issues))
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

            reportIssues([toSubmitIssue(error)])
        }
    }

    return (
        <GenerateStoreProvider store={generateStore}>
            <form
                class='flex h-[calc(100dvh-48px)] min-h-0 overflow-hidden'
                onSubmit={event => void handleSubmit(event)}
            >
                <TaskList />
                <Show
                    when={activeTask()}
                    fallback={(
                        <section class='flex min-w-0 flex-1 items-center justify-center bg-canvas text-sm font-bold text-fg-muted'>
                            {taskDetailQuery.isError ? 'Failed to load task detail.' : 'Loading task detail...'}
                        </section>
                    )}
                >
                    {task => (
                        <>
                            <Workspace
                                task={task()}
                                isSubmitting={createTaskMutation.isPending}
                                submitIssues={submitIssues()}
                                submitToken={submitToken()}
                            />
                            <TaskDetail task={task()} />
                        </>
                    )}
                </Show>
            </form>
        </GenerateStoreProvider>
    )
}
