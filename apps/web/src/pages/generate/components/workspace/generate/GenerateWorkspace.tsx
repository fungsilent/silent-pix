import { createEffect, createMemo, createSignal, Show } from 'solid-js'

import { Splitter } from '#/components/base/Splitter'
import { ImageViewer } from '#/components/viewer/ImageViewer'
import { scaleGroup } from '#/lib/splitter'
import { ImageStage } from '#/pages/generate/components/workspace/generate/ImageStage'
import { promptMinHeight } from '#/pages/generate/components/workspace/generate/prompt/prompt.theme'
import { PromptPanel, renderedPromptHeight } from '#/pages/generate/components/workspace/generate/PromptPanel'
import { useGenerateDetail } from '#/pages/generate/detail'
import { useGenerateSession } from '#/pages/generate/session'
import { useNavigateToRoute } from '#/routes'
import { compareStore } from '#/store/compare'
import { overlayStore } from '#/store/overlay'

const imageStageMinHeight = 240

export function GenerateWorkspace() {
    const navigate = useNavigateToRoute()
    const store = useGenerateSession()
    const detail = useGenerateDetail()
    const images = createMemo(() => detail.task()?.images ?? [])
    const [selectedImageIndex, setSelectedImageIndex] = createSignal(0)
    const [expanded, setExpanded] = createSignal(false)

    createEffect(() => {
        const _taskId = detail.task()?.id
        setSelectedImageIndex(0)
        setExpanded(false)
    })

    /* prompt 卡片與 image-stage 之間的拖曳：改開著的 editor 總高度，image-stage 至少留 240px */
    let workspace: HTMLElement | undefined
    const visibleKinds = () => (['positive', 'negative'] as const).filter(kind => store.state.promptVisible[kind])
    const startPromptDrag = () => {
        const start = Object.fromEntries(visibleKinds().map(kind => [kind, renderedPromptHeight(workspace, kind) ?? store.state.promptHeight[kind]]))
        const promptCard = workspace?.firstElementChild as HTMLElement | null
        /* image-stage 能讓出的空間：工作區 − prompt 卡片 − 4px 間距 − image-stage 最小高度 */
        const maxGrow = workspace && promptCard ? workspace.clientHeight - promptCard.offsetHeight - 4 - imageStageMinHeight : 0
        return (delta: number) => store.setPromptHeight(scaleGroup(start, delta, { min: promptMinHeight, maxGrow }))
    }

    return (
        <section
            ref={element => { workspace = element }}
            class='flex h-full min-h-0 min-w-0 flex-1 flex-col'
        >
            <PromptPanel />
            <Splitter
                disabled={visibleKinds().length === 0}
                onDragStart={startPromptDrag}
                onReset={() => store.resetPromptHeight()}
                classes={{ root: 'h-1 before:absolute before:inset-x-0 before:-inset-y-1', line: 'inset-x-2' }}
            />
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
                        usage: {
                            taskId: task.id,
                            taskName: task.name,
                            type: 'output',
                            sortIndex: selectedImageIndex(),
                        },
                        hidden: false,
                    }])
                    navigate('compare')
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
