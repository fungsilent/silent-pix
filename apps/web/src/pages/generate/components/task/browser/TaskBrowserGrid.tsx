import { createSignal, For, Show } from 'solid-js'

import { Loading } from '#/components/base/Loading'
import { StatusMessage } from '#/components/base/StatusMessage'
import { createDragSelection } from '#/lib/drag-selection'
import { t } from '#/lib/i18n'
import { createLoadOnScroll } from '#/lib/load-on-scroll'
import { TaskBrowserCard } from '#/pages/generate/components/task/browser/TaskBrowserCard'
import { mergeClasses } from '#/utils/style'

import type { TaskApi } from '@silent-pix/shared'
import type { ThumbnailGrid } from '#/components/image/ThumbnailSize'
import type { Accessor } from 'solid-js'

const taskSkeletonCells = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
const nextPageSkeletonCells = [0, 1, 2, 3]

type TaskBrowserGridProps = {
    taskIds: Accessor<string[]>
    taskById: Accessor<ReadonlyMap<string, TaskApi.TaskListItem>>
    focusedTaskId: Accessor<string | undefined>
    thumbnailGrid: ThumbnailGrid
    selectedTaskIds: Accessor<readonly string[]>
    emptyCopy: { title: string, message: string }
    loading: boolean
    hasData: boolean
    error: boolean
    hasNextPage: boolean
    fetchingNextPage: boolean
    fetching: boolean
    flagPending: boolean
    onRetry: () => void
    onFetchNextPage: () => void
    onSelectionChange: (ids: string[]) => void
    onFocusTask: (taskId: string) => void
    onOpenViewer: (taskId: string) => void
    onToggleSelected: (taskId: string) => void
    onFlagChange: (taskId: string, flag: TaskApi.TaskFlag | null) => void
    mobile?: boolean | undefined
}

export function TaskBrowserGrid(props: TaskBrowserGridProps) {
    const [selectionContainerElement, setSelectionContainerElement] = createSignal<HTMLDivElement>()
    const loadOnScroll = createLoadOnScroll({
        canLoad: () => props.hasNextPage && !props.fetching && !props.error,
        load: props.onFetchNextPage,
    })
    const dragSelection = createDragSelection({
        container: selectionContainerElement,
        selectedIds: props.selectedTaskIds,
        onSelectionChange: props.onSelectionChange,
        itemSelector: '[data-task-card]',
        controlSelector: '[data-marquee-control]',
        getItemId: item => item.dataset.taskId,
    })

    const template = () => props.mobile ? 'repeat(2, minmax(0, 1fr))' : props.thumbnailGrid.template()

    const focusTask = (taskId: string) => {
        if (dragSelection.consumeSuppressedClick()) {
            return
        }

        props.onFocusTask(taskId)
    }

    const toggleTaskByClick = (taskId: string) => {
        if (dragSelection.consumeSuppressedClick()) {
            return
        }

        props.onToggleSelected(taskId)
    }

    const openTask = (taskId: string) => {
        if (dragSelection.consumeSuppressedClick()) {
            return
        }

        props.onOpenViewer(taskId)
    }

    return (
        <div
            ref={element => {
                setSelectionContainerElement(element)
                loadOnScroll.setViewport(element)
                if (!props.mobile) props.thumbnailGrid.observe(element)
            }}
            class={mergeClasses(
                'scrollbar-thin relative min-h-0 flex-1 overflow-y-auto bg-surface [scrollbar-gutter:stable]',
                dragSelection.tracking() && 'select-none',
            )}
            onPointerDown={props.mobile ? undefined : dragSelection.onPointerDown}
        >
            <Show
                when={!props.loading}
                fallback={(
                    <div
                        class='grid content-start gap-3 p-2'
                        style={{ 'grid-template-columns': template() }}
                    >
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
                    <div
                        class={mergeClasses('grid content-start gap-3 p-2', props.mobile && 'pb-[72px]')}
                        style={{ 'grid-template-columns': template() }}
                    >
                        <Show
                            when={props.taskIds().length > 0}
                            fallback={(
                                <Show
                                    when={!props.error}
                                    fallback={(
                                        <div class='col-span-full'>
                                            <TaskBrowserLoadError onRetry={props.onRetry} />
                                        </div>
                                    )}
                                >
                                    <div class='col-span-full flex min-h-48 items-center justify-center px-4 py-12'>
                                        <StatusMessage
                                            kind='empty'
                                            title={props.emptyCopy.title}
                                            message={props.emptyCopy.message}
                                        />
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
                                        onToggleByClick={() => toggleTaskByClick(taskId)}
                                        onFlagChange={flag => props.onFlagChange(taskId, flag)}
                                        mobile={props.mobile}
                                        selecting={props.mobile && props.selectedTaskIds().length > 0}
                                    />
                                )}
                            </For>
                            <Show when={props.error}>
                                <div class='col-span-full'>
                                    <TaskBrowserLoadError onRetry={props.onRetry} />
                                </div>
                            </Show>
                        </Show>
                        <Show when={props.fetchingNextPage}>
                            <For each={nextPageSkeletonCells}>
                                {() => <TaskCardSkeleton />}
                            </For>
                        </Show>
                        <Show when={props.hasNextPage && !props.error}>
                            <div
                                ref={loadOnScroll.setTrigger}
                                class='col-span-full h-px'
                            />
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

type TaskBrowserLoadErrorProps = {
    onRetry: () => void
}

function TaskBrowserLoadError(props: TaskBrowserLoadErrorProps) {
    return (
        <div
            data-marquee-control='true'
            class='flex justify-center px-4 py-12'
        >
            <StatusMessage
                kind='load-error'
                message={t('task.loadFailed')}
                onRetry={props.onRetry}
            />
        </div>
    )
}

function TaskCardSkeleton() {
    return (
        <div class='min-w-0 rounded-lg border border-transparent p-2'>
            <Loading.Skeleton class='aspect-square w-full rounded-md' />
            <div class='mt-2 flex min-w-0 flex-col gap-2 border border-transparent'>
                <div class='flex h-7 min-w-0 items-center'>
                    <Loading.Skeleton class='h-3 w-3/4' />
                </div>
                <div class='flex h-5 min-w-0 items-center justify-between gap-1'>
                    <Loading.Skeleton class='h-5 w-12' />
                    <Loading.Skeleton class='h-2.5 w-24' />
                </div>
            </div>
        </div>
    )
}
