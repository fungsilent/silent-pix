import { useQueryClient } from '@tanstack/solid-query'
import { Match, onCleanup, onMount, Switch } from 'solid-js'

import { Header } from '#/components/Header'
import { startServerEvents } from '#/features/event/event.client'
import { getPlatform } from '#/lib/platform'
import { ComparePage } from '#/pages/compare/ComparePage'
import { GeneratePage } from '#/pages/generate/GeneratePage'
import { SettingsPage } from '#/pages/settings/SettingsPage'
import { WorkflowPage } from '#/pages/workflow/WorkflowPage'
import { appStore } from '#/store/app'

export function App() {
    const queryClient = useQueryClient()
    const platform = getPlatform()

    if (!platform.endpoint) {
        return (
            <main class='flex h-dvh flex-col overflow-hidden bg-canvas text-fg'>
                <SettingsPage />
            </main>
        )
    }

    onMount(() => {
        onCleanup(startServerEvents(queryClient))
    })

    return (
        <main class='flex h-dvh flex-col overflow-hidden bg-canvas text-fg'>
            <Header />
            <Switch>
                <Match when={appStore.state.page === 'generate'}>
                    <GeneratePage />
                </Match>
                <Match when={appStore.state.page === 'compare'}>
                    <ComparePage />
                </Match>
                <Match when={appStore.state.page === 'workflow'}>
                    <WorkflowPage />
                </Match>
                <Match when={appStore.state.page === 'settings'}>
                    <SettingsPage />
                </Match>
            </Switch>
        </main>
    )
}
