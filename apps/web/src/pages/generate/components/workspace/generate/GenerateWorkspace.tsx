import { createEffect, createMemo, createSignal, Show } from 'solid-js'

import { useTaskDetailQuery } from '#/features/task/task.query'
import { ImageStage } from '#/pages/generate/components/workspace/generate/ImageStage'
import { PromptPanel } from '#/pages/generate/components/workspace/generate/PromptPanel'
import { ImageViewer } from '#/pages/generate/components/workspace/shared/ImageViewer'
import { draftTask, useGenerateStore } from '#/pages/generate/store'
import { taskStore } from '#/store/task'
import { workspaceStore } from '#/store/workspace'

export function GenerateWorkspace() {
    const store = useGenerateStore()
    const taskDetailQuery = useTaskDetailQuery(() => taskStore.state.selectedTaskId)
    const task = () => taskStore.state.selectedTaskId
        ? taskDetailQuery.data
        : draftTask
    const images = createMemo(() => task()?.images ?? [])
    const [selectedImageIndex, setSelectedImageIndex] = createSignal(0)
    const [expanded, setExpanded] = createSignal(false)

    createEffect(() => {
        const _taskId = task()?.id
        setSelectedImageIndex(0)
        setExpanded(false)
    })

    return (
        <Show when={task()}>
            {activeTask => (
                <>
                    <PromptPanel />
                    <ImageStage
                        images={images()}
                        keyboardEnabled={workspaceStore.state.modalDepth === 0 && !expanded()}
                        selectedIndex={selectedImageIndex()}
                        onCompare={image => {
                            workspaceStore.addCompare([{
                                image,
                                origin: {
                                    taskId: activeTask().id,
                                    taskName: activeTask().name,
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
            )}
        </Show>
    )
}
