import { createSignal, onCleanup, Show } from 'solid-js'

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
import { mergeClasses } from '#/utils/style'

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
                    fallback={<GenerateMobileLayout onDiscardDraft={discardDraft} />}
                >
                    <GenerateDesktopLayout onDiscardDraft={discardDraft} />
                </Show>
            </form>
        </GenerateDetailProvider>
    )
}

type GenerateLayoutProps = {
    onDiscardDraft: () => void
}

/* MARK: GenerateDesktopLayout */
function GenerateDesktopLayout(props: GenerateLayoutProps) {
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
function GenerateMobileLayout(props: GenerateLayoutProps) {
    const [tasksOpen, setTasksOpen] = createSignal(false)

    return (
        <>
            <MobileTaskView />
            <div
                data-scroll-lock={tasksOpen() ? '' : undefined}
                inert={!tasksOpen()}
                class={mergeClasses(
                    'fixed inset-x-0 top-9 bottom-0 z-[25] flex bg-shell px-1 pb-1 transition-[translate,visibility] duration-200 ease-out motion-reduce:transition-none',
                    !tasksOpen() && 'invisible -translate-x-full',
                )}
            >
                <TaskList
                    fill
                    onDiscardDraft={props.onDiscardDraft}
                    onOpen={() => {
                        setTasksOpen(false)
                        window.scrollTo({ top: 0 })
                    }}
                />
            </div>
            <MobileBar
                tasksOpen={tasksOpen()}
                onToggleTasks={() => setTasksOpen(open => !open)}
            />
        </>
    )
}
