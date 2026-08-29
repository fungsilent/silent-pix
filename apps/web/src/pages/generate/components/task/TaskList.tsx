import { createMemo, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { CollapseButton, Panel, PanelContent, PanelHeader } from '#/components/base/Panel'
import { useTaskFeedQuery } from '#/features/task/task.query'
import { TaskItem, TaskItemSkeleton } from '#/pages/generate/components/task/TaskItem'
import { taskStore } from '#/store/task'
import { workspaceStore } from '#/store/workspace'

const taskSkeletonRows = [0, 1, 2, 3, 4, 5]

export function TaskList() {
    const taskFeedQuery = useTaskFeedQuery()
    const tasks = createMemo(() => taskFeedQuery.data?.pages.flatMap(page => page.items) ?? [])
    const hasLoadError = () => taskFeedQuery.isError && taskFeedQuery.data === undefined
    const selectTask = (taskId: string) => {
        taskStore.selectTask(taskId)
        workspaceStore.setMode('generate')
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
                            <Show when={hasLoadError()}>
                                <div class='px-1 py-2 text-xs text-red-300'>Failed to load tasks.</div>
                            </Show>

                            <For each={tasks()}>
                                {task => (
                                    <TaskItem
                                        selected={task.id === taskStore.state.selectedTaskId}
                                        task={task}
                                        thumbnailOnly={panel.isCollapsed()}
                                        onSelect={() => selectTask(task.id)}
                                    />
                                )}
                            </For>

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
