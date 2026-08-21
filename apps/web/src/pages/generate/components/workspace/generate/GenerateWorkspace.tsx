import { createEffect, createMemo, createSignal, Show } from 'solid-js'

import { ImageStage } from '#/pages/generate/components/workspace/generate/ImageStage'
import { PromptPanel } from '#/pages/generate/components/workspace/generate/PromptPanel'
import { ImageViewer } from '#/pages/generate/components/workspace/shared/ImageViewer'
import { useGenerateStore } from '#/pages/generate/store'
import { workspaceStore } from '#/store/workspace'

import type { GenerateIssue } from '#/pages/generate/issue'
import type { GenerateTask } from '#/pages/generate/store'

export type GenerateWorkspaceProps = {
    task: GenerateTask
    isSubmitting?: boolean | undefined
    submitIssues: GenerateIssue[]
    submitToken: number
}

export function GenerateWorkspace(props: GenerateWorkspaceProps) {
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
        <>
            <PromptPanel
                task={props.task}
                isSubmitting={props.isSubmitting}
                submitIssues={props.submitIssues}
                submitToken={props.submitToken}
            />
            <ImageStage
                images={images()}
                keyboardEnabled={workspaceStore.state.modalDepth === 0 && !expanded()}
                selectedIndex={selectedImageIndex()}
                onCompare={image => {
                    workspaceStore.addCompare([{
                        image,
                        origin: {
                            taskId: props.task.id,
                            taskName: props.task.name,
                            type: 'output',
                            sortIndex: selectedImageIndex(),
                        },
                        hidden: false,
                    }])
                    workspaceStore.setMode('compare')
                }}
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
        </>
    )
}
