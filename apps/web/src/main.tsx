import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { render } from 'solid-js/web'

import { initializeApiClient } from '#/api/api.client'
import { App } from '#/App'
import { shouldRetryQuery } from '#/lib/error'
import { i18nReady, t } from '#/lib/i18n'
import { initializePlatform } from '#/lib/platform'

import '@fontsource-variable/manrope'
import '@fontsource-variable/noto-sans-tc/wght.css'
import '#/styles.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
    throw new Error('Root element not found')
}
const root = rootElement

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: shouldRetryQuery,
            /* 本機後端，退避不需要拉到預設的 1s/2s/4s */
            retryDelay: attempt => Math.min(400 * 2 ** attempt, 2_000),
        },
    },
})

async function startApp(): Promise<void> {
    try {
        await i18nReady
        const platform = await initializePlatform()
        if (platform.endpoint) {
            initializeApiClient(platform.endpoint)
        }

        render(
            () => (
                <QueryClientProvider client={queryClient}>
                    <App />
                </QueryClientProvider>
            ),
            root,
        )
    }
    catch (error) {
        const message = error instanceof Error ? error.message : t('errors.startup')
        render(() => (
            <main class='flex h-dvh items-center justify-center bg-canvas p-6 text-sm text-danger-fg'>
                {message}
            </main>
        ), root)
    }
}

void startApp()
