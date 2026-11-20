import { FunnelX, Inbox, Search, SearchX } from 'lucide-solid'
import { createMemo, For, Show } from 'solid-js'

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
import { taskFilterEmptyCopy } from '#/pages/generate/components/task/TaskFilterChips'
import { TaskRail } from '#/pages/generate/components/task/TaskRail'
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
                    <TaskRail
                        toggle={(
                            <CollapseButton
                                collapsed={panel.isCollapsed()}
                                onClick={panel.toggle}
                            />
                        )}
                        gridActive={false}
                        onFilterChange={taskStore.setFeedTaskFlags}
                    />
                    <div class={cn('flex min-h-0 min-w-0 flex-col', panel.isCollapsed() ? 'w-[106px]' : 'w-[250px]')}>
                        {/* 透明底線：與 Task browser 工具列同樣是 48px 含 1px 底線，搜尋欄位置與 baseline 一致 */}
                        <div class='flex h-12 shrink-0 items-center border-b border-transparent px-2'>
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
                                            <Show
                                                when={!panel.isCollapsed()}
                                                fallback={<CollapsedEmpty />}
                                            >
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

/* 收合時放不下 StatusMessage：在第一張縮圖的位置放同尺寸虛線方塊，icon 依原因，完整文案放在提示 */
function CollapsedEmpty() {
    const copy = () => taskFilterEmptyCopy()
    const icon = { size: 22, strokeWidth: 1.6 }

    return (
        <div class='flex w-full items-center justify-center rounded-lg border border-transparent p-1.5'>
            <div
                title={`${copy().title} · ${copy().message}`}
                class='grid size-18 shrink-0 place-items-center rounded-md border border-dashed border-line text-fg-muted'
            >
                {taskStore.state.feedSearch.trim() !== ''
                    ? <SearchX {...icon} />
                    : taskStore.state.feedTaskFlags !== undefined
                        ? <FunnelX {...icon} />
                        : <Inbox {...icon} />}
            </div>
        </div>
    )
}
