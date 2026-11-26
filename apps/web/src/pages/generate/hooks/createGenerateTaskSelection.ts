import { batch, createEffect, on } from 'solid-js'

import { useTaskDetailQuery, useTaskFeedFirstId, useTaskFeedQuery } from '#/data/task/task.query'
import { createGenerateDetail } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'

/* 選取中的 task 與草稿：組出 detail、沒選取時自動選第一筆或開新草稿、把選取載入表單 */
export function createGenerateTaskSelection() {
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
    const firstTaskId = useTaskFeedFirstId(generateSession.feedFilter)
    createEffect(() => {
        /* feed 更新時重跑；選哪筆由 firstTaskId 讀 cache 決定 */
        void taskFeedQuery.data
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

    return { detail, discardDraft }
}
