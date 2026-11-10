import { CircleX, Hourglass, Image as ImageIcon, LoaderCircle } from 'lucide-solid'

import { resolveImageUrl } from '#/api/image'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'

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
        label: t('task.thumbnail.none'),
    },
    queued: {
        class: 'border-warning/30 bg-warning/10 text-warning-fg',
        label: t('task.thumbnail.queued'),
    },
    running: {
        class: 'border-info/30 bg-info/10 text-info-fg',
        label: t('task.thumbnail.running'),
    },
    failed: {
        class: 'border-danger/30 bg-danger/10 text-danger-fg',
        label: t('task.thumbnail.failed'),
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
                        src={resolveImageUrl(props.thumbnail)}
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
