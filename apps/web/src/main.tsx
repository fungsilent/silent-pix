import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { render } from 'solid-js/web'

import { App } from '#/App'

import '#/styles.css'

const root = document.getElementById('root')

if (!root) {
    throw new Error('Root element not found')
}

export const queryClient = new QueryClient()

render(
    () => (
        <QueryClientProvider client={queryClient}>
            <App />
        </QueryClientProvider>
    ),
    root,
)
