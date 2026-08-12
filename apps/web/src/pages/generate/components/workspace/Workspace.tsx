import { createEffect, createMemo, createSignal } from 'solid-js'

import { ImageStage } from '#/pages/generate/components/workspace/ImageStage'
import { PromptPanel } from '#/pages/generate/components/workspace/PromptPanel'

import type { GenerateTask } from '#/pages/generate/store'

type WorkspaceProps = {
    task: GenerateTask
    isSubmitting?: boolean | undefined
    submitError?: string | undefined
}

export function Workspace(props: WorkspaceProps) {
    const images = createMemo(() => props.task.images ?? [])
    const [selectedImageIndex, setSelectedImageIndex] = createSignal(0)

    createEffect(() => {
        const _taskId = props.task.id
        setSelectedImageIndex(0)
    })

    return (
        <section
            class='flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-auto bg-canvas p-3'
            aria-label='Generate workspace'
        >
            <PromptPanel
                task={props.task}
                isSubmitting={props.isSubmitting}
                submitError={props.submitError}
            />
            <ImageStage
                images={images()}
                selectedIndex={selectedImageIndex()}
                onSelect={setSelectedImageIndex}
            />
        </section>
    )
}
