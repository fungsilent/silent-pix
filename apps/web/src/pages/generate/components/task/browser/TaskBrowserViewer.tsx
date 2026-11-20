import { FlagOff, FlagTriangleRight, HeartX } from 'lucide-solid'
import { createEffect, createMemo, createSignal, For, on, onCleanup, onMount, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { ImageViewer } from '#/components/viewer/ImageViewer'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'
import { isEditableTarget } from '#/lib/keyboard'
import { useGenerateDetail } from '#/pages/generate/detail'

import type { TaskApi } from '@silent-pix/shared'
import type { LucideProps } from 'lucide-solid'
import type { Accessor, Component } from 'solid-js'

type TaskBrowserViewerProps = {
    taskId: Accessor<string | undefined>
    task: Accessor<TaskApi.TaskListItem | undefined>
    flagPending: boolean
    onFlagChange: (taskId: string, flag: TaskApi.TaskFlag | null) => void
    onClose: () => void
}

export function TaskBrowserViewer(props: TaskBrowserViewerProps) {
    const detail = useGenerateDetail()
    const [viewerIndex, setViewerIndex] = createSignal(0)


    createEffect(on(props.taskId, () => setViewerIndex(0)))


    const setFlag = (flag: TaskApi.TaskFlag | null) => {
        const id = props.taskId()

        if (id && !props.flagPending) {
            props.onFlagChange(id, flag)
        }
    }

    /* U／P／X 立即生效並留在目前這張；焦點在輸入框時不攔 */
    const handleKeyDown = (event: KeyboardEvent) => {
        if (!props.taskId() || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) {
            return
        }

        const flag = ({ u: null, p: 'pin', x: 'discard' } as const)[event.key.toLowerCase() as 'u' | 'p' | 'x']

        if (flag !== undefined) {
            event.preventDefault()
            setFlag(flag)
        }
    }

    onMount(() => window.addEventListener('keydown', handleKeyDown))
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown))

    const current = (): 'unflag' | TaskApi.TaskFlag => {
        const task = props.task()
        return task?.pin ? 'pin' : task?.discard ? 'discard' : 'unflag'
    }

    const viewerImages = createMemo(() => {
        const id = props.taskId()
        const task = detail.task()

        if (!id || detail.loading() || detail.error() || !task || task.id !== id) {
            return []
        }

        return task.images
    })

    createEffect(() => {
        const count = viewerImages().length

        if (count > 0) {
            setViewerIndex(index => Math.min(index, count - 1))
        }
    })

    return (
        <>
            <Show when={props.taskId() && detail.loading()}>
                <div
                    class='pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center'
                >
                    <span class='rounded-md border border-line bg-surface px-3 py-2 text-xs text-fg-muted shadow-lg'>
                        {t('task.outputs.loading')}
                    </span>
                </div>
            </Show>
            <Show when={props.taskId() && detail.error()}>
                <TaskViewerMessage
                    message={t('task.outputs.failed')}
                    onClose={props.onClose}
                />
            </Show>
            <Show
                when={props.taskId()
                    && !detail.loading()
                    && !detail.error()
                    && detail.task()?.id === props.taskId()
                    && viewerImages().length === 0}
            >
                <TaskViewerMessage
                    message={t('task.outputs.empty')}
                    onClose={props.onClose}
                />
            </Show>

            <Show
                when={props.taskId()
                    && !detail.loading()
                    && !detail.error()
                    && detail.task()?.id === props.taskId()
                    && viewerImages().length > 0}
            >
                <ImageViewer
                    images={viewerImages()}
                    selectedIndex={viewerIndex()}
                    onClose={props.onClose}
                    onSelect={setViewerIndex}
                    review={{
                        controls: (
                            <ReviewFlagBar
                                current={current()}
                                pending={props.flagPending}
                                onChange={setFlag}
                            />
                        ),
                    }}
                />
            </Show>
        </>
    )
}

type TaskViewerMessageProps = {
    message: string
    onClose: () => void
}

function TaskViewerMessage(props: TaskViewerMessageProps) {
    return (
        <div class='pointer-events-none fixed inset-x-0 bottom-4 z-20 flex justify-center'>
            <div class='pointer-events-auto flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs text-fg-muted shadow-lg'>
                <span>{props.message}</span>
                <Button
                    variant='ghost'
                    size='compact'
                    onClick={props.onClose}
                >
                    {t('common.close')}
                </Button>
            </div>
        </div>
    )
}

/* MARK: ReviewFlagBar */
type ReviewFlagBarProps = {
    current: 'unflag' | TaskApi.TaskFlag
    pending: boolean
    onChange: (flag: TaskApi.TaskFlag | null) => void
}

const reviewTone = {
    unflag: { active: 'bg-on-stage/20 text-on-stage', idle: 'text-on-stage/70 hover:bg-stage-control-hover hover:text-on-stage' },
    pin: { active: 'bg-pin text-pin-ink hover:bg-pin-hover', idle: 'bg-pin/25 text-on-stage/85 hover:bg-pin/35' },
    discard: { active: 'bg-discard text-discard-ink hover:bg-discard-hover', idle: 'bg-discard/25 text-on-stage/85 hover:bg-discard/35' },
}

function ReviewFlagBar(props: ReviewFlagBarProps) {
    const items: { flag: 'unflag' | TaskApi.TaskFlag, key: string, label: () => string, Icon: Component<LucideProps> }[] = [
        { flag: 'unflag', key: 'U', label: () => t('task.filter.unflag'), Icon: FlagOff },
        { flag: 'pin', key: 'P', label: () => t('task.filter.pin'), Icon: FlagTriangleRight },
        { flag: 'discard', key: 'X', label: () => t('task.filter.discard'), Icon: HeartX },
    ]

    return (
        <div class='flex h-8 items-center gap-0.5 rounded-md border border-stage-line bg-stage-control p-0.5 backdrop-blur-[8px]'>
            <For each={items}>
                {item => (
                    <Button
                        variant='ghost'
                        title={item.label()}
                        disabled={props.pending}
                        classes={{
                            root: cn(
                                'h-7 gap-1.5 rounded border-0 px-2',
                                props.current === item.flag ? reviewTone[item.flag].active : reviewTone[item.flag].idle,
                            ),
                        }}
                        onClick={() => props.onChange(item.flag === 'unflag' ? null : item.flag)}
                    >
                        <item.Icon
                            size={13}
                            strokeWidth={1.8}
                        />
                        <span class='ml-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-sm border border-current/30 px-0.5 text-[9px] leading-none opacity-60'>
                            {item.key}
                        </span>
                    </Button>
                )}
            </For>
        </div>
    )
}
