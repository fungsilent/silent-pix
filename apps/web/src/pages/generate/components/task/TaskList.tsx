import { createMemo, For, Index, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { CollapseButton, Panel, PanelContent, PanelHeader } from '#/components/base/Panel'
import { useTaskFeedQuery } from '#/features/task/task.query'
import { decorateTask, filterTaskItems, toggleTaskFlag } from '#/features/task/task.shim'
import { TaskFilterChips } from '#/pages/generate/components/task/TaskFilterChips'
import { TaskItem, TaskItemSkeleton } from '#/pages/generate/components/task/TaskItem'
import { type TaskFeedFilter, taskStore } from '#/store/task'

const taskSkeletonRows = [0, 1, 2, 3, 4, 5]

export function TaskList() {
    const taskFeedQuery = useTaskFeedQuery()
    const decoratedTasks = createMemo(() => (
        taskFeedQuery.data?.pages.flatMap(page => page.items).map(decorateTask) ?? []
    ))
    const tasks = createMemo(() => filterTaskItems(
        decoratedTasks(),
        taskStore.state.feedFilter,
    ))
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
                            <CollapseButton
                                collapsed={panel.isCollapsed()}
                                onClick={panel.toggle}
                            />
                        )}
                    />
                    <Show when={!panel.isCollapsed()}>
                        <TaskFilterChips
                            value={taskStore.state.feedFilter}
                            onChange={taskStore.setFeedFilter}
                        />
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
                                when={tasks().length > 0}
                                fallback={(
                                    <Show when={!panel.isCollapsed()}>
                                        <TaskEmptyState filter={taskStore.state.feedFilter} />
                                    </Show>
                                )}
                            >
                                <Index each={tasks()}>
                                    {task => (
                                        <TaskItem
                                            selected={task().id === taskStore.state.selectedTaskId}
                                            task={task()}
                                            thumbnailOnly={panel.isCollapsed()}
                                            onSelect={() => selectTask(task().id)}
                                            onTogglePinned={() => toggleTaskFlag(task().id, 'pinned')}
                                            onToggleDiscard={() => toggleTaskFlag(task().id, 'discard')}
                                        />
                                    )}
                                </Index>
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
    pinned: {
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
