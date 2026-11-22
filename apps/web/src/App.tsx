import { MultiProvider } from '@solid-primitives/context'
import { HashRouter, Navigate, Route, Router } from '@solidjs/router'
import { useQueryClient } from '@tanstack/solid-query'
import { onCleanup, onMount } from 'solid-js'

import { Header } from '#/components/Header'
import { startServerEvents } from '#/features/event/event.client'
import { getPlatform } from '#/lib/platform'
import { ComparePage } from '#/pages/compare/ComparePage'
import { GeneratePage } from '#/pages/generate/GeneratePage'
import { GenerateSessionProvider } from '#/pages/generate/session'
import { MetadataPage } from '#/pages/metadata/MetadataPage'
import { SettingsPage } from '#/pages/settings/SettingsPage'
import { WorkflowSessionProvider } from '#/pages/workflow/session'
import { WorkflowPage } from '#/pages/workflow/WorkflowPage'
import { routePaths } from '#/routes'

import type { RouteSectionProps } from '@solidjs/router'

export function App() {
    const platform = getPlatform()
    const PlatformRouter = platform.kind === 'desktop' ? HashRouter : Router
    const EntryRedirect = () => <Navigate href={routePaths[platform.endpoint ? 'generate' : 'settings']} />

    return (
        <PlatformRouter root={AppLayout}>
            {platform.endpoint && (
                <>
                    <Route
                        path={routePaths.generate}
                        component={GeneratePage}
                    />
                    <Route
                        path={routePaths.compare}
                        component={ComparePage}
                    />
                    <Route
                        path={routePaths.workflow}
                        component={WorkflowPage}
                    />
                </>
            )}
            <Route
                path={routePaths.metadata}
                component={MetadataPage}
            />
            <Route
                path={routePaths.settings}
                component={SettingsPage}
            />
            <Route
                path={['/', '/*rest']}
                component={EntryRedirect}
            />
        </PlatformRouter>
    )
}

function AppLayout(props: RouteSectionProps) {
    const queryClient = useQueryClient()
    const platform = getPlatform()

    onMount(() => {
        if (platform.endpoint) onCleanup(startServerEvents(queryClient))
    })

    return (
        <main class='flex h-dvh flex-col overflow-hidden bg-shell text-fg'>
            <Header />
            <div class='flex min-h-0 flex-1 flex-col px-1 pb-1'>
                {platform.endpoint
                    ? (
                        <MultiProvider
                            values={[
                                GenerateSessionProvider,
                                WorkflowSessionProvider,
                            ]}
                        >
                            {props.children}
                        </MultiProvider>
                    )
                    : props.children}
            </div>
        </main>
    )
}
