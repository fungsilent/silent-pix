import { createEffect, createMemo, createSignal, on, Show } from 'solid-js'

import { ImageViewer } from '#/components/viewer/ImageViewer'
import { useCompareSession } from '#/pages/compare/state/session'
import { ImageStage } from '#/pages/generate/components/workspace/ImageStage'
import { useGenerateDetail } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'
import { useNavigateToRoute } from '#/routes'
import { overlayStore } from '#/store/overlay'

type GenerateStageProps = {
    class?: string | undefined
    onSurfaceClick?: (() => void) | undefined
    fit?: { covered: number, peek: number } | undefined
}

export function GenerateStage(props: GenerateStageProps) {
    const navigate = useNavigateToRoute()
    const generateSession = useGenerateSession()
    const compareSession = useCompareSession()
    const detail = useGenerateDetail()
    const imageTask = () => detail.task() ?? detail.sourceTask()
    const images = createMemo(() => imageTask()?.images ?? [])
    const [expanded, setExpanded] = createSignal(false)

    createEffect(on(() => imageTask()?.id, () => setExpanded(false)))

    return (
        <>
            <ImageStage
                images={images()}
                loading={detail.loading()}
                source={detail.task() === undefined && detail.sourceTask() !== undefined}
                keyboardEnabled={!overlayStore.isActive() && !expanded() && !detail.loading()}
                selectedIndex={detail.imageIndex()}
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
                onSelect={detail.selectImage}
                onUseAsReference={image => generateSession.setReferenceImage({ type: 'asset', image, origin: null, mask: null })}
                onSurfaceClick={props.onSurfaceClick}
                fit={props.fit}
                class={props.class}
            />

            <Show when={expanded()}>
                <ImageViewer
                    images={images()}
                    selectedIndex={detail.imageIndex()}
                    onClose={() => setExpanded(false)}
                    onSelect={detail.selectImage}
                />
            </Show>
        </>
    )
}
