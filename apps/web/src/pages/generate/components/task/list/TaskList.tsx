import { Expand, Search } from 'lucide-solid'
import { createMemo, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { CollapseButton, Panel, PanelContent } from '#/components/base/Panel'
import { StatusMessage } from '#/components/base/StatusMessage'
import { Text } from '#/components/field/Text'
import { useTaskFeedQuery, useTaskFlagMutation } from '#/features/task/task.query'
import { cn } from '#/lib/cn'
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
            }}
        >
            {panel => (
                <div class='flex h-full min-h-0'>
                    <nav class='flex w-10 shrink-0 flex-col items-center border-r border-line-subtle'>
                        <div class='flex h-12 shrink-0 items-center justify-center'>
                            <CollapseButton
                                collapsed={panel.isCollapsed()}
                                onClick={panel.toggle}
                            />
                        </div>
                        <div class='flex flex-col items-center gap-1'>
                            <TaskFilterChips
                                values={taskStore.state.feedTaskFlags}
                                onChange={taskStore.setFeedTaskFlags}
                                presentation='icon'
                                classes={{ root: 'flex-col px-0 pb-0' }}
                            />
                            <div class='my-1 h-px w-5 bg-line-subtle' />
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
                        </div>
                    </nav>
                    <div class={cn('flex min-h-0 min-w-0 flex-col', panel.isCollapsed() ? 'w-max' : 'w-[250px]')}>
                        <div class='flex h-12 shrink-0 items-center px-2'>
                            <div class='flex w-0 min-w-full'>
                                <Text
                                    label={t('task.search')}
                                    value={taskStore.state.feedSearch}
                                    placeholder={t('task.searchPlaceholder')}
                                    icon={(
                                        <Search
                                            size={14}
                                            strokeWidth={1.7}
                                        />
                                    )}
                                    classes={{ root: 'min-w-0 flex-1', label: 'hidden' }}
                                    onInput={taskStore.setFeedSearch}
                                />
                            </div>
                        </div>
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
                </div>
            )}
        </Panel>
    )
}
