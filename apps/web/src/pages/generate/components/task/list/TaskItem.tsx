import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { TaskStatus } from '#/components/task/TaskStatus'
import { cn } from '#/lib/cn'
import { formatDateTime } from '#/lib/format'
import { theme } from '#/lib/theme'
import { TaskFlagControls, TaskFlagOverlay } from '#/pages/generate/components/task/TaskFlag'
import { TaskThumbnail } from '#/pages/generate/components/task/TaskThumbnail'

import type { TaskApi } from '@silent-pix/shared'

type TaskItemProps = {
    selected: boolean
    task: TaskApi.TaskListItem
    thumbnailOnly: boolean
    flagPending: boolean
    onSelect: () => void
    onFlagChange: (flag: TaskApi.TaskFlag | null) => void
}

const taskItemRootBaseClasses = 'flex w-full items-center justify-center gap-2.5 rounded-lg border border-transparent p-1.5 text-left'
const taskThumbnailBaseClasses = 'size-18 shrink-0'

export function TaskItem(props: TaskItemProps) {
    const shortId = () => props.task.id.slice(0, 8)

    return (
        <div class='group relative w-full'>
            <Button
                variant='ghost'
                classes={{
                    root: cn(
                        taskItemRootBaseClasses,
                        props.selected
                            ? theme.selected
                            : 'hover:bg-elevated',
                    ),
                }}
                onClick={props.onSelect}
            >
                <TaskThumbnail
                    thumbnail={props.task.thumbnail}
                    status={props.task.status}
                    alt={props.task.name ?? shortId()}
                    classes={{
                        root: taskThumbnailBaseClasses,
                        image: 'h-full w-full object-cover',
                    }}
                >
                    <TaskFlagOverlay
                        pin={props.task.pin}
                        discard={props.task.discard}
                        hasImage={Boolean(props.task.thumbnail)}
                        carrier='item'
                    />
                </TaskThumbnail>

                {!props.thumbnailOnly && (
                    <div class='flex min-w-0 flex-1 flex-col items-start gap-1.5'>
                        <div class='flex w-full min-w-0 items-start'>
                            <span
                                class='min-w-0 truncate text-xs font-medium leading-none text-fg'
                                classList={{ 'font-mono': !props.task.name }}
                            >
                                {props.task.name ?? shortId()}
                            </span>
                        </div>
                        <TaskStatus status={props.task.status} />
                        <span class='max-w-full truncate text-[11px] leading-none text-fg-muted'>
                            {formatDateTime(props.task.createdAt)}
                        </span>
                    </div>
                )}
            </Button>

            {/* 三行要對 72px 縮圖垂直置中，操作鈕塞進 name 行會撐高那一行，所以讓它浮在右上角 */}
            {!props.thumbnailOnly && (
                <TaskFlagControls
                    pin={props.task.pin}
                    discard={props.task.discard}
                    pending={props.flagPending}
                    onChange={props.onFlagChange}
                    class='right-2 top-2 gap-0.5'
                />
            )}
        </div>
    )
}

type TaskItemSkeletonProps = {
    thumbnailOnly: boolean
}

export function TaskItemSkeleton(props: TaskItemSkeletonProps) {
    return (
        <div
            class={cn(taskItemRootBaseClasses, 'pointer-events-none')}
        >
            <Loading.Skeleton class={cn(taskThumbnailBaseClasses, 'border-transparent rounded-md')} />

            {!props.thumbnailOnly && (
                <div class='flex min-w-0 flex-1 flex-col items-start gap-1.5'>
                    <Loading.Skeleton class='h-3 w-3/4' />
                    <Loading.Skeleton class='h-3 w-1/2' />
                    <Loading.Skeleton class='h-3 w-2/3' />
                </div>
            )}
        </div>
    )
}
