import { Show } from 'solid-js'

import { GenerateTaskDetail } from '#/pages/generate/components/config/GenerateTaskDetail'
import { TaskBrowser } from '#/pages/generate/components/task/browser/TaskBrowser'
import { TaskList } from '#/pages/generate/components/task/list/TaskList'
import { GenerateWorkspace } from '#/pages/generate/components/workspace/generate/GenerateWorkspace'
import { createGenerateTaskSelection } from '#/pages/generate/hooks/createGenerateTaskSelection'
import { GenerateDetailProvider } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'

export function GeneratePage() {
    const generateSession = useGenerateSession()
    const { detail, discardDraft } = createGenerateTaskSelection()

    const handleSubmit = (event: SubmitEvent) => {
        event.preventDefault()

        if (!detail.loading() && !detail.error()) {
            void generateSession.submit()
        }
    }

    return (
        <GenerateDetailProvider value={detail}>
            <form
                class='flex min-h-0 flex-1 gap-1 overflow-hidden'
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
                    when={generateSession.state.browserOpen}
                    fallback={(
                        <>
                            <TaskList onDiscardDraft={discardDraft} />
                            <GenerateWorkspace />
                        </>
                    )}
                >
                    <TaskBrowser />
                </Show>
                <GenerateTaskDetail />
            </form>
        </GenerateDetailProvider>
    )
}
