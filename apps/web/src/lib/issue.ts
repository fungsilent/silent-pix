/*
 * error   擋住送出，沒有這個就按不出東西
 * warning 降級，表單仍可送出，只是少了某些選項
 */
export type IssueTone = 'error' | 'warning'

export type AppIssue = {
    id: string
    tone: IssueTone
    field?: string | undefined
    message: string
    onRetry?: (() => void) | undefined
}

const toneOrder: Record<IssueTone, number> = {
    error: 0,
    warning: 1,
}

/* 紅色排在琥珀之前；同色維持原順序 */
export function sortIssues<TIssue extends AppIssue>(issues: TIssue[]): TIssue[] {
    return [...issues].sort((left, right) => toneOrder[left.tone] - toneOrder[right.tone])
}
