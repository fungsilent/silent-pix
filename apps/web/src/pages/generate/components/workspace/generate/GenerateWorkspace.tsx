import { createEffect, createMemo, createSignal, Show } from 'solid-js'

import { ImageViewer } from '#/components/viewer/ImageViewer'
import { ImageStage } from '#/pages/generate/components/workspace/generate/ImageStage'
import { PromptPanel } from '#/pages/generate/components/workspace/generate/PromptPanel'
import { useGenerateDetail } from '#/pages/generate/detail'
import { useGenerateStore } from '#/pages/generate/store'
import { appStore } from '#/store/app'
import { compareStore } from '#/store/compare'
import { overlayStore } from '#/store/overlay'

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
        <section
            class='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas'
        >
            <PromptPanel />
            <ImageStage
                images={images()}
                loading={detail.loading()}
                keyboardEnabled={!overlayStore.isActive() && !expanded() && !detail.loading()}
                selectedIndex={selectedImageIndex()}
                onCompare={image => {
                    const task = detail.task()

                    if (!task) {
                        return
                    }

                    compareStore.addCompare([{
                        image,
                        origin: {
                            taskId: task.id,
                            taskName: task.name,
                            type: 'output',
                            sortIndex: selectedImageIndex(),
                        },
                        hidden: false,
                    }])
                    appStore.setPage('compare')
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
        </section>
    )
}
