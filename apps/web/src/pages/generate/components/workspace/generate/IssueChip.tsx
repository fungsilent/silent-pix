import { Popover } from '@ark-ui/solid'
import { ChevronDown, RefreshCw, TriangleAlert } from 'lucide-solid'
import { For, Show } from 'solid-js'
import { Portal } from 'solid-js/web'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'
import { sortIssues } from '#/pages/generate/issue'

import type { GenerateIssue, IssueTone } from '#/pages/generate/issue'

type IssueChipProps = {
    issues: GenerateIssue[]
    open: boolean
    onOpenChange: (open: boolean) => void
}

/* 染色容器沿用 TaskStatus badge 與 Header 服務狀態既有的語彙 */
const chipToneClass: Record<IssueTone, string> = {
    error: 'border-red-500/25 bg-red-500/12 text-red-300 hover:bg-red-500/[0.18]',
    warning: 'border-amber-500/25 bg-amber-500/12 text-amber-300 hover:bg-amber-500/[0.18]',
}

const iconToneClass: Record<IssueTone, string> = {
    error: 'text-red-300',
    warning: 'text-amber-300',
}

export function IssueChip(props: IssueChipProps) {
    const issues = () => sortIssues(props.issues)
    const count = () => props.issues.length
    /* 只要有一則是 error，整個 chip 就是紅的 */
    const tone = (): IssueTone => props.issues.some(issue => issue.tone === 'error') ? 'error' : 'warning'
    const label = () => count() === 1
        ? props.issues[0]?.message ?? ''
        : `${count()} issues`

    return (
        <Show when={count() > 0}>
            <Popover.Root
                open={props.open}
                positioning={{ placement: 'bottom-end', gutter: 6 }}
                onOpenChange={details => props.onOpenChange(details.open)}
            >
                <Popover.Trigger
                    aria-label={`${count()} generate ${count() === 1 ? 'issue' : 'issues'}`}
                    class={cn(
                        'issue-chip group flex h-7 min-w-0 cursor-pointer items-center gap-1.5 rounded-md border pl-[9px] pr-2 text-xs leading-none outline-none transition-colors duration-[140ms] ease-out focus-visible:ring-3 focus-visible:ring-accent/40',
                        chipToneClass[tone()],
                    )}
                >
                    <TriangleAlert
                        class='shrink-0'
                        size={13}
                        strokeWidth={2}
                        aria-hidden='true'
                    />
                    {/* 窄視窗兩側面板已經隱藏，標題列塞不下完整句子，只留計數 */}
                    <span class='hidden shrink-0 font-semibold tabular-nums max-[980px]:inline'>
                        {count()}
                    </span>
                    <span class='min-w-0 truncate max-[980px]:hidden'>
                        {label()}
                    </span>
                    <ChevronDown
                        class='shrink-0 opacity-70 transition-transform duration-[140ms] ease-out group-data-[state=open]:rotate-180'
                        size={12}
                        strokeWidth={2.2}
                        aria-hidden='true'
                    />
                </Popover.Trigger>

                {/* PromptPanel 是 overflow-hidden，浮層必須 portal 出去才不會被裁掉 */}
                <Portal>
                    <Popover.Positioner class='z-50'>
                        <Popover.Content class='issue-popover w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-white/[0.09] bg-surface/95 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.55)] outline-none backdrop-blur-[8px]'>
                            <For each={issues()}>
                                {issue => (
                                    <div class='flex items-start gap-2 px-2.5 py-2 [&+&]:border-t [&+&]:border-line-subtle'>
                                        <TriangleAlert
                                            class={cn('mt-px shrink-0', iconToneClass[issue.tone])}
                                            size={12}
                                            strokeWidth={2}
                                            aria-hidden='true'
                                        />
                                        <div class='flex min-w-0 flex-1 flex-col gap-0.5'>
                                            <Show when={issue.field}>
                                                {field => (
                                                    <span class='font-mono text-[10.5px] uppercase leading-none tracking-[0.06em] text-fg-muted'>
                                                        {field()}
                                                    </span>
                                                )}
                                            </Show>
                                            <span class='text-xs leading-[1.45] text-fg'>
                                                {issue.message}
                                            </span>
                                        </div>
                                        <Show when={issue.onRetry}>
                                            {onRetry => (
                                                <Button
                                                    classes={{ root: 'h-6 shrink-0 gap-1.5 px-2' }}
                                                    onClick={() => onRetry()()}
                                                >
                                                    <RefreshCw
                                                        size={12}
                                                        strokeWidth={1.8}
                                                        aria-hidden='true'
                                                    />
                                                    Retry
                                                </Button>
                                            )}
                                        </Show>
                                    </div>
                                )}
                            </For>
                        </Popover.Content>
                    </Popover.Positioner>
                </Portal>
            </Popover.Root>
        </Show>
    )
}
