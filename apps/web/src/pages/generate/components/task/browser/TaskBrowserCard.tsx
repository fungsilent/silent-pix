import { Check } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { CenteredText } from '#/components/base/CenteredText'
import { TaskStatus } from '#/components/task/TaskStatus'
import { cn } from '#/lib/cn'
import { formatDateTime } from '#/lib/format'
import { TaskFlagControls } from '#/pages/generate/components/task/TaskFlagControls'
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
                props.task.discard && !props.focused && !props.checked && 'opacity-65 grayscale-[.15]',
                props.focused && !props.checked && 'border-accent/60 bg-active shadow-[0_0_0_1px_rgba(37,99,235,0.14),0_1px_12px_rgba(37,99,235,0.12)]',
                props.checked && !props.focused && 'border-accent bg-accent/20 ring-2 ring-accent/40',
                props.focused && props.checked && 'border-accent bg-accent/20 ring-2 ring-accent/40 shadow-[0_0_0_1px_rgba(37,99,235,0.14),0_1px_12px_rgba(37,99,235,0.12)]',
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
                    <CenteredText
                        classes={{
                            root: 'absolute bottom-1 right-1 rounded-md bg-black/75 px-2 py-1 text-[10px] font-semibold text-white/90 shadow-sm ring-1 ring-white/10 tabular-nums backdrop-blur-[3px]',
                        }}
                    >
                        {props.task.outputCount}
                    </CenteredText>
                </TaskThumbnail>
            </Button>
            <Button
                variant='ghost'
                classes={{
                    root: cn(
                        'mt-2 block w-full min-w-0 p-0 text-left hover:bg-transparent',
                        props.focused && 'focus-visible:border-transparent focus-visible:ring-0',
                    ),
                }}
                onClick={props.onFocusTask}
            >
                <div class='flex min-w-0 flex-col gap-2'>
                    <span
                        class='truncate text-xs font-medium leading-none text-fg'
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
                classes={{
                    root: 'left-2.5 top-2.5 gap-1',
                    pinActive: 'bg-amber-500/90 text-amber-950 hover:bg-amber-400',
                    pinInactive: 'bg-black/60 text-white/75 hover:bg-black/80 hover:text-white',
                    discardActive: 'bg-rose-500/90 text-rose-950 hover:bg-rose-400',
                    discardInactive: 'bg-black/60 text-white/75 hover:bg-black/80 hover:text-white',
                }}
            />

            <Button
                variant='ghost'
                data-marquee-control='true'
                classes={{
                    root: cn(
                        'absolute right-2.5 top-2.5 size-7 rounded-md border-0 p-0 transition-opacity',
                        props.checked
                            ? 'bg-accent text-white'
                            : 'pointer-events-none bg-black/60 text-white/75 opacity-0 hover:bg-black/80 hover:text-white group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100',
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
