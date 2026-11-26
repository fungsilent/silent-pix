import { createSignal, onCleanup } from 'solid-js'

import { ApiError, networkErrorCode } from '#/lib/api-client'
import { toErrorMessage } from '#/lib/error'

import type { Accessor } from 'solid-js'

/*
 * error   擋住送出，沒有這個就按不出東西
 * warning 降級，表單仍可送出，只是少了某些選項
 */
export type IssueTone = 'error' | 'warning'

export type AppIssue = {
    id: string
    tone: IssueTone
    field?: (() => string | undefined) | undefined
    message: () => string
    onRetry?: (() => void) | undefined
    onDismiss?: (() => void) | undefined
}

const toneOrder: Record<IssueTone, number> = {
    error: 0,
    warning: 1,
}

/* 紅色排在琥珀之前；同色維持原順序 */
export function sortIssues<TIssue extends AppIssue>(issues: TIssue[]): TIssue[] {
    return [...issues].sort((left, right) => toneOrder[left.tone] - toneOrder[right.tone])
}

/*
 * 整個 App 只有 Header 一個 Issue chip。頁面或面板在自己存活期間登記問題來源，
 * 卸載時自動移除，所以離開該頁時它的問題也一併消失。
 */
const [sources, setSources] = createSignal<Accessor<AppIssue[]>[]>([])
const [open, setOpen] = createSignal(false)

export function createIssueSource(source: Accessor<AppIssue[]>): void {
    setSources(current => [...current, source])
    onCleanup(() => setSources(current => current.filter(item => item !== source)))
}

/* 同一句只列一次（例如多個操作因同一原因失敗） */
export function appIssues(): AppIssue[] {
    const seen = new Set<string>()

    return sortIssues(sources().flatMap(source => source())).filter(issue => {
        const message = issue.message()
        if (seen.has(message)) return false
        seen.add(message)
        return true
    })
}

export const issueList = {
    open,
    setOpen,
}

export function toFailureIssue(
    id: string,
    field: () => string,
    error: unknown,
    onDismiss: () => void,
): AppIssue[] {
    if (!error || (error instanceof ApiError && error.code === networkErrorCode)) {
        return []
    }

    return [{
        id,
        tone: 'error',
        field,
        message: () => toErrorMessage(error),
        onDismiss,
    }]
}
