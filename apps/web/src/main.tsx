import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { render } from 'solid-js/web'

import { App } from '#/App'
import { shouldRetryQuery } from '#/lib/error'

import '#/styles.css'

const root = document.getElementById('root')

if (!root) {
    throw new Error('Root element not found')
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: shouldRetryQuery,
            /* 本機後端，退避不需要拉到預設的 1s/2s/4s */
            retryDelay: attempt => Math.min(400 * 2 ** attempt, 2_000),
        },
    },
})

render(
    () => (
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    ),
    root,
)
