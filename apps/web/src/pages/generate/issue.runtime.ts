import { createMemo } from 'solid-js'

import { useLoraListQuery, useSamplerListQuery, useTaskFeedQuery } from '#/features/task/task.query'
import { useWorkflowListQuery } from '#/features/workflow/workflow.query'
import { toErrorMessage } from '#/lib/error'
import { generateFieldLabel } from '#/pages/generate/issue'
import { useGenerateStore } from '#/pages/generate/store'
import { hasLostConnection, serviceHealth } from '#/store/app'

import type { GenerateIssue } from '#/pages/generate/issue'
import type { Accessor } from 'solid-js'

export function useRuntimeIssues(): Accessor<GenerateIssue[]> {
    const store = useGenerateStore()
    const workflowId = store.form.useSelector(({ values }) => values.workflowId)
    const workflowQuery = useWorkflowListQuery()
    const samplerQuery = useSamplerListQuery()
    const taskFeedQuery = useTaskFeedQuery()
    /* 只讀快取狀態，真正的抓取仍由 Generate detail 的 LoRA picker 開啟時觸發 */
    const loraQuery = useLoraListQuery(() => false)

    /* 清單是全拿的，查不到等同被真刪——那個狀態到不了，留著只是保險 */
    const isSelectedWorkflowUnusable = () => {
        const current = workflowId()

        if (!current) {
            return false
        }

        const selected = workflowQuery.data?.options.find(workflow => workflow.id === current)

        return !selected || selected.archivedAt !== null
    }

    return createMemo(() => {
        const issues: GenerateIssue[] = []

        /*
         * 連不上後端的時候什麼都不知道，不可以謊稱是 ComfyUI 掛了。
         * 其他判斷全部略過——它們的依據都已經不可信。
         */
        if (hasLostConnection()) {
            const lost: GenerateIssue = {
                id: 'server-connection',
                tone: 'error',
                message: 'Lost connection to the server. Reconnecting...',
            }

            return [lost]
        }

        const health = serviceHealth()
        const comfyDown = health?.comfy === false

        if (comfyDown) {
            issues.push({
                id: 'comfy-down',
                tone: 'error',
                field: 'ComfyUI',
                message: 'ComfyUI is not running. Start it.',
            })
        }

        if (workflowQuery.isError) {
            issues.push({
                id: 'workflow-load',
                tone: 'error',
                field: generateFieldLabel.workflowId,
                message: toErrorMessage(workflowQuery.error),
                onRetry: () => { void workflowQuery.refetch() },
            })
        }
        else if (workflowQuery.isSuccess && workflowQuery.data.options.length === 0) {
            issues.push({
                id: 'workflow-empty',
                tone: 'error',
                field: generateFieldLabel.workflowId,
                message: 'No workflows available. Add one in ComfyUI, then retry.',
                onRetry: () => { void workflowQuery.refetch() },
            })
        }
        else if (workflowQuery.isSuccess && isSelectedWorkflowUnusable()) {
            issues.push({
                id: 'workflow-unusable',
                tone: 'error',
                field: generateFieldLabel.workflowId,
                message: 'This workflow is archived and cannot be used. Pick another one to generate.',
            })
        }

        /* ComfyUI 已知掛掉時就不必再逐項重複同一件事 */
        if (!comfyDown && samplerQuery.isError) {
            issues.push({
                id: 'sampler-load',
                tone: 'warning',
                field: generateFieldLabel.sampler,
                message: toErrorMessage(samplerQuery.error),
                onRetry: () => { void samplerQuery.refetch() },
            })
        }

        if (!comfyDown && loraQuery.isError) {
            issues.push({
                id: 'lora-load',
                tone: 'warning',
                field: generateFieldLabel.lora,
                message: toErrorMessage(loraQuery.error),
                onRetry: () => { void loraQuery.refetch() },
            })
        }

        /*
         * 左側清單抓不到不影響出圖，所以是 warning。翻頁失敗也照報——
         * 清單還在畫面上，錯誤講不出口的話使用者只會覺得 Load more 壞了。
         */
        if (taskFeedQuery.isError) {
            issues.push({
                id: 'task-load',
                tone: 'warning',
                field: 'Tasks',
                message: toErrorMessage(taskFeedQuery.error),
                onRetry: () => { void taskFeedQuery.refetch() },
            })
        }

        return mergeByMessage(issues)
    })
}

/*
 * Sampler 和 LoRA 都是跟 ComfyUI 拿的，它一掛就會產生兩則一模一樣的訊息。
 * 同訊息合併成一則、欄位並列，按一次 Retry 補齊全部。
 */
function mergeByMessage(issues: GenerateIssue[]): GenerateIssue[] {
    const merged = new Map<string, GenerateIssue>()

    for (const issue of issues) {
        const existing = merged.get(issue.message)

        if (!existing) {
            merged.set(issue.message, issue)
            continue
        }

        const retries = [existing.onRetry, issue.onRetry].filter(retry => retry !== undefined)

        merged.set(issue.message, {
            ...existing,
            tone: existing.tone === 'error' || issue.tone === 'error' ? 'error' : 'warning',
            field: [existing.field, issue.field].filter(field => field !== undefined).join(', '),
            onRetry: retries.length > 0
                ? () => retries.forEach(retry => retry())
                : undefined,
        })
    }

    return [...merged.values()]
}
