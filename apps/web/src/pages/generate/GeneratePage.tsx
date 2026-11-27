import { onCleanup, Show } from 'solid-js'

import { GenerateTaskDetail } from '#/pages/generate/components/config/GenerateTaskDetail'
import { MobileBar } from '#/pages/generate/components/mobile/MobileBar'
import { MobileTaskView } from '#/pages/generate/components/mobile/MobileTaskView'
import { TaskBrowser } from '#/pages/generate/components/task/browser/TaskBrowser'
import { TaskList } from '#/pages/generate/components/task/list/TaskList'
import { GenerateWorkspace } from '#/pages/generate/components/workspace/GenerateWorkspace'
import { createGenerateIssues } from '#/pages/generate/hooks/createGenerateIssues'
import { createGenerateTaskSelection } from '#/pages/generate/hooks/createGenerateTaskSelection'
import { GenerateDetailProvider } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'
import { appStore } from '#/store/app'

export function GeneratePage() {
    const generateSession = useGenerateSession()
    const { detail, discardDraft } = createGenerateTaskSelection()
    createGenerateIssues()
    onCleanup(generateSession.cancelReferenceImageUpload)

    const handleSubmit = (event: SubmitEvent) => {
        event.preventDefault()

        if (detail.editable()) {
            void generateSession.submit()
        }
    }

    return (
        <GenerateDetailProvider value={detail}>
            <form
                class='flex min-h-0 flex-1'
                classList={{ 'gap-1 overflow-hidden': !appStore.state.mobile, 'flex-col': appStore.state.mobile }}
                onKeyDown={event => {
                    if (
                        event.key === 'Enter'
                        && event.target instanceof HTMLInputElement
                        && !event.defaultPrevented
                        && !event.isComposing
                    ) {
                        event.preventDefault()
                    }
                }}
                onSubmit={handleSubmit}
            >
                <Show
                    when={!appStore.state.mobile}
                    fallback={<GenerateMobileLayout />}
                >
                    <GenerateDesktopLayout onDiscardDraft={discardDraft} />
                </Show>
            </form>
        </GenerateDetailProvider>
    )
}

/* MARK: GenerateDesktopLayout */
type GenerateDesktopLayoutProps = {
    onDiscardDraft: () => void
}

function GenerateDesktopLayout(props: GenerateDesktopLayoutProps) {
    const generateSession = useGenerateSession()

    return (
        <>
            <Show
                when={generateSession.state.browserOpen}
                fallback={(
                    <>
                        <TaskList onDiscardDraft={props.onDiscardDraft} />
                        <GenerateWorkspace />
                    </>
                )}
            >
                <TaskBrowser />
            </Show>
            <GenerateTaskDetail />
        </>
    )
}

/* MARK: GenerateMobileLayout */
function GenerateMobileLayout() {
    return (
        <>
            <MobileTaskView />
            <MobileBar />
        </>
    )
}
