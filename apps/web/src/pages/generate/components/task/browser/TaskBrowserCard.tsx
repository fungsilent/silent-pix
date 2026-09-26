import { Check } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { CenteredText } from '#/components/base/CenteredText'
import { TaskStatus } from '#/components/task/TaskStatus'
import { cn } from '#/lib/cn'
import { formatDateTime } from '#/lib/format'
import { TaskFlagControls, TaskFlagOverlay } from '#/pages/generate/components/task/TaskFlag'
import { TaskThumbnail } from '#/pages/generate/components/task/TaskThumbnail'

import type { TaskApi } from '@silent-pix/shared'

type TaskBrowserCardProps = {
    focused: boolean
    checked: boolean
    task: TaskApi.TaskListItem
    flagPending: boolean
    onFocusTask: () => void
    onOpenViewer: () => void
    onToggleSelected: () => void
    onFlagChange: (flag: TaskApi.TaskFlag | null) => void
}

export function TaskBrowserCard(props: TaskBrowserCardProps) {
    const shortId = () => props.task.id.slice(0, 8)
    const title = () => props.task.name ?? shortId()

    return (
        <article
            data-task-card='true'
            data-task-id={props.task.id}
            class={cn(
                'group relative min-w-0 rounded-lg border border-transparent p-2',
                props.focused && !props.checked && 'bg-active shadow-inset',
                props.checked && !props.focused && 'border-accent bg-accent/20 ring-2 ring-accent/40',
                props.focused && props.checked && 'border-accent bg-accent/20 ring-2 ring-accent/40',
            )}
        >
            <Button
                variant='ghost'
                classes={{
                    root: cn(
                        'block w-full min-w-0 p-0 text-left hover:bg-transparent',
                        props.focused && 'focus-visible:border-transparent focus-visible:ring-0',
                    ),
                }}
                onClick={props.onOpenViewer}
            >
                <TaskThumbnail
                    thumbnail={props.task.thumbnail}
                    status={props.task.status}
                    alt={title()}
                    placeholderIconSize={26}
                    classes={{ root: 'aspect-square w-full' }}
                >
                    <TaskFlagOverlay
                        pin={props.task.pin}
                        discard={props.task.discard}
                        hasImage={Boolean(props.task.thumbnail)}
                        carrier='card'
                    />
                    <CenteredText
                        classes={{
                            root: 'absolute bottom-1 right-1 rounded-md bg-stage-overlay px-2 py-1 text-[10px] font-semibold text-stage-overlay-label shadow-sm ring-1 ring-stage-ring tabular-nums backdrop-blur-[3px]',
                        }}
                    >
                        {props.task.outputCount}
                    </CenteredText>
                </TaskThumbnail>
            </Button>
            {/* ID 行固定 size-7 的高度，操作鈕浮現時卡片高度才不會跳 */}
            <div class='relative mt-2'>
                <Button
                    variant='ghost'
                    classes={{
                        root: cn(
                            'block w-full min-w-0 p-0 text-left hover:bg-transparent',
                            props.focused && 'focus-visible:border-transparent focus-visible:ring-0',
                        ),
                    }}
                    onClick={props.onFocusTask}
                >
                    <div class='flex min-w-0 flex-col gap-2'>
                        <span
                            class='flex h-7 min-w-0 items-center truncate text-xs font-medium text-fg group-hover:pr-15'
                            classList={{ 'font-mono': !props.task.name }}
                        >
                            {title()}
                        </span>
                        <div class='flex min-w-0 items-center justify-between gap-1'>
                            <TaskStatus status={props.task.status} />
                            <span class='truncate text-[10px] leading-none text-fg-muted'>
                                {formatDateTime(props.task.createdAt)}
                            </span>
                        </div>
                    </div>
                </Button>

                <TaskFlagControls
                    pin={props.task.pin}
                    discard={props.task.discard}
                    pending={props.flagPending}
                    onChange={props.onFlagChange}
                    class='right-0 top-0 gap-0.5'
                />
            </div>

            <Button
                variant='ghost'
                data-marquee-control='true'
                classes={{
                    root: cn(
                        /* 貼著縮圖角落而不是卡片角落：內縮對齊右下角的張數 pill，兩顆浮在圖上的東西要同一個邊距 */
                        'absolute right-3.5 top-3.5 size-7 rounded-md border-0 p-0 transition-opacity',
                        props.checked
                            ? 'bg-accent text-on-stage hover:bg-accent-hover'
                            : 'pointer-events-none bg-stage-control text-on-stage/75 opacity-0 hover:bg-stage-control-hover hover:text-on-stage group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100',
                    ),
                }}
                onClick={props.onToggleSelected}
            >
                <Check
                    size={14}
                    strokeWidth={2}
                    class={cn(!props.checked && 'opacity-0')}
                />
            </Button>
        </article>
    )
}
