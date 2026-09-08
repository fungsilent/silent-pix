import { CircleX, Hourglass, Image as ImageIcon, LoaderCircle } from 'lucide-solid'

import { cn } from '#/lib/cn'

import type { TaskApi } from '@silent-pix/shared'
import type { JSX } from 'solid-js'

type TaskPlaceholderMeta = {
    class: string
    label: string
}

type TaskThumbnailClasses = {
    root?: string
    image?: string
    placeholder?: string
    icon?: string
}

type TaskThumbnailProps = {
    thumbnail: string | undefined
    status: TaskApi.TaskStatus
    alt: string
    classes?: TaskThumbnailClasses
    placeholderIconSize?: number
    children?: JSX.Element
}

/* status placeholder 的 icon 與顏色沿用現行，不得更動 */
const placeholderMap: Record<TaskApi.TaskStatus, TaskPlaceholderMeta> = {
    done: {
        class: 'border-line-subtle bg-elevated text-fg-muted',
        label: 'No thumbnail',
    },
    queued: {
        class: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
        label: 'Queued task thumbnail pending',
    },
    running: {
        class: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
        label: 'Running task thumbnail pending',
    },
    failed: {
        class: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
        label: 'Task failed',
    },
}

export function TaskThumbnail(props: TaskThumbnailProps) {
    const placeholder = () => placeholderMap[props.status]

    return (
        <div
            class={cn(
                'relative overflow-hidden rounded-md border',
                props.thumbnail
                    ? 'border-line-subtle bg-elevated'
                    : placeholder().class,
                props.classes?.root,
            )}
        >
            {props.thumbnail
                ? (
                    <img
                        class={cn('size-full object-cover', props.classes?.image)}
                        src={props.thumbnail}
                        alt={props.alt}
                        draggable={false}
                    />
                )
                : (
                    <div
                        class={cn(
                            'flex size-full items-center justify-center',
                            props.classes?.placeholder,
                        )}
                        aria-label={placeholder().label}
                    >
                        <TaskPlaceholderIcon
                            status={props.status}
                            class={props.classes?.icon ?? ''}
                            size={props.placeholderIconSize ?? 22}
                        />
                    </div>
                )}
            {props.children}
        </div>
    )
}

type TaskPlaceholderIconProps = {
    status: TaskApi.TaskStatus
    class: string
    size: number
}

function TaskPlaceholderIcon(props: TaskPlaceholderIconProps) {
    const iconProps = {
        class: props.class,
        size: props.size,
        strokeWidth: 1.6,
    }

    switch (props.status) {
        case 'queued':
            return <Hourglass {...iconProps} />
        case 'running':
            return <LoaderCircle {...iconProps} />
        case 'failed':
            return <CircleX {...iconProps} />
        case 'done':
            return <ImageIcon {...iconProps} />
    }
}
