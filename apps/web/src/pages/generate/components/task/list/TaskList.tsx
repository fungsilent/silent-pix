import { FunnelX, Inbox, Search, SearchX } from 'lucide-solid'
import { createMemo, For, Show } from 'solid-js'

import { Loading } from '#/components/base/Loading'
import { CollapseButton, Panel, PanelContent } from '#/components/base/Panel'
import { StatusMessage } from '#/components/base/StatusMessage'
import { Text } from '#/components/field/Text'
import { useTaskFeedQuery, useTaskFlagMutation } from '#/data/task/task.query'
import { t } from '#/lib/i18n'
import { createLoadOnScroll } from '#/lib/load-on-scroll'
import { theme } from '#/lib/theme'
import { TaskDraftItem, TaskItem, TaskItemSkeleton } from '#/pages/generate/components/task/list/TaskItem'
import { taskFilterEmptyCopy } from '#/pages/generate/components/task/TaskFilterChips'
import { TaskRail } from '#/pages/generate/components/task/TaskRail'
import { useGenerateSession } from '#/pages/generate/state/session'
import { createIssueSource, toFailureIssue } from '#/store/issue'
import { mergeClasses } from '#/utils/style'

import type { TaskFeedFilter } from '#/data/task/task.query'

type TaskListProps = {
    onDiscardDraft: () => void
}

const taskSkeletonRows = [0, 1, 2, 3, 4, 5]
const nextPageSkeletonRows = [0, 1]

export function TaskList(props: TaskListProps) {
    const generateSession = useGenerateSession()
    const taskFeedQuery = useTaskFeedQuery(generateSession.feedFilter)
    const flagMutation = useTaskFlagMutation()
    createIssueSource(() => toFailureIssue('task-list-flag', () => t('task.title'), flagMutation.error, () => flagMutation.reset()))
    const loadOnScroll = createLoadOnScroll({
        canLoad: () => taskFeedQuery.hasNextPage
            && !taskFeedQuery.isFetching
            && !taskFeedQuery.isError,
        load: () => void taskFeedQuery.fetchNextPage(),
    })
    const tasks = createMemo(() => taskFeedQuery.data?.pages.flatMap(page => page.items) ?? [])
    const taskById = createMemo(() => new Map(tasks().map(task => [task.id, task])))
    const taskIds = createMemo(() => tasks().map(task => task.id))
    const draftSourceLabel = () => {
        const source = generateSession.state.draft?.source
        if (source?.kind === 'task') return t('task.draftFrom', { file: `task ${source.taskId.slice(0, 8)}` })
        if (source?.kind === 'metadata') return t('task.draftFrom', { file: source.fileName })
        return t('task.draftNew')
    }

    return (
        <Panel
            classes={{
                root: mergeClasses(theme.card, 'w-max max-[720px]:hidden'),
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
                        onFilterChange={generateSession.setFeedTaskFlags}
                    />
                    <div class={mergeClasses('flex min-h-0 min-w-0 flex-col', panel.isCollapsed() ? 'w-[106px]' : 'w-[250px]')}>
                        {/* 透明底線：與 Task browser 工具列同樣是 48px 含 1px 底線，搜尋欄位置與 baseline 一致 */}
                        <div class='flex h-12 shrink-0 items-center border-b border-transparent px-2'>
                            <div class='flex w-0 min-w-full'>
                                <Text
                                    label={t('task.search')}
                                    value={generateSession.state.feedSearch}
                                    placeholder={t('task.searchPlaceholder')}
                                    icon={(
                                        <Search
                                            size={14}
                                            strokeWidth={1.7}
                                        />
                                    )}
                                    classes={{ root: 'min-w-0 flex-1', label: 'hidden' }}
                                    onInput={generateSession.setFeedSearch}
                                />
                            </div>
                        </div>
                        <PanelContent
                            viewportRef={loadOnScroll.setViewport}
                            classes={{
                                content: 'gap-1',
                            }}
                        >
                            <Show when={generateSession.state.draft}>
                                <TaskDraftItem
                                    selected={generateSession.state.selectedTaskId === undefined}
                                    thumbnailOnly={panel.isCollapsed()}
                                    name={generateSession.draftName()}
                                    source={draftSourceLabel()}
                                    onSelect={() => generateSession.clearTask()}
                                    onDiscard={props.onDiscardDraft}
                                />
                            </Show>
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
                                                fallback={<CollapsedEmpty filter={generateSession.feedFilter()} />}
                                            >
                                                <StatusMessage
                                                    kind='empty'
                                                    size='compact'
                                                    title={taskFilterEmptyCopy(generateSession.feedFilter()).title}
                                                    message={taskFilterEmptyCopy(generateSession.feedFilter()).message}
                                                />
                                            </Show>
                                        )}
                                    >
                                        <For each={taskIds()}>
                                            {taskId => (
                                                <TaskItem
                                                    selected={taskId === generateSession.state.selectedTaskId}
                                                    task={taskById().get(taskId)!}
                                                    thumbnailOnly={panel.isCollapsed()}
                                                    onSelect={() => generateSession.selectTask(taskId)}
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

                                <Show when={taskFeedQuery.isFetchingNextPage}>
                                    <For each={nextPageSkeletonRows}>
                                        {() => <TaskItemSkeleton thumbnailOnly={panel.isCollapsed()} />}
                                    </For>
                                </Show>
                                <Show when={taskFeedQuery.hasNextPage && !taskFeedQuery.isError}>
                                    <div
                                        ref={loadOnScroll.setTrigger}
                                        class='h-px'
                                    />
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
function CollapsedEmpty(props: { filter: TaskFeedFilter }) {
    const copy = () => taskFilterEmptyCopy(props.filter)
    const icon = { size: 22, strokeWidth: 1.6 }

    return (
        <div class='flex w-full items-center justify-center rounded-lg border border-transparent p-1.5'>
            <div
                title={`${copy().title} · ${copy().message}`}
                class='grid size-18 shrink-0 place-items-center rounded-md border border-dashed border-line text-fg-muted'
            >
                {props.filter.search.trim() !== ''
                    ? <SearchX {...icon} />
                    : props.filter.taskFlags !== undefined
                        ? <FunnelX {...icon} />
                        : <Inbox {...icon} />}
            </div>
        </div>
    )
}
