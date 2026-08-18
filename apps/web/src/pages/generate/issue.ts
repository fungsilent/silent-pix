import { useQueryClient } from '@tanstack/solid-query'
import { createMemo } from 'solid-js'

import {
    loraKeys,
    samplerKeys,
    useLoraListQuery,
    useSamplerListQuery,
    useWorkflowListQuery,
    workflowKeys,
} from '#/features/task/task.query'
import { toErrorMessage, toIssueMessage } from '#/lib/error'
import { hasLostConnection, serviceHealth } from '#/store/app'

import type { QueryClient } from '@tanstack/solid-query'
import type { ZodIssue } from '#/lib/error'
import type { GenerateValues } from '#/pages/generate/store'
import type { Accessor } from 'solid-js'

/*
 * error   擋住生成，沒有這個就按不出東西
 * warning 降級，表單仍可送出，只是少了某些選項
 */
export type IssueTone = 'error' | 'warning'

export type GenerateIssue = {
    id: string
    tone: IssueTone
    field?: string | undefined
    message: string
    onRetry?: (() => void) | undefined
}

const fieldLabel: Record<keyof GenerateValues, string> = {
    batch: 'Batch',
    cfg: 'CFG',
    denoise: 'Denoise',
    height: 'Height',
    lora: 'LoRA',
    name: 'Name',
    negative: 'Negative',
    positive: 'Positive',
    sampler: 'Sampler',
    seed: 'Seed',
    steps: 'Steps',
    width: 'Width',
    workflowId: 'Workflow',
}

const toneOrder: Record<IssueTone, number> = {
    error: 0,
    warning: 1,
}

/* 紅色排在琥珀之前；同色維持原順序 */
export function sortIssues(issues: GenerateIssue[]): GenerateIssue[] {
    return [...issues].sort((left, right) => toneOrder[left.tone] - toneOrder[right.tone])
}

export function toValidationIssues(issues: ZodIssue[]): GenerateIssue[] {
    return issues.map((issue, index) => {
        const key = issue.path[0]
        const isKnownField = typeof key === 'string' && key in fieldLabel

        return {
            id: `validation-${index}`,
            tone: 'error',
            field: isKnownField ? fieldLabel[key as keyof GenerateValues] : undefined,
            /* workflowId 空字串會被 z.uuid() 判成格式錯誤，但那不是使用者打錯字 */
            message: key === 'workflowId' ? 'Select a workflow.' : toIssueMessage(issue),
        }
    })
}

export function toSubmitIssue(error: unknown): GenerateIssue {
    return {
        id: 'submit',
        tone: 'error',
        message: toErrorMessage(error),
    }
}

/*
 * 選項清單的問題是從 query 狀態衍生的，不是手動維護的清單
 */
export function useOptionIssues(): Accessor<GenerateIssue[]> {
    const queryClient = useQueryClient()
    const workflowQuery = useWorkflowListQuery()
    const samplerQuery = useSamplerListQuery()
    /* 只讀快取狀態，真正的抓取仍由 LoraDialog 開啟時觸發 */
    const loraQuery = useLoraListQuery(() => false)

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
                field: fieldLabel.workflowId,
                message: toErrorMessage(workflowQuery.error),
                onRetry: refetch(queryClient, workflowKeys.list()),
            })
        }
        else if (workflowQuery.isSuccess && workflowQuery.data.options.length === 0) {
            issues.push({
                id: 'workflow-empty',
                tone: 'error',
                field: fieldLabel.workflowId,
                message: 'No workflows available. Add one in ComfyUI, then retry.',
                onRetry: refetch(queryClient, workflowKeys.list()),
            })
        }

        /* ComfyUI 已知掛掉時就不必再逐項重複同一件事 */
        if (!comfyDown && samplerQuery.isError) {
            issues.push({
                id: 'sampler-load',
                tone: 'warning',
                field: fieldLabel.sampler,
                message: toErrorMessage(samplerQuery.error),
                onRetry: refetch(queryClient, samplerKeys.list()),
            })
        }

        if (!comfyDown && loraQuery.isError) {
            issues.push({
                id: 'lora-load',
                tone: 'warning',
                field: fieldLabel.lora,
                message: toErrorMessage(loraQuery.error),
                onRetry: refetch(queryClient, loraKeys.list()),
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

/* type: 'all' 是必要的——LoRA query 在 dialog 關閉時沒有 active observer */
function refetch(queryClient: QueryClient, queryKey: readonly unknown[]) {
    return () => {
        void queryClient.refetchQueries({ queryKey, type: 'all' })
    }
}
