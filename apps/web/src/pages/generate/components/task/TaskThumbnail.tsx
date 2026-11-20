import { Clock, Image as ImageIcon, ImageOff, LoaderCircle } from 'lucide-solid'
import { Match, Switch } from 'solid-js'

import { resolveImageUrl } from '#/api/image'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'

import type { TaskApi } from '@silent-pix/shared'
import type { JSX } from 'solid-js'

type TaskPlaceholderMeta = {
    class: string
    label: () => string
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

/* 沒縮圖時依狀態顯示：狀態色的斜向淡漸層底＋同色 icon；done 維持中性 */
const placeholderMap: Record<TaskApi.TaskStatus, TaskPlaceholderMeta> = {
    done: {
        class: 'border-line-subtle bg-elevated text-fg-muted',
        label: () => t('task.thumbnail.none'),
    },
    queued: {
        class: 'border-warning/15 bg-gradient-to-br from-warning/[0.14] to-warning/[0.04] text-warning-fg',
        label: () => t('task.thumbnail.queued'),
    },
    running: {
        class: 'border-info/15 bg-gradient-to-br from-info/[0.14] to-info/[0.04] text-info-fg',
        label: () => t('task.thumbnail.running'),
    },
    failed: {
        class: 'border-danger/15 bg-gradient-to-br from-danger/[0.14] to-danger/[0.04] text-danger-fg',
        label: () => t('task.thumbnail.failed'),
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
    const iconProps = () => ({
        class: props.class,
        size: props.size,
        strokeWidth: 1.6,
    })

    return (
        <Switch>
            <Match when={props.status === 'queued'}><Clock {...iconProps()} /></Match>
            <Match when={props.status === 'running'}><LoaderCircle {...iconProps()} /></Match>
            <Match when={props.status === 'failed'}><ImageOff {...iconProps()} /></Match>
            <Match when={props.status === 'done'}><ImageIcon {...iconProps()} /></Match>
        </Switch>
    )
}
