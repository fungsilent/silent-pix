import { createEffect, createMemo, createSignal, Show } from 'solid-js'

import { ImageStage } from '#/pages/generate/components/workspace/ImageStage'
import { ImageViewer } from '#/pages/generate/components/workspace/ImageViewer'
import { PromptPanel } from '#/pages/generate/components/workspace/PromptPanel'
import { useGenerateStore } from '#/pages/generate/store'

import type { GenerateIssue } from '#/pages/generate/issue'
import type { GenerateTask } from '#/pages/generate/store'

type WorkspaceProps = {
    task: GenerateTask
    isSubmitting?: boolean | undefined
    submitIssues: GenerateIssue[]
    submitToken: number
}

export function Workspace(props: WorkspaceProps) {
    const store = useGenerateStore()
    const images = createMemo(() => props.task.images ?? [])
    const [selectedImageIndex, setSelectedImageIndex] = createSignal(0)
    const [expanded, setExpanded] = createSignal(false)

    createEffect(() => {
        const _taskId = props.task.id
        setSelectedImageIndex(0)
        setExpanded(false)
    })

    return (
        <section
            class='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas'
            aria-label='Generate workspace'
        >
            <PromptPanel
                task={props.task}
                isSubmitting={props.isSubmitting}
                submitIssues={props.submitIssues}
                submitToken={props.submitToken}
            />
            <ImageStage
                images={images()}
                keyboardEnabled={!expanded()}
                selectedIndex={selectedImageIndex()}
                onExpand={() => {
                    if (images().length > 0) {
                        setExpanded(true)
                    }
                }}
                onSelect={setSelectedImageIndex}
                onUseAsReference={image => store.setReferenceImage({ type: 'asset', image, origin: null })}
            />

            <Show when={expanded()}>
                <ImageViewer
                    images={images()}
                    selectedIndex={selectedImageIndex()}
                    onClose={() => setExpanded(false)}
                    onSelect={setSelectedImageIndex}
                />
            </Show>
        </section>
    )
}
