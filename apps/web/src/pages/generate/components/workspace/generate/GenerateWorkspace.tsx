import { createEffect, createMemo, createSignal, Show } from 'solid-js'

import { Splitter } from '#/components/base/Splitter'
import { ImageViewer } from '#/components/viewer/ImageViewer'
import { scaleGroup } from '#/lib/splitter'
import { useCompareSession } from '#/pages/compare/state/session'
import { ImageStage } from '#/pages/generate/components/workspace/generate/ImageStage'
import { promptMinHeight } from '#/pages/generate/components/workspace/generate/prompt/prompt.theme'
import { PromptPanel, renderedPromptHeight } from '#/pages/generate/components/workspace/generate/PromptPanel'
import { useGenerateDetail } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'
import { useNavigateToRoute } from '#/routes'
import { overlayStore } from '#/store/overlay'

const imageStageMinHeight = 240

export function GenerateWorkspace() {
    const navigate = useNavigateToRoute()
    const generateSession = useGenerateSession()
    const compareSession = useCompareSession()
    const detail = useGenerateDetail()
    const imageTask = () => detail.task() ?? detail.sourceTask()
    const images = createMemo(() => imageTask()?.images ?? [])
    const [selectedImageIndex, setSelectedImageIndex] = createSignal(0)
    const [expanded, setExpanded] = createSignal(false)

    createEffect(() => {
        const _taskId = imageTask()?.id
        setSelectedImageIndex(0)
        setExpanded(false)
    })

    /* prompt 卡片與 image-stage 之間的拖曳：改開著的 editor 總高度，image-stage 至少留 240px */
    let workspace: HTMLElement | undefined
    const visibleKinds = () => (['positive', 'negative'] as const).filter(kind => generateSession.state.promptVisible[kind])
    const startPromptDrag = () => {
        const start = Object.fromEntries(visibleKinds().map(kind => [kind, renderedPromptHeight(workspace, kind) ?? generateSession.state.promptHeight[kind]]))
        const promptCard = workspace?.firstElementChild as HTMLElement | null
        /* image-stage 能讓出的空間：工作區 − prompt 卡片 − 4px 間距 − image-stage 最小高度 */
        const maxGrow = workspace && promptCard ? workspace.clientHeight - promptCard.offsetHeight - 4 - imageStageMinHeight : 0
        return (delta: number) => generateSession.setPromptHeight(scaleGroup(start, delta, { min: promptMinHeight, maxGrow }))
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
                onReset={() => generateSession.resetPromptHeight()}
                classes={{ root: 'h-1 before:absolute before:inset-x-0 before:-inset-y-1', line: 'inset-x-2' }}
            />
            <ImageStage
                images={images()}
                loading={detail.loading()}
                source={detail.task() === undefined && detail.sourceTask() !== undefined}
                keyboardEnabled={!overlayStore.isActive() && !expanded() && !detail.loading()}
                selectedIndex={selectedImageIndex()}
                onCompare={image => {
                    const task = imageTask()

                    if (!task) {
                        return
                    }

                    compareSession.addCompare([{
                        image,
                        usage: { taskId: task.id, type: 'output' },
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
                onUseAsReference={image => generateSession.setReferenceImage({ type: 'asset', image, origin: null, mask: null })}
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
