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
                // 寬度由內容決定，只用 min/max 夾住合理範圍
                root: 'w-max border-r border-line max-[720px]:hidden',
                open: 'min-w-[168px] max-w-[320px]',
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
                            content: 'gap-1 px-2 pt-1 pb-3',
                        }}
                    >
                        <Show when={taskFeedQuery.isLoading}>
                            <div class='px-1 py-2 text-xs text-fg-muted'>Loading tasks...</div>
                        </Show>

                        <Show when={taskFeedQuery.isError}>
                            <div class='px-1 py-2 text-xs text-red-300'>Failed to load tasks.</div>
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
                                variant='ghost'
                                classes={{
                                    root: 'mt-1 h-8 w-full justify-center px-3 text-xs',
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
