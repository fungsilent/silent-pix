import clsx from 'clsx'
import { Ban, CircleX, Clock3, Hourglass, Image as ImageIcon, LoaderCircle } from 'lucide-solid'

import { Button } from '#/components/base/Button'
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
            aria-pressed={props.selected}
            classes={{
                root: clsx(
                    'w-full justify-start gap-3 p-0 text-left',
                    props.selected
                        ? 'border-accent bg-active'
                        : 'border-line bg-elevated',
                ),
            }}
            onClick={props.onSelect}
        >
            <div
                class={clsx(
                    'h-24 w-24 shrink-0 overflow-hidden rounded-md border',
                    !props.task.thumbnail && placeholder().class,
                    props.task.thumbnail && 'border-line-subtle bg-elevated',
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
                <div class='flex min-w-0 flex-1 flex-col gap-1 py-2 pr-2'>
                    <span class='truncate text-sm font-bold leading-none text-fg'>{props.task.id}</span>

                    <div class='flex flex-1 items-center'>
                        <TaskStatus status={props.task.status} />
                    </div>

                    <div class='flex items-center gap-1'>
                        <Clock3 size={11} />
                        <span class='truncate text-[0.75rem] leading-none text-fg-muted'>{new Date(props.task.createdAt).toLocaleString()}</span>
                    </div>
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
            <Icon size={30} />
        </div>
    )
}
