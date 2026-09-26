import {
    FlagOff,
    FlagTriangleRight,
    HeartX,
    Minimize2,
    Search,
    Trash2,
} from 'lucide-solid'
import { Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { IssueChip } from '#/components/base/IssueChip'
import { Text } from '#/components/field/Text'
import { cn } from '#/lib/cn'
import { theme } from '#/lib/theme'
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
            <Bar.Root classes={{ root: 'px-2' }}>
                <Bar.Group>
                    <Bar.Title>Tasks</Bar.Title>
                </Bar.Group>
                <Bar.Actions classes={{ root: 'flex-1 justify-end' }}>
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
                        size='bar'
                        variant='ghost'
                        classes={{ root: 'size-[30px] shrink-0 p-0' }}
                        onClick={props.onCollapse}
                    >
                        <Minimize2
                            size={16}
                            strokeWidth={1.8}
                        />
                    </Button>
                </Bar.Actions>
            </Bar.Root>
            <div class='flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 px-2 pb-1'>
                <TaskFilterChips
                    values={props.taskFlags}
                    onChange={props.onTaskFlagsChange}
                    classes={{ root: 'px-0 pb-0' }}
                />
                <Show when={props.selectedCount > 0 || props.issues.length > 0 || props.showPermanentDelete}>
                    <div class='ml-auto flex min-w-0 flex-wrap items-center justify-end gap-1'>
                        <Show when={props.selectedCount > 0}>
                            <span class='mr-1 text-xs text-fg-muted tabular-nums'>
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
                                <FlagOff
                                    size={13}
                                    strokeWidth={1.8}
                                />
                                Unflag
                            </Button>
                            <Button
                                variant='soft'
                                disabled={props.flagPending}
                                classes={{ root: cn('h-7 px-2 text-[11px]', theme.taskFlag.pin.soft) }}
                                onClick={() => props.onSetFlags('pin')}
                            >
                                <FlagTriangleRight
                                    size={13}
                                    strokeWidth={1.8}
                                />
                                Pin
                            </Button>
                            <Button
                                variant='soft'
                                disabled={props.flagPending}
                                classes={{ root: cn('h-7 px-2 text-[11px]', theme.taskFlag.discard.soft) }}
                                onClick={() => props.onSetFlags('discard')}
                            >
                                <HeartX
                                    size={13}
                                    strokeWidth={1.8}
                                />
                                Discard
                            </Button>
                            <Button
                                tone='danger'
                                disabled={props.deletePending}
                                classes={{ root: 'h-7 px-2 text-[11px]' }}
                                onClick={props.onDeleteSelected}
                            >
                                <Trash2
                                    size={13}
                                    strokeWidth={1.8}
                                />
                                Delete {props.selectedCount} tasks...
                            </Button>
                        </Show>
                        <IssueChip
                            issues={props.issues}
                            open={props.issuesOpen}
                            onOpenChange={props.onIssuesOpenChange}
                        />
                        <Show when={props.showPermanentDelete}>
                            <Show when={props.selectedCount > 0 || props.issues.length > 0}>
                                <div class='mx-1 h-5 w-px bg-line-subtle' />
                            </Show>
                            <Button
                                tone='danger'
                                disabled={props.deletePending}
                                classes={{ root: 'h-7 px-2 text-[11px]' }}
                                onClick={props.onDeleteAll}
                            >
                                <Trash2
                                    size={13}
                                    strokeWidth={1.8}
                                />
                                Delete discarded...
                            </Button>
                        </Show>
                    </div>
                </Show>
            </div>
        </div>
    )
}
