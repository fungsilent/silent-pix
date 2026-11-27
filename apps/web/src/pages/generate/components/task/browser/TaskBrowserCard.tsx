import { Check } from 'lucide-solid'
import { Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { CenteredText } from '#/components/base/CenteredText'
import { TaskFlagOverlay } from '#/components/task/TaskFlagOverlay'
import { TaskStatus } from '#/components/task/TaskStatus'
import { createLongPress } from '#/lib/interaction'
import { TaskFlagControls } from '#/pages/generate/components/task/TaskFlag'
import { TaskThumbnail } from '#/pages/generate/components/task/TaskThumbnail'
import { formatDate, formatTime } from '#/utils/date'
import { mergeClasses } from '#/utils/style'

import type { TaskApi } from '@silent-pix/shared'

type TaskBrowserCardProps = {
    focused: boolean
    checked: boolean
    task: TaskApi.TaskListItem
    flagPending: boolean
    onFocusTask: () => void
    onOpenViewer: () => void
    onToggleSelected: () => void
    onToggleByClick: () => void
    onFlagChange: (flag: TaskApi.TaskFlag | null) => void
    mobile?: boolean | undefined
    selecting?: boolean | undefined
}

export function TaskBrowserCard(props: TaskBrowserCardProps) {
    const shortId = () => props.task.id.slice(0, 8)
    const title = () => props.task.name ?? shortId()
    const viewable = () => props.task.outputCount > 0
    const longPress = createLongPress({
        onLongPress: () => {
            if (!props.checked) props.onToggleSelected()
        },
    })
    const clickCapture = (event: MouseEvent) => {
        longPress.onClickCapture(event)
        if (event.defaultPrevented || !props.selecting) return

        event.preventDefault()
        event.stopPropagation()
        props.onToggleSelected()
    }
    const withToggle = (action: () => void) => (event: MouseEvent) => {
        if (!props.mobile && (event.ctrlKey || event.metaKey)) {
            props.onToggleByClick()
            return
        }

        action()
    }

    return (
        <article
            data-task-card='true'
            data-task-id={props.task.id}
            onPointerDown={props.mobile ? longPress.onPointerDown : undefined}
            onPointerMove={props.mobile ? longPress.onPointerMove : undefined}
            onPointerUp={props.mobile ? longPress.onPointerUp : undefined}
            onPointerCancel={props.mobile ? longPress.onPointerUp : undefined}
            onPointerLeave={props.mobile ? longPress.onPointerUp : undefined}
            ref={element => element.addEventListener('click', clickCapture, true)}
            onContextMenu={props.mobile ? event => event.preventDefault() : undefined}
            class={mergeClasses(
                'group relative min-w-0 rounded-lg border border-transparent p-2',
                props.mobile && 'select-none [-webkit-touch-callout:none]',
                props.focused && !props.checked && 'bg-selected',
                !props.focused && !props.checked && 'hover:bg-hover',
                props.checked && !props.focused && 'border-accent bg-accent/20 ring-2 ring-accent/40',
                props.focused && props.checked && 'border-accent bg-accent/20 ring-2 ring-accent/40',
            )}
        >
            <Button
                variant='ghost'
                classes={{
                    root: mergeClasses(
                        'block w-full min-w-0 p-0 text-left hover:bg-transparent',
                        viewable() && !props.selecting && 'cursor-zoom-in',
                        props.focused && 'focus-visible:border-transparent focus-visible:ring-0',
                    ),
                }}
                onClick={event => withToggle(viewable() ? props.onOpenViewer : props.onFocusTask)(event)}
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
                        dim={Boolean(props.task.thumbnail)}
                        carrier='card'
                    />
                    {/* 張數只在批次生成（2 張以上）時有意義 */}
                    <Show when={props.task.outputCount >= 2}>
                        <CenteredText
                            classes={{
                                root: 'absolute bottom-1 right-1 rounded-md bg-stage-overlay px-2 py-1 text-[10px] font-semibold text-stage-overlay-label shadow-sm ring-1 ring-stage-ring tabular-nums backdrop-blur-[3px]',
                            }}
                        >
                            {props.task.outputCount}
                        </CenteredText>
                    </Show>
                </TaskThumbnail>
            </Button>
            {/* ID 行固定 size-7 的高度，操作鈕浮現時卡片高度才不會跳 */}
            <div class='relative mt-2'>
                <Button
                    variant='ghost'
                    classes={{
                        root: mergeClasses(
                            'block w-full min-w-0 p-0 text-left hover:bg-transparent',
                            props.focused && 'focus-visible:border-transparent focus-visible:ring-0',
                        ),
                    }}
                    onClick={withToggle(props.onFocusTask)}
                >
                    <div class='flex min-w-0 flex-col gap-2'>
                        <span
                            class='flex h-7 min-w-0 items-center truncate text-xs font-medium text-fg group-hover:mr-15 touch:mr-15'
                            classList={{ 'font-mono': !props.task.name }}
                        >
                            {title()}
                        </span>
                        <div class={mergeClasses('flex min-w-0 gap-1', props.mobile ? 'flex-col items-start gap-1.5' : 'items-center justify-between')}>
                            <TaskStatus status={props.task.status} />
                            {/* 日期與時間分開一點，較易讀 */}
                            <span class='flex shrink-0 gap-1.5 text-[10px] leading-none text-fg-muted tabular-nums'>
                                <span>{formatDate(props.task.createdAt)}</span>
                                <span>{formatTime(props.task.createdAt)}</span>
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
                    root: mergeClasses(
                        'absolute right-3.5 top-3.5 size-6 rounded-md border-0 p-0 transition-opacity',
                        props.checked
                            ? 'bg-accent text-on-stage hover:bg-accent-hover'
                            : props.selecting
                                ? 'bg-stage-control text-on-stage/75'
                                : 'pointer-events-none bg-stage-control text-on-stage/75 opacity-0 hover:bg-stage-control-hover hover:text-on-stage group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100',
                    ),
                }}
                onClick={props.onToggleSelected}
            >
                <Check
                    size={14}
                    strokeWidth={2}
                    class={mergeClasses(!props.checked && 'opacity-0')}
                />
            </Button>
        </article>
    )
}
