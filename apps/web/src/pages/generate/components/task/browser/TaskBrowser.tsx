import { createEffect, createMemo, createSignal, Show } from 'solid-js'

import {
    useDeleteDiscardedTasksMutation,
    useDeleteSelectedTasksMutation,
    useTaskFeedQuery,
    useTaskFlagMutation,
} from '#/features/task/task.query'
import { t } from '#/lib/i18n'
import { toFailureIssue, useIssueSource } from '#/lib/issue'
import { TaskBatchDeleteDialog } from '#/pages/generate/components/task/browser/TaskBatchDeleteDialog'
import { TaskBrowserGrid } from '#/pages/generate/components/task/browser/TaskBrowserGrid'
import { TaskBrowserToolbar } from '#/pages/generate/components/task/browser/TaskBrowserToolbar'
import { TaskBrowserViewer } from '#/pages/generate/components/task/browser/TaskBrowserViewer'
import { taskFilterEmptyCopy } from '#/pages/generate/components/task/TaskFilterChips'
import { taskStore } from '#/store/task'

import type { TaskApi } from '@silent-pix/shared'
import type { AppIssue } from '#/lib/issue'

const taskSelectionLimit = 200

export function TaskBrowser() {
    const taskFeedQuery = useTaskFeedQuery()
    const flagMutation = useTaskFlagMutation()
    const selectedDeleteMutation = useDeleteSelectedTasksMutation()
    const discardedDeleteMutation = useDeleteDiscardedTasksMutation()
    const [selectedTaskIds, setSelectedTaskIds] = createSignal<string[]>([])
    const [viewerTaskId, setViewerTaskId] = createSignal<string>()
    const [batchDeleteOpen, setBatchDeleteOpen] = createSignal(false)
    const [batchDeleteScope, setBatchDeleteScope] = createSignal<'selected' | 'discard'>('selected')
    const [selectionLimitWarning, setSelectionLimitWarning] = createSignal(false)
    const tasks = createMemo(() => taskFeedQuery.data?.pages.flatMap(page => page.items) ?? [])
    const taskById = createMemo(() => new Map(tasks().map(task => [task.id, task])))
    const taskIds = createMemo(() => tasks().map(task => task.id))
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
    useIssueSource(issues)

    /* Search/filter can make a selected card leave the loaded view. */
    createEffect(() => {
        const visibleIds = new Set(tasks().map(task => task.id))

        setSelectedTaskIds(current => {
            const next = current.filter(id => visibleIds.has(id))
            return next.length === current.length ? current : next
        })
    })

    createEffect(() => {
        if (selectedTaskIds().length < taskSelectionLimit) {
            setSelectionLimitWarning(false)
        }
    })

    const focusTask = (taskId: string) => {
        taskStore.selectTask(taskId)
    }

    const openTask = (taskId: string) => {
        taskStore.selectTask(taskId)
        setViewerTaskId(taskId)
    }

    const applyDragSelection = (ids: string[]) => {
        if (ids.length > taskSelectionLimit) {
            setSelectionLimitWarning(true)
            setSelectedTaskIds(ids.slice(0, taskSelectionLimit))
            return
        }

        setSelectedTaskIds(ids)
    }

    const toggleSelection = (taskId: string) => {
        const current = selectedTaskIds()
        if (current.includes(taskId)) {
            setSelectedTaskIds(current.filter(id => id !== taskId))
            return
        }

        if (current.length >= taskSelectionLimit) {
            setSelectionLimitWarning(true)
            return
        }

        setSelectedTaskIds([...current, taskId])
    }

    const changeFilter = (taskFlags: TaskApi.TaskFilterFlag[] | undefined) => {
        setSelectedTaskIds([])
        setSelectionLimitWarning(false)
        taskStore.setFeedTaskFlags(taskFlags)
    }

    const changeSearch = (search: string) => {
        setSelectedTaskIds([])
        setSelectionLimitWarning(false)
        taskStore.setFeedSearch(search)
    }

    createEffect(() => {
        if (!taskFeedQuery.data) return

        const loaded = taskById()
        const current = selectedTaskIds()
        const kept = current.filter(taskId => loaded.has(taskId))

        if (kept.length !== current.length) {
            setSelectedTaskIds(kept)
        }
    })

    const showPermanentDelete = () => {
        const taskFlags = taskStore.state.feedTaskFlags
        return taskFlags?.length === 1 && taskFlags[0] === 'discard'
    }

    const setSelectedFlags = (flag: TaskApi.TaskFlag | null) => {
        const taskIds = selectedTaskIds()
        if (taskIds.length === 0 || flagMutation.isPending) {
            return
        }

        void flagMutation.mutateAsync({ taskIds, flag })
            .then(() => {
                setSelectedTaskIds([])
                setSelectionLimitWarning(false)
            })
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
            setSelectedTaskIds([])
        }
        else {
            const result = await discardedDeleteMutation.mutateAsync()
            const removedIds = new Set(result.ids)
            setSelectedTaskIds(current => current.filter(taskId => !removedIds.has(taskId)))
        }

        setSelectionLimitWarning(false)
        setBatchDeleteOpen(false)
    }

    const deletePending = () => selectedDeleteMutation.isPending || discardedDeleteMutation.isPending

    return (
        <section
            class='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface'
        >
            <TaskBrowserToolbar
                taskFlags={taskStore.state.feedTaskFlags}
                search={taskStore.state.feedSearch}
                selectedCount={selectedTaskIds().length}
                onSearchChange={changeSearch}
                onTaskFlagsChange={changeFilter}
                onClearSelection={() => {
                    setSelectedTaskIds([])
                    setSelectionLimitWarning(false)
                }}
                onSetFlags={setSelectedFlags}
                flagPending={flagMutation.isPending}
                onDeleteSelected={() => openBatchDelete('selected')}
                onDeleteAll={() => openBatchDelete('discard')}
                deletePending={deletePending()}
                showPermanentDelete={showPermanentDelete()}
                onCollapse={() => taskStore.setBrowserOpen(false)}
            />

            <TaskBrowserGrid
                taskIds={taskIds}
                taskById={taskById}
                focusedTaskId={() => taskStore.state.selectedTaskId}
                selectedTaskIds={selectedTaskIds}
                emptyCopy={taskFilterEmptyCopy()}
                loading={taskFeedQuery.isLoading}
                hasData={taskFeedQuery.data !== undefined}
                error={taskFeedQuery.isError}
                hasNextPage={taskFeedQuery.hasNextPage}
                fetchingNextPage={taskFeedQuery.isFetchingNextPage}
                fetching={taskFeedQuery.isFetching}
                flagPending={flagMutation.isPending}
                onRetry={() => void taskFeedQuery.refetch()}
                onFetchNextPage={() => void taskFeedQuery.fetchNextPage()}
                onSelectionChange={applyDragSelection}
                onFocusTask={focusTask}
                onOpenViewer={openTask}
                onToggleSelected={toggleSelection}
                onFlagChange={(taskId, flag) => {
                    if (!flagMutation.isPending) {
                        flagMutation.mutate({ taskIds: [taskId], flag })
                    }
                }}
            />

            <TaskBrowserViewer
                taskId={viewerTaskId}
                onClose={() => setViewerTaskId(undefined)}
            />
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
    )
}
