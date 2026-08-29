import { createEffect, createMemo, createSignal, Show } from 'solid-js'

import { ImageStage } from '#/pages/generate/components/workspace/generate/ImageStage'
import { PromptPanel } from '#/pages/generate/components/workspace/generate/PromptPanel'
import { ImageViewer } from '#/pages/generate/components/workspace/shared/ImageViewer'
import { useGenerateDetail } from '#/pages/generate/detail'
import { useGenerateStore } from '#/pages/generate/store'
import { workspaceStore } from '#/store/workspace'

export function GenerateWorkspace() {
    const store = useGenerateStore()
    const detail = useGenerateDetail()
    const images = createMemo(() => detail.task()?.images ?? [])
    const [selectedImageIndex, setSelectedImageIndex] = createSignal(0)
    const [expanded, setExpanded] = createSignal(false)

    createEffect(() => {
        const _taskId = detail.task()?.id
        setSelectedImageIndex(0)
        setExpanded(false)
    })

    return (
        <>
            <PromptPanel />
            <ImageStage
                images={images()}
                loading={detail.loading()}
                keyboardEnabled={workspaceStore.state.modalDepth === 0 && !expanded() && !detail.loading()}
                selectedIndex={selectedImageIndex()}
                onCompare={image => {
                    const task = detail.task()

                    if (!task) {
                        return
                    }

                    workspaceStore.addCompare([{
                        image,
                        origin: {
                            taskId: task.id,
                            taskName: task.name,
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
