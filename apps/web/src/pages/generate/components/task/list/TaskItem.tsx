import { Pin, Trash2 } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { TaskStatus } from '#/components/task/TaskStatus'
import { cn } from '#/lib/cn'
import { formatDateTime } from '#/lib/format'
import { TaskFlagControls } from '#/pages/generate/components/task/TaskFlagControls'
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
        <div class='relative w-full'>
            <Button
                variant='ghost'
                classes={{
                    root: cn(
                        taskItemRootBaseClasses,
                        props.selected
                            ? 'border-accent/60 bg-active shadow-[0_0_0_1px_rgba(37,99,235,0.14),0_1px_12px_rgba(37,99,235,0.12)]'
                            : 'hover:bg-elevated',
                        props.task.discard && !props.selected && 'opacity-60 grayscale-[.15]',
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
                    {props.thumbnailOnly && (props.task.pin || props.task.discard) && (
                        <span
                            class={cn(
                                'absolute left-1 top-1 flex size-5 items-center justify-center rounded bg-black/75',
                                props.task.pin ? 'text-amber-300' : 'text-rose-300',
                            )}
                        >
                            {props.task.pin
                                ? (
                                    <Pin
                                        size={12}
                                        strokeWidth={2}
                                    />
                                )
                                : (
                                    <Trash2
                                        size={12}
                                        strokeWidth={2}
                                    />
                                )}
                        </span>
                    )}
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

            {!props.thumbnailOnly && (
                <TaskFlagControls
                    pin={props.task.pin}
                    discard={props.task.discard}
                    pending={props.flagPending}
                    onChange={props.onFlagChange}
                    classes={{
                        root: 'right-2 top-2 gap-0.5',
                        pinActive: 'bg-amber-500/90 text-amber-950 hover:bg-amber-400',
                        pinInactive: 'bg-black/55 text-white/70 hover:bg-black/75 hover:text-white',
                        discardActive: 'bg-rose-500/90 text-rose-950 hover:bg-rose-400',
                        discardInactive: 'bg-black/55 text-white/70 hover:bg-black/75 hover:text-white',
                    }}
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
