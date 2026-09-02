import { Pin, Trash2 } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { TaskStatus } from '#/components/task/TaskStatus'
import { cn } from '#/lib/cn'
import { formatDateTime } from '#/lib/format'
import { placeholderMap } from '#/pages/generate/components/task/taskPlaceholder'

import type { TaskListItemWithShimFlags } from '#/features/task/task.shim'
import type { TaskPlaceholderMeta } from '#/pages/generate/components/task/taskPlaceholder'

export type TaskItemProps = {
    selected: boolean
    task: TaskListItemWithShimFlags
    thumbnailOnly: boolean
    onSelect: () => void
    onTogglePinned: () => void
    onToggleDiscard: () => void
}

const taskItemRootBaseClasses = 'flex w-full items-center justify-center gap-2.5 rounded-lg border border-transparent p-1.5 text-left'
const taskThumbnailBaseClasses = 'size-18 shrink-0 overflow-hidden rounded-md border'

export function TaskItem(props: TaskItemProps) {
    const placeholder = () => placeholderMap[props.task.status]
    // 未命名的 task 用 UUID 首段當標題，並以 mono 標示它是 id 而非名字
    const shortId = () => props.task.id.slice(0, 8)

    return (
        <div class='relative w-full'>
            <Button
                variant='ghost'
                aria-pressed={props.selected}
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
                <div
                    class={cn(
                        taskThumbnailBaseClasses,
                        'relative',
                        props.task.thumbnail
                            ? 'border-line-subtle bg-elevated'
                            : placeholder().class,
                    )}
                >
                    {
                        props.task.thumbnail
                            ? (
                                <img
                                    class='h-full w-full object-cover'
                                    src={props.task.thumbnail}
                                />
                            )
                            : <TaskThumbnailPlaceholder meta={placeholder()} />
                    }
                    {props.thumbnailOnly && (props.task.pinned || props.task.discard) && (
                        <span
                            class={cn(
                                'absolute left-1 top-1 flex size-5 items-center justify-center rounded bg-black/75',
                                props.task.pinned ? 'text-amber-300' : 'text-rose-300',
                            )}
                            aria-hidden='true'
                        >
                            {props.task.pinned
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
                </div>

                {!props.thumbnailOnly && (
                    <div class='flex min-w-0 flex-1 flex-col items-start gap-1.5 pr-14'>
                        <span
                            class='max-w-full truncate text-xs font-medium leading-none text-fg'
                            classList={{ 'font-mono': !props.task.name }}
                        >
                            {props.task.name ?? shortId()}
                        </span>
                        <TaskStatus status={props.task.status} />
                        <span class='max-w-full truncate text-[11px] leading-none text-fg-muted'>
                            {formatDateTime(props.task.createdAt)}
                        </span>
                    </div>
                )}
            </Button>

            {!props.thumbnailOnly && (
                <div class='absolute right-2 top-2 flex gap-0.5'>
                    <Button
                        variant='ghost'
                        aria-label={props.task.pinned ? 'Remove pinned flag' : 'Pin task'}
                        aria-pressed={props.task.pinned}
                        classes={{
                            root: cn(
                                'size-7 shrink-0 rounded-md border-0 p-0',
                                props.task.pinned
                                    ? 'bg-amber-500/90 text-amber-950 hover:bg-amber-400'
                                    : 'bg-black/55 text-white/70 hover:bg-black/75 hover:text-white',
                            ),
                        }}
                        onClick={props.onTogglePinned}
                    >
                        <Pin
                            size={14}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        aria-label={props.task.discard ? 'Remove discard flag' : 'Discard task'}
                        aria-pressed={props.task.discard}
                        classes={{
                            root: cn(
                                'size-7 shrink-0 rounded-md border-0 p-0',
                                props.task.discard
                                    ? 'bg-rose-500/90 text-rose-950 hover:bg-rose-400'
                                    : 'bg-black/55 text-white/70 hover:bg-black/75 hover:text-white',
                            ),
                        }}
                        onClick={props.onToggleDiscard}
                    >
                        <Trash2
                            size={14}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                    </Button>
                </div>
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
            aria-hidden='true'
            class={cn(taskItemRootBaseClasses, 'pointer-events-none')}
        >
            <Loading.Skeleton class={cn(taskThumbnailBaseClasses, 'border-transparent')} />

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

type TaskThumbnailPlaceholderProps = {
    meta: TaskPlaceholderMeta
}

function TaskThumbnailPlaceholder(props: TaskThumbnailPlaceholderProps) {
    const Icon = props.meta.Icon

    return (
        <div
            class='flex h-full w-full items-center justify-center'
            aria-label={props.meta.label}
        >
            <Icon
                size={22}
                strokeWidth={1.6}
            />
        </div>
    )
}
