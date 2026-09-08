import { RefreshCw } from 'lucide-solid'
import { createSignal, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { cn } from '#/lib/cn'
import { createDragSelection } from '#/lib/dragSelection'
import { TaskBrowserCard } from '#/pages/generate/components/task/browser/TaskBrowserCard'

import type { TaskApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

const taskSkeletonCells = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]

type TaskBrowserGridProps = {
    taskIds: Accessor<string[]>
    taskById: Accessor<ReadonlyMap<string, TaskApi.TaskListItem>>
    focusedTaskId: Accessor<string | undefined>
    selectedTaskIds: Accessor<readonly string[]>
    loading: boolean
    hasData: boolean
    error: boolean
    hasNextPage: boolean
    fetchingNextPage: boolean
    flagPending: boolean
    onRetry: () => void
    onFetchNextPage: () => void
    onSelectionChange: (ids: string[]) => void
    onFocusTask: (taskId: string) => void
    onOpenViewer: (taskId: string) => void
    onToggleSelected: (taskId: string) => void
    onFlagChange: (taskId: string, flag: TaskApi.TaskFlag | null) => void
}

export function TaskBrowserGrid(props: TaskBrowserGridProps) {
    const [selectionContainerElement, setSelectionContainerElement] = createSignal<HTMLDivElement>()
    const dragSelection = createDragSelection({
        container: selectionContainerElement,
        selectedIds: props.selectedTaskIds,
        onSelectionChange: props.onSelectionChange,
        itemSelector: '[data-task-card]',
        controlSelector: '[data-marquee-control]',
        getItemId: item => item.dataset.taskId,
    })

    const focusTask = (taskId: string) => {
        if (dragSelection.consumeSuppressedClick()) {
            return
        }

        props.onFocusTask(taskId)
    }

    const openTask = (taskId: string) => {
        if (dragSelection.consumeSuppressedClick()) {
            return
        }

        props.onOpenViewer(taskId)
    }

    return (
        <div
            ref={setSelectionContainerElement}
            class={cn(
                'relative min-h-0 flex-1 overflow-y-auto bg-surface',
                dragSelection.tracking() && 'select-none',
            )}
            onPointerDown={dragSelection.onPointerDown}
        >
            <Show
                when={!props.loading}
                fallback={(
                    <div class='grid grid-cols-8 content-start gap-3 p-2'>
                        <For each={taskSkeletonCells}>
                            {() => <TaskCardSkeleton />}
                        </For>
                    </div>
                )}
            >
                <Show
                    when={!props.error || props.hasData}
                    fallback={<TaskBrowserLoadError onRetry={props.onRetry} />}
                >
                    <div class='grid grid-cols-8 content-start gap-3 p-2'>
                        <Show
                            when={props.taskIds().length > 0}
                            fallback={(
                                <Show
                                    when={!props.error}
                                    fallback={(
                                        <div class='col-span-8'>
                                            <TaskBrowserLoadError onRetry={props.onRetry} />
                                        </div>
                                    )}
                                >
                                    <div class='col-span-8'>
                                        <TaskBrowserEmptyState />
                                    </div>
                                </Show>
                            )}
                        >
                            <For each={props.taskIds()}>
                                {taskId => (
                                    <TaskBrowserCard
                                        focused={taskId === props.focusedTaskId()}
                                        checked={props.selectedTaskIds().includes(taskId)}
                                        task={props.taskById().get(taskId)!}
                                        flagPending={props.flagPending}
                                        onFocusTask={() => focusTask(taskId)}
                                        onOpenViewer={() => openTask(taskId)}
                                        onToggleSelected={() => props.onToggleSelected(taskId)}
                                        onFlagChange={flag => props.onFlagChange(taskId, flag)}
                                    />
                                )}
                            </For>
                            <Show when={props.error}>
                                <div class='col-span-8'>
                                    <TaskBrowserLoadError onRetry={props.onRetry} />
                                </div>
                            </Show>
                        </Show>
                        <Show when={props.hasNextPage}>
                            <Button
                                variant='ghost'
                                data-marquee-control='true'
                                classes={{ root: 'col-span-8 mt-1 w-full' }}
                                disabled={props.fetchingNextPage}
                                onClick={props.onFetchNextPage}
                            >
                                {props.fetchingNextPage ? 'Loading...' : 'Load more'}
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
