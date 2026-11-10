import { Expand, RefreshCw } from 'lucide-solid'
import { createMemo, For, Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { FieldHint } from '#/components/base/FieldHint'
import { Loading } from '#/components/base/Loading'
import { CollapseButton, Panel, PanelContent } from '#/components/base/Panel'
import { useTaskFeedQuery, useTaskFlagMutation } from '#/features/task/task.query'
import { toErrorMessage } from '#/lib/error'
import { t } from '#/lib/i18n'
import { createLoadOnScroll } from '#/lib/loadOnScroll'
import { TaskItem, TaskItemSkeleton } from '#/pages/generate/components/task/list/TaskItem'
import { TaskFilterChips } from '#/pages/generate/components/task/TaskFilterChips'
import { taskStore } from '#/store/task'

import type { TaskApi } from '@silent-pix/shared'

const taskSkeletonRows = [0, 1, 2, 3, 4, 5]

export function TaskList() {
    const taskFeedQuery = useTaskFeedQuery()
    const flagMutation = useTaskFlagMutation()
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
                                classes={{ root: 'size-[30px] shrink-0 p-0' }}
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
                                    <TaskLoadError onRetry={() => void taskFeedQuery.refetch()} />
                                )}
                            >
                                <Show
                                    when={tasks().length > 0}
                                    fallback={(
                                        <Show when={!panel.isCollapsed()}>
                                            <TaskEmptyState values={taskStore.state.feedTaskFlags} />
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

type TaskEmptyStateProps = {
    values: readonly TaskApi.TaskFilterFlag[] | undefined
}

const emptyStateCopy: Record<TaskApi.TaskFilterFlag, { title: string, message: string }> = {
    unflag: {
        title: t('task.empty.unflagTitle'),
        message: t('task.empty.unflagMessage'),
    },
    pin: {
        title: t('task.empty.pinTitle'),
        message: t('task.empty.pinMessage'),
    },
    discard: {
        title: t('task.empty.discardTitle'),
        message: t('task.empty.discardMessage'),
    },
}

function TaskEmptyState(props: TaskEmptyStateProps) {
    const singleFlag = () => props.values?.length === 1
        ? props.values[0]
        : undefined
    const copy = () => {
        const flag = singleFlag()
        if (flag) {
            return emptyStateCopy[flag]
        }

        return props.values === undefined
            ? {
                title: t('task.empty.title'),
                message: t('task.empty.message'),
            }
            : {
                title: t('task.empty.noMatchTitle'),
                message: t('task.empty.filterMessage'),
            }
    }

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
            <p class='m-0 text-xs text-fg-muted'>{t('task.loadFailed')}</p>
            <Button
                type='button'
                classes={{ root: 'h-7 px-2 text-[11px]' }}
                onClick={props.onRetry}
            >
                <RefreshCw
                    size={13}
                    strokeWidth={1.8}
                />
                {t('common.retry')}
            </Button>
        </div>
    )
}
