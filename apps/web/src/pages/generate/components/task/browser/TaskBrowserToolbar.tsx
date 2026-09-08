import { Minimize2, Pin, Search, Trash2 } from 'lucide-solid'
import { Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { IssueChip } from '#/components/base/IssueChip'
import { PanelHeader } from '#/components/base/Panel'
import { Text } from '#/components/field/Text'
import { TaskFilterChips } from '#/pages/generate/components/task/TaskFilterChips'

import type { TaskApi } from '@silent-pix/shared'
import type { AppIssue } from '#/lib/issue'

type TaskBrowserToolbarProps = {
    taskFlags: readonly TaskApi.TaskFilterFlag[] | undefined
    search: string
    selectedCount: number
    issues: AppIssue[]
    issuesOpen: boolean
    onSearchChange: (search: string) => void
    onTaskFlagsChange: (taskFlags: TaskApi.TaskFilterFlag[] | undefined) => void
    onClearSelection: () => void
    onIssuesOpenChange: (open: boolean) => void
    onSetFlags: (flag: TaskApi.TaskFlag | null) => void
    flagPending: boolean
    onDeleteSelected: () => void
    onDeleteAll: () => void
    deletePending: boolean
    showPermanentDelete: boolean
    onCollapse: () => void
}

export function TaskBrowserToolbar(props: TaskBrowserToolbarProps) {
    return (
        <div class='flex shrink-0 flex-col border-b border-line-subtle bg-surface'>
            <PanelHeader
                title='Tasks'
                action={(
                    <div class='flex min-w-0 flex-1 items-center justify-end gap-2'>
                        <Text
                            label='Search tasks'
                            value={props.search}
                            placeholder='task name or task ID...'
                            icon={(
                                <Search
                                    size={14}
                                    strokeWidth={1.7}
                                />
                            )}
                            classes={{ root: 'min-w-0 flex-1', label: 'hidden' }}
                            onInput={props.onSearchChange}
                        />
                        <Button
                            variant='ghost'
                            classes={{ root: 'size-8 shrink-0 p-0' }}
                            onClick={props.onCollapse}
                        >
                            <Minimize2
                                size={16}
                                strokeWidth={1.8}
                            />
                        </Button>
                    </div>
                )}
            />
            <div class='flex min-w-0 flex-wrap items-center gap-2'>
                <TaskFilterChips
                    values={props.taskFlags}
                    onChange={props.onTaskFlagsChange}
                />
                <Show when={props.showPermanentDelete}>
                    <div class='flex shrink-0 items-center pb-1'>
                        <Button
                            variant='danger'
                            disabled={props.deletePending}
                            classes={{ root: 'h-7 px-2 text-[11px]' }}
                            onClick={props.onDeleteAll}
                        >
                            Delete all
                        </Button>
                    </div>
                </Show>
                <Show when={props.selectedCount > 0 || props.issues.length > 0}>
                    <div class='ml-auto flex shrink-0 items-center gap-2 pr-2 pb-1'>
                        <Show when={props.selectedCount > 0}>
                            <span class='text-xs text-fg-muted tabular-nums'>
                                {props.selectedCount} selected
                            </span>
                            <Button
                                variant='ghost'
                                disabled={props.flagPending}
                                classes={{ root: 'h-7 px-2 text-[11px]' }}
                                onClick={props.onClearSelection}
                            >
                                Clear
                            </Button>
                            <Button
                                variant='ghost'
                                disabled={props.flagPending}
                                classes={{ root: 'h-7 px-2 text-[11px]' }}
                                onClick={() => props.onSetFlags(null)}
                            >
                                Unflag
                            </Button>
                            <Button
                                variant='accent'
                                disabled={props.flagPending}
                                classes={{ root: 'h-7 px-2 text-[11px]' }}
                                onClick={() => props.onSetFlags('pin')}
                            >
                                <Pin
                                    size={13}
                                    strokeWidth={1.8}
                                />
                                Pin
                            </Button>
                            <Button
                                variant='danger'
                                disabled={props.flagPending}
                                classes={{ root: 'h-7 px-2 text-[11px]' }}
                                onClick={() => props.onSetFlags('discard')}
                            >
                                <Trash2
                                    size={13}
                                    strokeWidth={1.8}
                                />
                                Discard
                            </Button>
                            <Show when={props.showPermanentDelete}>
                                <Button
                                    variant='danger'
                                    disabled={props.deletePending}
                                    classes={{ root: 'h-7 px-2 text-[11px]' }}
                                    onClick={props.onDeleteSelected}
                                >
                                    Delete {props.selectedCount} tasks...
                                </Button>
                            </Show>
                        </Show>
                        <IssueChip
                            issues={props.issues}
                            open={props.issuesOpen}
                            onOpenChange={props.onIssuesOpenChange}
                        />
                    </div>
                </Show>
            </div>
        </div>
    )
}
