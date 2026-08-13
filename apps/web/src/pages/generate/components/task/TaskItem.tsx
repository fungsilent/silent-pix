import { Ban, CircleX, Hourglass, Image as ImageIcon, LoaderCircle } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'
import { TaskStatus } from '#/pages/generate/components/TaskStatus'

import type { TaskApi } from '@silent-pix/shared'
import type { LucideProps } from 'lucide-solid'
import type { Component } from 'solid-js'

type TaskItemProps = {
    selected: boolean
    task: TaskApi.TaskListItem
    thumbnailOnly: boolean
    onSelect: () => void
}

type PlaceholderMeta = {
    Icon: Component<LucideProps>
    class: string
    label: string
}

/* status placeholder 的 icon 與顏色沿用現行，不得更動 */
const placeholderMap: Record<TaskApi.TaskStatus, PlaceholderMeta> = {
    done: {
        Icon: ImageIcon,
        class: 'border-line-subtle bg-elevated text-fg-muted',
        label: 'No thumbnail',
    },
    queued: {
        Icon: Hourglass,
        class: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
        label: 'Queued task thumbnail pending',
    },
    running: {
        Icon: LoaderCircle,
        class: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
        label: 'Running task thumbnail pending',
    },
    failed: {
        Icon: CircleX,
        class: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
        label: 'Task failed',
    },
    cancelled: {
        Icon: Ban,
        class: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
        label: 'Task cancelled',
    },
}

export function TaskItem(props: TaskItemProps) {
    const placeholder = () => placeholderMap[props.task.status]

    return (
        <Button
            variant='ghost'
            aria-pressed={props.selected}
            classes={{
                root: cn(
                    'w-full justify-start gap-2.5 rounded-lg text-left',
                    props.selected
                        ? 'border-accent/60 bg-active shadow-[0_0_0_1px_rgba(37,99,235,0.14),0_1px_12px_rgba(37,99,235,0.12)]'
                        : 'hover:bg-elevated',
                ),
            }}
            onClick={props.onSelect}
        >
            <div
                class={cn(
                    'size-14 shrink-0 overflow-hidden rounded-md border',
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
                                alt=''
                            />
                        )
                        : <TaskThumbnailPlaceholder meta={placeholder()} />
                }
            </div>

            {!props.thumbnailOnly && (
                <div class='flex min-w-0 flex-1 flex-col items-start gap-1.5'>
                    <span class='max-w-full truncate text-xs font-medium leading-none text-fg'>
                        {props.task.name}
                    </span>
                    <TaskStatus status={props.task.status} />
                    <span class='max-w-full truncate text-[11px] leading-none text-fg-muted'>
                        {new Date(props.task.createdAt).toLocaleString()}
                    </span>
                </div>
            )}
        </Button>
    )
}

type TaskThumbnailPlaceholderProps = {
    meta: PlaceholderMeta
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
