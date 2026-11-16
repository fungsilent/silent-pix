import { ChevronDown, RefreshCw, TriangleAlert, X } from 'lucide-solid'
import { For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Popover } from '#/components/base/Popover'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'
import { sortIssues } from '#/lib/issue'

import type { AppIssue, IssueTone } from '#/lib/issue'

type IssueChipProps = {
    issues: AppIssue[]
    open: boolean
    onOpenChange: (open: boolean) => void
}

const chipToneClass: Record<IssueTone, string> = {
    error: 'border-danger/25 bg-danger/12 text-danger-fg hover:bg-danger/[0.18]',
    warning: 'border-warning/25 bg-warning/12 text-warning-fg hover:bg-warning/[0.18]',
}

const iconToneClass: Record<IssueTone, string> = {
    error: 'text-danger-fg',
    warning: 'text-warning-fg',
}

export function IssueChip(props: IssueChipProps) {
    const issues = () => sortIssues(props.issues)
    /* 只要有一則是 error，整個 chip 就是紅的 */
    const tone = (): IssueTone => props.issues.some(issue => issue.tone === 'error') ? 'error' : 'warning'

    return (
        <Show when={props.issues.length > 0}>
            <Popover
                open={props.open}
                placement='bottom-end'
                classes={{
                    trigger: cn(
                        'issue-chip group flex h-7 shrink-0 items-center gap-1.5 rounded-md border pl-[9px] pr-2 text-xs leading-none transition-colors duration-[140ms] ease-out',
                        chipToneClass[tone()],
                    ),
                    content: 'w-80',
                }}
                trigger={(
                    <>
                        <TriangleAlert
                            class='shrink-0'
                            size={13}
                            strokeWidth={2}
                        />
                        <span class='shrink-0 font-semibold tabular-nums'>
                            {props.issues.length}
                        </span>
                        <ChevronDown
                            class='shrink-0 opacity-70 transition-transform duration-[140ms] ease-out group-data-[state=open]:rotate-180'
                            size={12}
                            strokeWidth={2.2}
                        />
                    </>
                )}
                onOpenChange={props.onOpenChange}
            >
                <For each={issues()}>
                    {issue => (
                        <div class='flex items-start gap-2 px-2.5 py-2 [&+&]:border-t [&+&]:border-line-subtle'>
                            <TriangleAlert
                                class={cn('mt-px shrink-0', iconToneClass[issue.tone])}
                                size={12}
                                strokeWidth={2}
                            />
                            <div class='flex min-w-0 flex-1 flex-col gap-0.5'>
                                <Show when={issue.field?.()}>
                                    {field => (
                                        <span class='font-mono text-[10.5px] uppercase leading-none tracking-[0.06em] text-fg-muted'>
                                            {field()}
                                        </span>
                                    )}
                                </Show>
                                <span class='text-xs leading-[1.45] text-fg'>
                                    {issue.message()}
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
                                        />
                                        {t('common.retry')}
                                    </Button>
                                )}
                            </Show>
                            <Show when={!issue.onRetry && issue.onDismiss}>
                                {onDismiss => (
                                    <Button
                                        variant='ghost'
                                        title={t('common.dismiss')}
                                        classes={{ root: 'size-6 shrink-0 p-0' }}
                                        onClick={() => onDismiss()()}
                                    >
                                        <X
                                            size={13}
                                            strokeWidth={2}
                                        />
                                    </Button>
                                )}
                            </Show>
                        </div>
                    )}
                </For>
            </Popover>
        </Show>
    )
}
