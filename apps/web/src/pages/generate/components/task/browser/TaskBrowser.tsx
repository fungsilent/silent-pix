import { createMemo, createReaction, createSignal, Show } from 'solid-js'

import { createThumbnailGrid } from '#/components/image/ThumbnailSize'
import {
    useDeleteDiscardedTasksMutation,
    useDeleteSelectedTasksMutation,
    useTaskFeedQuery,
    useTaskFlagMutation,
} from '#/data/task/task.query'
import { t } from '#/lib/i18n'
import { theme } from '#/lib/theme'
import { createTaskBrowserSelection, taskSelectionLimit } from '#/pages/generate/components/task/browser/createTaskBrowserSelection'
import { TaskBatchDeleteDialog } from '#/pages/generate/components/task/browser/TaskBatchDeleteDialog'
import { TaskBrowserGrid } from '#/pages/generate/components/task/browser/TaskBrowserGrid'
import { TaskBrowserToolbar } from '#/pages/generate/components/task/browser/TaskBrowserToolbar'
import { TaskBrowserViewer } from '#/pages/generate/components/task/browser/TaskBrowserViewer'
import { taskFilterEmptyCopy } from '#/pages/generate/components/task/TaskFilterChips'
import { TaskRail } from '#/pages/generate/components/task/TaskRail'
import { useGenerateSession } from '#/pages/generate/state/session'
import { createIssueSource, toFailureIssue } from '#/store/issue'
import { mergeClasses } from '#/utils/style'

import type { TaskApi } from '@silent-pix/shared'
import type { SelectedFlag } from '#/pages/generate/components/task/browser/TaskBrowserToolbar'
import type { AppIssue } from '#/store/issue'

export function TaskBrowser() {
    const generateSession = useGenerateSession()
    const taskFeedQuery = useTaskFeedQuery(generateSession.feedFilter)
    const flagMutation = useTaskFlagMutation()
    const selectedDeleteMutation = useDeleteSelectedTasksMutation()
    const discardedDeleteMutation = useDeleteDiscardedTasksMutation()
    const [viewerOpen, setViewerOpen] = createSignal(false)
    const closeViewerOnSelectionChange = createReaction(() => setViewerOpen(false))
    const [batchDeleteOpen, setBatchDeleteOpen] = createSignal(false)
    const [batchDeleteScope, setBatchDeleteScope] = createSignal<'selected' | 'discard'>('selected')
    const thumbnailGrid = createThumbnailGrid('silent-pix.task-browser-columns')
    const tasks = createMemo(() => taskFeedQuery.data?.pages.flatMap(page => page.items) ?? [])
    const taskById = createMemo(() => new Map(tasks().map(task => [task.id, task])))
    const taskIds = createMemo(() => tasks().map(task => task.id))
    const selection = createTaskBrowserSelection({
        tasks,
        taskById,
        loaded: () => Boolean(taskFeedQuery.data),
        viewerOpen,
    })
    const { selectedTaskIds, selectionLimitWarning } = selection
    const issues = createMemo<AppIssue[]>(() => {
        const next: AppIssue[] = []

        if (selectionLimitWarning()) {
            next.push({
                id: 'task-selection-limit',
                tone: 'warning',
                field: () => t('fields.selection'),
                message: () => t('task.selectionLimit', { maximum: taskSelectionLimit }),
            })
        }

        next.push(...toFailureIssue('task-flag-error', () => t('task.title'), flagMutation.error, () => flagMutation.reset()))

        return next
    })
    createIssueSource(issues)

    const selectedFlag = createMemo<SelectedFlag>(() => {
        const flags = new Set(selectedTaskIds().map(taskId => {
            const task = taskById().get(taskId)
            return task?.pin ? 'pin' : task?.discard ? 'discard' : 'unflag'
        }))

        return flags.size === 1 ? [...flags][0] : undefined
    })

    const focusTask = (taskId: string) => {
        generateSession.selectTask(taskId)
    }

    const openTask = (taskId: string) => {
        generateSession.selectTask(taskId)
        closeViewerOnSelectionChange(() => generateSession.state.selectedTaskId)
        setViewerOpen(true)
    }

    const changeFilter = (taskFlags: TaskApi.TaskFilterFlag[] | undefined) => {
        selection.clear()
        generateSession.setFeedTaskFlags(taskFlags)
    }

    const changeSearch = (search: string) => {
        selection.clear()
        generateSession.setFeedSearch(search)
    }

    const showPermanentDelete = () => {
        const taskFlags = generateSession.state.feedTaskFlags
        return taskFlags?.length === 1 && taskFlags[0] === 'discard'
    }

    const setSelectedFlags = (flag: TaskApi.TaskFlag | null) => {
        const taskIds = selectedTaskIds()
        if (taskIds.length === 0 || flagMutation.isPending) {
            return
        }

        void flagMutation.mutateAsync({ taskIds, flag })
            .then(selection.clear)
            .catch(() => undefined)
    }

    const openBatchDelete = (scope: 'selected' | 'discard') => {
        if (selectedDeleteMutation.isPending || discardedDeleteMutation.isPending) {
            return
        }

        setBatchDeleteScope(scope)
        setBatchDeleteOpen(true)
    }

    const confirmBatchDelete = async () => {
        if (batchDeleteScope() === 'selected') {
            const taskIds = selectedTaskIds()
            if (taskIds.length === 0) {
                return
            }

            await selectedDeleteMutation.mutateAsync({ scope: 'selected', taskIds })
            selection.clear()
        }
        else {
            const result = await discardedDeleteMutation.mutateAsync()
            selection.remove(result.ids)
        }

        setBatchDeleteOpen(false)
    }

    const deletePending = () => selectedDeleteMutation.isPending || discardedDeleteMutation.isPending

    return (
        <div class={mergeClasses(theme.card, 'flex h-full min-h-0 min-w-0 flex-1 bg-surface')}>
            <TaskRail
                gridActive
                onFilterChange={changeFilter}
            />
            <section
                class='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface'
            >
                <TaskBrowserToolbar
                    search={generateSession.state.feedSearch}
                    selectedCount={selectedTaskIds().length}
                    selectedFlag={selectedFlag()}
                    onSearchChange={changeSearch}
                    onClearSelection={selection.clear}
                    onSetFlags={setSelectedFlags}
                    flagPending={flagMutation.isPending}
                    onDeleteSelected={() => openBatchDelete('selected')}
                    onDeleteAll={() => openBatchDelete('discard')}
                    deletePending={deletePending()}
                    showPermanentDelete={showPermanentDelete()}
                    thumbnailGrid={thumbnailGrid}
                />

                <TaskBrowserGrid
                    taskIds={taskIds}
                    taskById={taskById}
                    focusedTaskId={() => generateSession.state.selectedTaskId}
                    thumbnailGrid={thumbnailGrid}
                    selectedTaskIds={selectedTaskIds}
                    emptyCopy={taskFilterEmptyCopy(generateSession.feedFilter())}
                    loading={taskFeedQuery.isLoading}
                    hasData={taskFeedQuery.data !== undefined}
                    error={taskFeedQuery.isError}
                    hasNextPage={taskFeedQuery.hasNextPage}
                    fetchingNextPage={taskFeedQuery.isFetchingNextPage}
                    fetching={taskFeedQuery.isFetching}
                    flagPending={flagMutation.isPending}
                    onRetry={() => void taskFeedQuery.refetch()}
                    onFetchNextPage={() => void taskFeedQuery.fetchNextPage()}
                    onSelectionChange={selection.applyDrag}
                    onFocusTask={focusTask}
                    onOpenViewer={openTask}
                    onToggleSelected={selection.toggle}
                    onFlagChange={(taskId, flag) => {
                        if (!flagMutation.isPending) {
                            flagMutation.mutate({ taskIds: [taskId], flag })
                        }
                    }}
                />

                <Show when={viewerOpen()}>
                    <TaskBrowserViewer
                        flagPending={flagMutation.isPending}
                        onFlagChange={(taskId, flag) => flagMutation.mutate({ taskIds: [taskId], flag })}
                        onClose={() => setViewerOpen(false)}
                    />
                </Show>
                <Show when={batchDeleteOpen()}>
                    <TaskBatchDeleteDialog
                        open={batchDeleteOpen()}
                        scope={batchDeleteScope()}
                        selectedCount={selectedTaskIds().length}
                        pending={deletePending()}
                        onOpenChange={setBatchDeleteOpen}
                        onConfirm={confirmBatchDelete}
                    />
                </Show>
            </section>
        </div>
    )
}
