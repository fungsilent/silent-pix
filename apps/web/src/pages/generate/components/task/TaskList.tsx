import { createMemo, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { CollapseButton, Panel, PanelContent, PanelHeader } from '#/components/base/Panel'
import { useTaskFeedQuery } from '#/features/task/task.query'
import { TaskItem } from '#/pages/generate/components/task/TaskItem'
import { taskStore } from '#/store/task'

export function TaskList() {
    const taskFeedQuery = useTaskFeedQuery()
    const tasks = createMemo(() => taskFeedQuery.data?.pages.flatMap(page => page.items) ?? [])

    return (
        <Panel
            classes={{
                root: 'max-[720px]:hidden',
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
                            root: '',
                        }}
                    >
                        <Show when={taskFeedQuery.isLoading}>
                            <div class='px-3 py-2 text-sm text-fg-muted'>Loading tasks...</div>
                        </Show>

                        <Show when={taskFeedQuery.isError}>
                            <div class='px-3 py-2 text-sm text-red-300'>Failed to load tasks.</div>
                        </Show>

                        <For each={tasks()}>
                            {task => (
                                <TaskItem
                                    selected={task.id === taskStore.state.selectedTaskId}
                                    task={task}
                                    thumbnailOnly={panel.isCollapsed()}
                                    onSelect={() => taskStore.selectTask(task.id)}
                                />
                            )}
                        </For>

                        <Show when={taskFeedQuery.hasNextPage}>
                            <Button
                                classes={{
                                    root: 'w-full justify-center border-line bg-elevated px-3 py-2 text-sm',
                                }}
                                disabled={taskFeedQuery.isFetchingNextPage}
                                onClick={() => void taskFeedQuery.fetchNextPage()}
                            >
                                {taskFeedQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
                            </Button>
                        </Show>
                    </PanelContent>
                </div>
            )}
        </Panel>
    )
}
