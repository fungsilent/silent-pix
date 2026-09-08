import { Expand, RefreshCw } from 'lucide-solid'
import { createMemo, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { FieldHint } from '#/components/base/FieldHint'
import { Loading } from '#/components/base/Loading'
import { CollapseButton, Panel, PanelContent, PanelHeader } from '#/components/base/Panel'
import { useTaskFeedQuery, useTaskFlagMutation } from '#/features/task/task.query'
import { toErrorMessage } from '#/lib/error'
import { TaskItem, TaskItemSkeleton } from '#/pages/generate/components/task/list/TaskItem'
import { TaskFilterChips } from '#/pages/generate/components/task/TaskFilterChips'
import { type TaskFeedFilter, taskStore } from '#/store/task'

const taskSkeletonRows = [0, 1, 2, 3, 4, 5]

export function TaskList() {
    const taskFeedQuery = useTaskFeedQuery()
    const flagMutation = useTaskFlagMutation()
    const tasks = createMemo(() => taskFeedQuery.data?.pages.flatMap(page => page.items) ?? [])
    const taskById = createMemo(() => new Map(tasks().map(task => [task.id, task])))
    const taskIds = createMemo(() => tasks().map(task => task.id))
    const selectTask = (taskId: string) => {
        taskStore.selectTask(taskId)
    }

    return (
        <Panel
            classes={{
                root: 'w-max border-r border-line max-[720px]:hidden',
                open: 'w-[250px]',
            }}
        >
            {panel => (
                <div class='flex h-full min-h-0 flex-col'>
                    <PanelHeader
                        title='Tasks'
                        action={(
                            <div class='flex shrink-0 items-center gap-1'>
                                <Button
                                    variant='ghost'
                                    aria-label='Open task browser'
                                    classes={{ root: 'size-8 shrink-0 p-0' }}
                                    onClick={() => taskStore.setBrowserOpen(true)}
                                >
                                    <Expand
                                        size={15}
                                        strokeWidth={1.8}
                                        aria-hidden='true'
                                    />
                                </Button>
                                <CollapseButton
                                    collapsed={panel.isCollapsed()}
                                    onClick={panel.toggle}
                                />
                            </div>
                        )}
                    />
                    <Show when={!panel.isCollapsed()}>
                        <TaskFilterChips
                            value={taskStore.state.feedFilter}
                            onChange={taskStore.setFeedFilter}
                        />
                        <Show when={flagMutation.error}>
                            {error => (
                                <FieldHint
                                    tone='danger'
                                    class='px-3 pb-1'
                                >
                                    {toErrorMessage(error())}
                                </FieldHint>
                            )}
                        </Show>
                    </Show>
                    <PanelContent
                        classes={{
                            content: 'gap-1',
                        }}
                    >
                        <Loading.Swap
                            loading={() => taskFeedQuery.isLoading}
                            fallback={(
                                <For each={taskSkeletonRows}>
                                    {() => (
                                        <TaskItemSkeleton
                                            thumbnailOnly={panel.isCollapsed()}
                                        />
                                    )}
                                </For>
                            )}
                        >
                            <Show
                                when={!taskFeedQuery.isError || taskFeedQuery.data}
                                fallback={(
                                    <TaskLoadError onRetry={() => void taskFeedQuery.refetch()} />
                                )}
                            >
                                <Show
                                    when={tasks().length > 0}
                                    fallback={(
                                        <Show when={!panel.isCollapsed()}>
                                            <TaskEmptyState filter={taskStore.state.feedFilter} />
                                        </Show>
                                    )}
                                >
                                    <For each={taskIds()}>
                                        {taskId => (
                                            <TaskItem
                                                selected={taskId === taskStore.state.selectedTaskId}
                                                task={taskById().get(taskId)!}
                                                thumbnailOnly={panel.isCollapsed()}
                                                onSelect={() => selectTask(taskId)}
                                                onFlagChange={flag => flagMutation.mutate({
                                                    taskIds: [taskId],
                                                    flag,
                                                })}
                                                flagPending={flagMutation.isPending}
                                            />
                                        )}
                                    </For>
                                </Show>

                                <Show when={taskFeedQuery.isError}>
                                    <TaskLoadError onRetry={() => void taskFeedQuery.refetch()} />
                                </Show>
                            </Show>

                            <Show when={taskFeedQuery.hasNextPage}>
                                <Button
                                    variant='ghost'
                                    classes={{
                                        root: 'mt-1 w-full',
                                    }}
                                    disabled={taskFeedQuery.isFetchingNextPage}
                                    onClick={() => void taskFeedQuery.fetchNextPage()}
                                >
                                    {taskFeedQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
                                </Button>
                            </Show>
                        </Loading.Swap>
                    </PanelContent>
                </div>
            )}
        </Panel>
    )
}

type TaskEmptyStateProps = {
    filter: TaskFeedFilter
}

const emptyStateCopy: Record<TaskFeedFilter, { title: string, message: string }> = {
    all: {
        title: 'No tasks yet',
        message: 'Generated tasks will appear here.',
    },
    pin: {
        title: 'No pinned tasks',
        message: 'Pin a task to keep it close at hand.',
    },
    discard: {
        title: 'No discarded tasks',
        message: 'Discarded tasks will appear here for review.',
    },
}

function TaskEmptyState(props: TaskEmptyStateProps) {
    const copy = () => emptyStateCopy[props.filter]

    return (
        <div class='flex flex-col items-center gap-1 px-3 py-8 text-center'>
            <p class='m-0 text-xs font-medium text-fg'>{copy().title}</p>
            <p class='m-0 text-[11px] leading-relaxed text-fg-muted'>{copy().message}</p>
        </div>
    )
}

type TaskLoadErrorProps = {
    onRetry: () => void
}

function TaskLoadError(props: TaskLoadErrorProps) {
    return (
        <div class='flex flex-col items-center gap-2 px-3 py-8 text-center'>
            <p class='m-0 text-xs text-fg-muted'>Failed to load tasks.</p>
            <Button
                type='button'
                classes={{ root: 'h-7 px-2 text-[11px]' }}
                onClick={props.onRetry}
            >
                <RefreshCw
                    size={13}
                    strokeWidth={1.8}
                    aria-hidden='true'
                />
                Retry
            </Button>
        </div>
    )
}
