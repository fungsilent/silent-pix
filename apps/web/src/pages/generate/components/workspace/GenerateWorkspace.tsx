import { Splitter } from '#/components/base/Splitter'
import { scaleGroup } from '#/lib/splitter'
import { GenerateStage } from '#/pages/generate/components/workspace/GenerateStage'
import { promptMinHeight } from '#/pages/generate/components/workspace/prompt/prompt.theme'
import { PromptPanel, renderedPromptHeight } from '#/pages/generate/components/workspace/prompt/PromptPanel'
import { useGenerateSession } from '#/pages/generate/state/session'

const imageStageMinHeight = 240

export function GenerateWorkspace() {
    const generateSession = useGenerateSession()

    let workspace: HTMLElement | undefined
    const visibleKinds = () => (['positive', 'negative'] as const).filter(kind => generateSession.state.promptVisible[kind])
    const startPromptDrag = () => {
        const start = Object.fromEntries(visibleKinds().map(kind => [kind, renderedPromptHeight(workspace, kind) ?? generateSession.state.promptHeight[kind]]))
        const promptCard = workspace?.firstElementChild as HTMLElement | null
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
            <GenerateStage />
        </section>
    )
}
