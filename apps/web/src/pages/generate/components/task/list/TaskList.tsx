import { Expand } from 'lucide-solid'
import { createMemo, For, Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { CollapseButton, Panel, PanelContent } from '#/components/base/Panel'
import { StatusMessage } from '#/components/base/StatusMessage'
import { useTaskFeedQuery, useTaskFlagMutation } from '#/features/task/task.query'
import { t } from '#/lib/i18n'
import { toFailureIssue, useIssueSource } from '#/lib/issue'
import { createLoadOnScroll } from '#/lib/loadOnScroll'
import { TaskItem, TaskItemSkeleton } from '#/pages/generate/components/task/list/TaskItem'
import { TaskFilterChips, taskFilterEmptyCopy } from '#/pages/generate/components/task/TaskFilterChips'
import { taskStore } from '#/store/task'

const taskSkeletonRows = [0, 1, 2, 3, 4, 5]

export function TaskList() {
    const taskFeedQuery = useTaskFeedQuery()
    const flagMutation = useTaskFlagMutation()
    useIssueSource(() => toFailureIssue('task-list-flag', () => t('task.title'), flagMutation.error, () => flagMutation.reset()))
    const loadOnScroll = createLoadOnScroll({
        canLoad: () => taskFeedQuery.hasNextPage
            && !taskFeedQuery.isFetching
            && !taskFeedQuery.isError,
        load: () => void taskFeedQuery.fetchNextPage(),
    })
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
                    <Bar.Root classes={{ root: 'px-2' }}>
                        <Bar.Group>
                            <Bar.Title>{t('task.title')}</Bar.Title>
                        </Bar.Group>
                        <Bar.Actions classes={{ root: 'gap-1' }}>
                            <Button
                                size='bar'
                                variant='ghost'
                                title={t('task.expandBrowser')}
                                classes={{ root: 'size-7 shrink-0 p-0' }}
                                onClick={() => taskStore.setBrowserOpen(true)}
                            >
                                <Expand
                                    size={15}
                                    strokeWidth={1.8}
                                />
                            </Button>
                            <CollapseButton
                                collapsed={panel.isCollapsed()}
                                onClick={panel.toggle}
                            />
                        </Bar.Actions>
                    </Bar.Root>
                    <Show when={!panel.isCollapsed()}>
                        <TaskFilterChips
                            values={taskStore.state.feedTaskFlags}
                            onChange={taskStore.setFeedTaskFlags}
                            presentation='icon'
                        />
                    </Show>
                    <PanelContent
                        viewportRef={loadOnScroll.setViewport}
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
                                    <Show when={!panel.isCollapsed()}>
                                        <StatusMessage
                                            kind='load-error'
                                            size='compact'
                                            message={t('task.loadFailed')}
                                            onRetry={() => void taskFeedQuery.refetch()}
                                        />
                                    </Show>
                                )}
                            >
                                <Show
                                    when={tasks().length > 0}
                                    fallback={(
                                        <Show when={!panel.isCollapsed()}>
                                            <StatusMessage
                                                kind='empty'
                                                size='compact'
                                                title={taskFilterEmptyCopy().title}
                                                message={taskFilterEmptyCopy().message}
                                            />
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

                                <Show when={taskFeedQuery.isError && !panel.isCollapsed()}>
                                    <StatusMessage
                                        kind='load-error'
                                        size='compact'
                                        message={t('task.loadFailed')}
                                        onRetry={() => void taskFeedQuery.refetch()}
                                    />
                                </Show>
                            </Show>

                            <Show when={taskFeedQuery.hasNextPage && !taskFeedQuery.isError}>
                                <div
                                    ref={loadOnScroll.setTrigger}
                                    class='py-2 text-center text-xs text-fg-muted'
                                >
                                    {taskFeedQuery.isFetchingNextPage ? t('common.loading') : ''}
                                </div>
                            </Show>
                        </Loading.Swap>
                    </PanelContent>
                </div>
            )}
        </Panel>
    )
}
