import { createEffect, createMemo, createSignal, on, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { ImageViewer } from '#/components/viewer/ImageViewer'
import { useGenerateDetail } from '#/pages/generate/detail'

import type { Accessor } from 'solid-js'

type TaskBrowserViewerProps = {
    taskId: Accessor<string | undefined>
    onClose: () => void
}

export function TaskBrowserViewer(props: TaskBrowserViewerProps) {
    const detail = useGenerateDetail()
    const [viewerIndex, setViewerIndex] = createSignal(0)

    createEffect(on(props.taskId, () => setViewerIndex(0)))

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
                        Loading task outputs...
                    </span>
                </div>
            </Show>
            <Show when={props.taskId() && detail.error()}>
                <TaskViewerMessage
                    message='Failed to load task outputs.'
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
                    message='This task has no outputs yet.'
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
                    actions={null}
                    onClose={props.onClose}
                    onSelect={setViewerIndex}
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
                    classes={{ root: 'h-6 px-2 text-[11px]' }}
                    onClick={props.onClose}
                >
                    Close
                </Button>
            </div>
        </div>
    )
}
