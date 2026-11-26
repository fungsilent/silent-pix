import { Pencil, X } from 'lucide-solid'

import { Badge } from '#/components/base/Badge'
import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { TaskFlagOverlay } from '#/components/task/TaskFlagOverlay'
import { TaskStatus } from '#/components/task/TaskStatus'
import { t } from '#/lib/i18n'
import { theme } from '#/lib/theme'
import { TaskFlagControls } from '#/pages/generate/components/task/TaskFlag'
import { TaskThumbnail } from '#/pages/generate/components/task/TaskThumbnail'
import { formatDate, formatTime } from '#/utils/date'
import { mergeClasses } from '#/utils/style'

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
                    root: mergeClasses(
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
                        dim={Boolean(props.task.thumbnail)}
                        carrier='item'
                    />
                </TaskThumbnail>

                {!props.thumbnailOnly && (
                    <div class='flex min-w-0 flex-1 flex-col items-start gap-1.5'>
                        <div class='flex w-full min-w-0 items-center group-focus-within:pr-[52px] group-hover:pr-[52px] touch:pr-[52px]'>
                            <span
                                class='min-w-0 truncate text-xs font-medium leading-none text-fg'
                                classList={{ 'font-mono': !props.task.name }}
                            >
                                {props.task.name ?? shortId()}
                            </span>
                        </div>
                        <TaskStatus status={props.task.status} />
                        <span class='flex w-full items-center justify-between gap-2 text-[11px] leading-none text-fg-muted'>
                            <span>{formatDate(props.task.createdAt)}</span>
                            <span>{formatTime(props.task.createdAt)}</span>
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
                    compact
                    class='right-[7px] top-2.5 gap-0.5'
                />
            )}
        </div>
    )
}

type TaskDraftItemProps = {
    selected: boolean
    thumbnailOnly: boolean
    name: string
    source: string
    onSelect: () => void
    onDiscard: () => void
}

export function TaskDraftItem(props: TaskDraftItemProps) {
    return (
        <div class='group relative w-full'>
            <Button
                variant='ghost'
                title={t('task.draft')}
                classes={{
                    root: mergeClasses(taskItemRootBaseClasses, props.selected ? theme.selected : 'hover:bg-elevated'),
                }}
                onClick={props.onSelect}
            >
                <span class={mergeClasses(taskThumbnailBaseClasses, 'grid place-items-center rounded-md border border-dashed border-line text-fg-muted')}>
                    <Pencil
                        size={22}
                        strokeWidth={1.6}
                    />
                </span>
                {!props.thumbnailOnly && (
                    <div class='flex min-w-0 flex-1 flex-col items-start gap-1.5'>
                        <span class='w-full min-w-0 truncate text-xs font-medium leading-none text-fg'>
                            {props.name || t('common.untitled')}
                        </span>
                        <Badge tone='neutral'>{t('task.draft')}</Badge>
                        <span class='w-full truncate text-[11px] leading-none text-fg-muted'>{props.source}</span>
                    </div>
                )}
            </Button>
            {!props.thumbnailOnly && (
                <Button
                    variant='ghost'
                    title={t('task.discardDraft')}
                    classes={{ root: 'absolute right-[7px] top-2.5 hidden size-6 rounded-md p-0 text-fg-muted hover:text-fg group-hover:flex group-focus-within:flex touch:flex' }}
                    onClick={props.onDiscard}
                >
                    <X
                        size={13}
                        strokeWidth={1.9}
                    />
                </Button>
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
            class={mergeClasses(taskItemRootBaseClasses, 'pointer-events-none')}
        >
            <Loading.Skeleton class={mergeClasses(taskThumbnailBaseClasses, 'border-transparent rounded-md')} />

            {!props.thumbnailOnly && (
                <div class='flex min-w-0 flex-1 flex-col items-start gap-1.5'>
                    <Loading.Skeleton class='h-3 w-3/4' />
                    <Loading.Skeleton class='h-3 w-1/2' />
                    <div class='flex w-full justify-between gap-2'>
                        <Loading.Skeleton class='h-3 w-1/2' />
                        <Loading.Skeleton class='h-3 w-1/3' />
                    </div>
                </div>
            )}
        </div>
    )
}
