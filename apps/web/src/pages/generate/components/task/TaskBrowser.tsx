import { Check, Minimize2, Pin, RefreshCw, Search, Trash2 } from 'lucide-solid'
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { PanelHeader } from '#/components/base/Panel'
import { Text } from '#/components/field/Text'
import { TaskStatus } from '#/components/task/TaskStatus'
import { ImageViewer } from '#/components/viewer/ImageViewer'
import { useTaskFeedQuery } from '#/features/task/task.query'
import {
    decorateTask,
    filterTaskItems,
    searchTaskItems,
    setTaskFlag,
    setTaskFlags,
} from '#/features/task/task.shim'
import { cn } from '#/lib/cn'
import { createDragSelection } from '#/lib/dragSelection'
import { formatDateTime } from '#/lib/format'
import { TaskFilterChips } from '#/pages/generate/components/task/TaskFilterChips'
import { placeholderMap } from '#/pages/generate/components/task/taskPlaceholder'
import { useGenerateDetail } from '#/pages/generate/detail'
import { type TaskFeedFilter, taskStore } from '#/store/task'

import type { TaskFlag, TaskListItemWithShimFlags } from '#/features/task/task.shim'

const taskSkeletonCells = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

export function TaskBrowser() {
    const taskFeedQuery = useTaskFeedQuery()
    const [selectedTaskIds, setSelectedTaskIds] = createSignal<string[]>([])
    const [viewerTaskId, setViewerTaskId] = createSignal<string>()
    const [viewerIndex, setViewerIndex] = createSignal(0)
    const detail = useGenerateDetail()
    let selectionContainerElement: HTMLDivElement | undefined
    const dragSelection = createDragSelection({
        container: () => selectionContainerElement,
        selectedIds: selectedTaskIds,
        onSelectionChange: ids => setSelectedTaskIds(ids),
        itemSelector: '[data-task-card]',
        controlSelector: '[data-marquee-control]',
        getItemId: item => item.dataset.taskId,
    })
    const decoratedTasks = createMemo(() => (
        taskFeedQuery.data?.pages.flatMap(page => page.items).map(decorateTask) ?? []
    ))
    const tasks = createMemo(() => searchTaskItems(
        filterTaskItems(decoratedTasks(), taskStore.state.feedFilter),
        taskStore.state.feedSearch,
    ))
    const taskById = createMemo(() => new Map(tasks().map(task => [task.id, task])))
    const taskIds = createMemo(() => tasks().map(task => task.id))
    const viewerImages = createMemo(() => {
        const id = viewerTaskId()
        const task = detail.task()

        if (!id || detail.loading() || detail.error() || !task || task.id !== id) {
            return []
        }

        return task.images
    })

    /* Search/filter can make a selected card leave the loaded view. */
    createEffect(() => {
        const visibleIds = new Set(tasks().map(task => task.id))

        setSelectedTaskIds(current => {
            const next = current.filter(id => visibleIds.has(id))
            return next.length === current.length ? current : next
        })
    })

    createEffect(() => {
        const count = viewerImages().length

        if (count > 0) {
            setViewerIndex(index => Math.min(index, count - 1))
        }
    })

    const focusTask = (taskId: string) => {
        if (dragSelection.consumeSuppressedClick()) {
            return
        }

        taskStore.selectTask(taskId)
    }

    const openTask = (taskId: string) => {
        if (dragSelection.consumeSuppressedClick()) {
            return
        }

        taskStore.selectTask(taskId)
        setViewerTaskId(taskId)
        setViewerIndex(0)
    }

    const toggleSelection = (taskId: string) => {
        setSelectedTaskIds(current => current.includes(taskId)
            ? current.filter(id => id !== taskId)
            : [...current, taskId])
    }

    const changeFilter = (filter: TaskFeedFilter) => {
        setSelectedTaskIds([])
        taskStore.setFeedFilter(filter)
    }

    const setSelectedFlags = (flag: 'pinned' | 'discard', value: boolean) => {
        setTaskFlags(selectedTaskIds(), flag, value)
        setSelectedTaskIds([])
    }

    const removeSelectedDiscard = () => {
        setSelectedFlags('discard', false)
    }

    const closeViewer = () => {
        setViewerTaskId(undefined)
        setViewerIndex(0)
    }

    return (
        <section
            class='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-surface'
            aria-label='Task browser'
        >
            <TaskBrowserToolbar
                filter={taskStore.state.feedFilter}
                search={taskStore.state.feedSearch}
                selectedCount={selectedTaskIds().length}
                onSearchChange={taskStore.setFeedSearch}
                onFilterChange={changeFilter}
                onClearSelection={() => setSelectedTaskIds([])}
                onSetFlags={setSelectedFlags}
                onRemoveDiscard={removeSelectedDiscard}
                onCollapse={() => taskStore.setBrowserOpen(false)}
            />

            <div
                ref={element => { selectionContainerElement = element }}
                class={cn(
                    'relative min-h-0 flex-1 overflow-y-auto bg-surface',
                    dragSelection.tracking() && 'select-none',
                )}
                onPointerDown={dragSelection.onPointerDown}
            >
                <Show
                    when={!taskFeedQuery.isLoading}
                    fallback={(
                        <div class='grid grid-cols-8 content-start gap-3 p-2'>
                            <For each={taskSkeletonCells}>
                                {() => <TaskCardSkeleton />}
                            </For>
                        </div>
                    )}
                >
                    <Show
                        when={!taskFeedQuery.isError || taskFeedQuery.data}
                        fallback={(
                            <TaskBrowserLoadError onRetry={() => void taskFeedQuery.refetch()} />
                        )}
                    >
                        <div class='grid grid-cols-8 content-start gap-3 p-2'>
                            <Show
                                when={tasks().length > 0}
                                fallback={(
                                    <Show
                                        when={!taskFeedQuery.isError}
                                        fallback={(
                                            <div class='col-span-8'>
                                                <TaskBrowserLoadError onRetry={() => void taskFeedQuery.refetch()} />
                                            </div>
                                        )}
                                    >
                                        <div class='col-span-8'>
                                            <TaskBrowserEmptyState />
                                        </div>
                                    </Show>
                                )}
                            >
                                <For each={taskIds()}>
                                    {taskId => (
                                        <TaskCard
                                            focused={taskId === taskStore.state.selectedTaskId}
                                            checked={selectedTaskIds().includes(taskId)}
                                            task={taskById().get(taskId)!}
                                            onFocusTask={() => focusTask(taskId)}
                                            onOpenViewer={() => openTask(taskId)}
                                            onToggleSelected={() => toggleSelection(taskId)}
                                            onSetPinned={value => setTaskFlag(taskId, 'pinned', value)}
                                            onSetDiscard={value => setTaskFlag(taskId, 'discard', value)}
                                        />
                                    )}
                                </For>
                                <Show when={taskFeedQuery.isError}>
                                    <div class='col-span-8'>
                                        <TaskBrowserLoadError onRetry={() => void taskFeedQuery.refetch()} />
                                    </div>
                                </Show>
                            </Show>
                            <Show when={taskFeedQuery.hasNextPage}>
                                <Button
                                    variant='ghost'
                                    data-marquee-control='true'
                                    classes={{ root: 'col-span-8 mt-1 w-full' }}
                                    disabled={taskFeedQuery.isFetchingNextPage}
                                    onClick={() => void taskFeedQuery.fetchNextPage()}
                                >
                                    {taskFeedQuery.isFetchingNextPage ? 'Loading...' : 'Load more'}
                                </Button>
                            </Show>
                        </div>
                    </Show>
                </Show>
                <Show when={dragSelection.marquee()}>
                    {rect => (
                        <div
                            class='pointer-events-none absolute z-10 border border-accent bg-accent/15'
                            style={{
                                left: `${rect().left}px`,
                                top: `${rect().top}px`,
                                width: `${rect().width}px`,
                                height: `${rect().height}px`,
                            }}
                        />
                    )}
                </Show>
            </div>

            <Show when={viewerTaskId() && detail.loading()}>
                <div
                    class='pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center'
                    role='status'
                >
                    <span class='rounded-md border border-line bg-surface px-3 py-2 text-xs text-fg-muted shadow-lg'>
                        Loading task outputs...
                    </span>
                </div>
            </Show>
            <Show when={viewerTaskId() && detail.error()}>
                <TaskViewerMessage
                    message='Failed to load task outputs.'
                    onClose={closeViewer}
                />
            </Show>
            <Show
                when={viewerTaskId()
                    && !detail.loading()
                    && !detail.error()
                    && detail.task()?.id === viewerTaskId()
                    && viewerImages().length === 0}
            >
                <TaskViewerMessage
                    message='This task has no outputs yet.'
                    onClose={closeViewer}
                />
            </Show>

            <Show
                when={viewerTaskId()
                    && !detail.loading()
                    && !detail.error()
                    && detail.task()?.id === viewerTaskId()
                    && viewerImages().length > 0}
            >
                <ImageViewer
                    images={viewerImages()}
                    selectedIndex={viewerIndex()}
                    actions={null}
                    onClose={closeViewer}
                    onSelect={setViewerIndex}
                />
            </Show>
        </section>
    )
}

function TaskBrowserEmptyState() {
    return (
        <div class='flex h-full min-h-48 items-center justify-center px-4 py-12 text-center'>
            <div>
                <p class='m-0 text-sm font-medium text-fg'>No matching tasks</p>
                <p class='mt-1 text-xs text-fg-muted'>Try another search or filter.</p>
            </div>
        </div>
    )
}

type TaskBrowserLoadErrorProps = {
    onRetry: () => void
}

function TaskBrowserLoadError(props: TaskBrowserLoadErrorProps) {
    return (
        <div class='flex flex-col items-center gap-2 px-4 py-12 text-center'>
            <p class='m-0 text-sm text-fg-muted'>Failed to load tasks.</p>
            <Button
                type='button'
                data-marquee-control='true'
                classes={{ root: 'h-8 px-3 text-xs' }}
                onClick={props.onRetry}
            >
                <RefreshCw
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden='true'
                />
                Retry
            </Button>
        </div>
    )
}

type TaskViewerMessageProps = {
    message: string
    onClose: () => void
}

function TaskViewerMessage(props: TaskViewerMessageProps) {
    return (
        <div class='pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center'>
            <div class='pointer-events-auto flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs text-fg-muted shadow-lg'>
                <span>{props.message}</span>
                <Button
                    variant='ghost'
                    classes={{ root: 'h-6 px-2 text-[11px]' }}
                    onClick={props.onClose}
                >
                    Close
                </Button>
            </div>
        </div>
    )
}

type TaskBrowserToolbarProps = {
    filter: TaskFeedFilter
    search: string
    selectedCount: number
    onSearchChange: (search: string) => void
    onFilterChange: (filter: TaskFeedFilter) => void
    onClearSelection: () => void
    onSetFlags: (flag: TaskFlag, value: boolean) => void
    onRemoveDiscard: () => void
    onCollapse: () => void
}

function TaskBrowserToolbar(props: TaskBrowserToolbarProps) {
    return (
        <div class='flex shrink-0 flex-col border-b border-line-subtle bg-surface'>
            <PanelHeader
                title='Tasks'
                action={(
                    <div class='flex min-w-0 flex-1 items-center justify-end gap-2'>
                        <Text
                            label='Search tasks'
                            value={props.search}
                            placeholder='task name or task ID...'
                            icon={(
                                <Search
                                    size={14}
                                    strokeWidth={1.7}
                                    aria-hidden='true'
                                />
                            )}
                            classes={{ root: 'min-w-0 flex-1', label: 'sr-only' }}
                            onInput={props.onSearchChange}
                        />
                        <Button
                            variant='ghost'
                            aria-label='Collapse task browser'
                            classes={{ root: 'size-8 shrink-0 p-0' }}
                            onClick={props.onCollapse}
                        >
                            <Minimize2
                                size={16}
                                strokeWidth={1.8}
                                aria-hidden='true'
                            />
                        </Button>
                    </div>
                )}
            />
            <div class='flex min-w-0 flex-wrap items-center gap-2'>
                <TaskFilterChips
                    value={props.filter}
                    onChange={props.onFilterChange}
                />
                <Show when={props.selectedCount > 0}>
                    <div class='ml-auto flex shrink-0 items-center gap-2 pr-2 pb-1'>
                        <span class='text-xs text-fg-muted tabular-nums'>
                            {props.selectedCount} selected
                        </span>
                        <Button
                            variant='ghost'
                            aria-label='Clear task selection'
                            classes={{ root: 'h-7 px-2 text-[11px]' }}
                            onClick={props.onClearSelection}
                        >
                            Clear
                        </Button>
                        <Show when={props.filter !== 'pinned'}>
                            <Button
                                variant='accent'
                                aria-label='Pin selected tasks'
                                classes={{ root: 'h-7 px-2 text-[11px]' }}
                                onClick={() => props.onSetFlags('pinned', true)}
                            >
                                <Pin
                                    size={13}
                                    strokeWidth={1.8}
                                    aria-hidden='true'
                                />
                                Pin
                            </Button>
                        </Show>
                        <Show when={props.filter !== 'discard'}>
                            <Button
                                variant='danger'
                                aria-label='Discard selected tasks'
                                classes={{ root: 'h-7 px-2 text-[11px]' }}
                                onClick={() => props.onSetFlags('discard', true)}
                            >
                                <Trash2
                                    size={13}
                                    strokeWidth={1.8}
                                    aria-hidden='true'
                                />
                                Discard
                            </Button>
                        </Show>
                        <Show when={props.filter === 'discard'}>
                            <Button
                                variant='ghost'
                                aria-label='Remove discard from selected tasks'
                                classes={{ root: 'h-7 px-2 text-[11px]' }}
                                onClick={props.onRemoveDiscard}
                            >
                                Remove discard
                            </Button>
                        </Show>
                    </div>
                </Show>
            </div>
        </div>
    )
}

type TaskCardProps = {
    focused: boolean
    checked: boolean
    task: TaskListItemWithShimFlags
    onFocusTask: () => void
    onOpenViewer: () => void
    onToggleSelected: () => void
    onSetPinned: (value: boolean) => void
    onSetDiscard: (value: boolean) => void
}

const cardThumbnailClasses = 'relative aspect-square w-full overflow-hidden rounded-md border'

function TaskCard(props: TaskCardProps) {
    const placeholder = () => placeholderMap[props.task.status]
    const shortId = () => props.task.id.slice(0, 8)
    const title = () => props.task.name ?? shortId()

    return (
        <article
            data-task-card='true'
            data-task-id={props.task.id}
            class={cn(
                'group relative min-w-0 rounded-lg border border-transparent p-2',
                props.task.discard && !props.focused && !props.checked && 'opacity-65 grayscale-[.15]',
                props.focused && !props.checked && 'border-accent/60 bg-active shadow-[0_0_0_1px_rgba(37,99,235,0.14),0_1px_12px_rgba(37,99,235,0.12)]',
                props.checked && !props.focused && 'border-accent bg-accent/20 ring-2 ring-accent/40',
                props.focused && props.checked && 'border-accent bg-accent/20 ring-2 ring-accent/40 shadow-[0_0_0_1px_rgba(37,99,235,0.14),0_1px_12px_rgba(37,99,235,0.12)]',
            )}
        >
            <Button
                variant='ghost'
                aria-label={`Open outputs for task ${title()}`}
                classes={{
                    root: cn(
                        'block w-full min-w-0 p-0 text-left hover:bg-transparent',
                        props.focused && 'focus-visible:border-transparent focus-visible:ring-0',
                    ),
                }}
                onClick={props.onOpenViewer}
            >
                <div
                    class={cn(
                        cardThumbnailClasses,
                        props.task.thumbnail
                            ? 'border-line-subtle bg-elevated'
                            : placeholder().class,
                    )}
                >
                    {props.task.thumbnail
                        ? (
                            <img
                                class='size-full object-cover'
                                src={props.task.thumbnail}
                                alt={title()}
                                draggable={false}
                            />
                        )
                        : <TaskThumbnailPlaceholder task={props.task} />}
                    <span class='absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white tabular-nums'>
                        {props.task.outputCount}
                    </span>
                </div>
            </Button>
            <Button
                variant='ghost'
                aria-label={`Focus task ${title()}`}
                aria-pressed={props.focused}
                classes={{
                    root: cn(
                        'mt-2 block w-full min-w-0 p-0 text-left hover:bg-transparent',
                        props.focused && 'focus-visible:border-transparent focus-visible:ring-0',
                    ),
                }}
                onClick={props.onFocusTask}
            >
                <div class='flex min-w-0 flex-col gap-2'>
                    <span
                        class='truncate text-xs font-medium leading-none text-fg'
                        classList={{ 'font-mono': !props.task.name }}
                    >
                        {title()}
                    </span>
                    <div class='flex min-w-0 items-center justify-between gap-1'>
                        <TaskStatus status={props.task.status} />
                        <span class='truncate text-[10px] leading-none text-fg-muted'>
                            {formatDateTime(props.task.createdAt)}
                        </span>
                    </div>
                </div>
            </Button>

            <div class='absolute left-2.5 top-2.5 flex gap-1'>
                <Button
                    variant='ghost'
                    data-marquee-control='true'
                    aria-label={props.task.pinned ? 'Remove pinned flag' : 'Pin task'}
                    aria-pressed={props.task.pinned}
                    classes={{
                        root: cn(
                            'size-7 shrink-0 rounded-md border-0 p-0',
                            props.task.pinned
                                ? 'bg-amber-500/90 text-amber-950 hover:bg-amber-400'
                                : 'bg-black/60 text-white/75 hover:bg-black/80 hover:text-white',
                        ),
                    }}
                    onClick={() => props.onSetPinned(!props.task.pinned)}
                >
                    <Pin
                        size={14}
                        strokeWidth={1.8}
                        aria-hidden='true'
                    />
                </Button>
                <Button
                    variant='ghost'
                    data-marquee-control='true'
                    aria-label={props.task.discard ? 'Remove discard flag' : 'Discard task'}
                    aria-pressed={props.task.discard}
                    classes={{
                        root: cn(
                            'size-7 shrink-0 rounded-md border-0 p-0',
                            props.task.discard
                                ? 'bg-rose-500/90 text-rose-950 hover:bg-rose-400'
                                : 'bg-black/60 text-white/75 hover:bg-black/80 hover:text-white',
                        ),
                    }}
                    onClick={() => props.onSetDiscard(!props.task.discard)}
                >
                    <Trash2
                        size={14}
                        strokeWidth={1.8}
                        aria-hidden='true'
                    />
                </Button>
            </div>

            <Button
                variant='ghost'
                data-marquee-control='true'
                aria-label={props.checked ? 'Deselect task' : 'Select task'}
                aria-pressed={props.checked}
                classes={{
                    root: cn(
                        'absolute right-2.5 top-2.5 size-7 rounded-md border-0 p-0 transition-opacity',
                        props.checked
                            ? 'bg-accent text-white'
                            : 'pointer-events-none bg-black/60 text-white/75 opacity-0 hover:bg-black/80 hover:text-white group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100',
                    ),
                }}
                onClick={props.onToggleSelected}
            >
                <Check
                    size={14}
                    strokeWidth={2}
                    class={cn(!props.checked && 'opacity-0')}
                    aria-hidden='true'
                />
            </Button>
        </article>
    )
}

function TaskCardSkeleton() {
    return (
        <div class='min-w-0 rounded-lg p-1.5'>
            <Loading.Skeleton class='aspect-square w-full rounded-md' />
            <div class='flex flex-col gap-1 px-0.5 pt-2'>
                <Loading.Skeleton class='h-3 w-3/4' />
                <Loading.Skeleton class='h-3 w-1/2' />
            </div>
        </div>
    )
}

function TaskThumbnailPlaceholder(props: { task: TaskListItemWithShimFlags }) {
    const meta = () => placeholderMap[props.task.status]
    const Icon = meta().Icon

    return (
        <div
            class='flex size-full items-center justify-center'
            aria-label={meta().label}
        >
            <Icon
                size={26}
                strokeWidth={1.6}
            />
        </div>
    )
}
