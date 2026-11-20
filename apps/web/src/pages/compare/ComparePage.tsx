import { Show } from 'solid-js'

import { CompareDetail } from '#/pages/compare/components/CompareDetail'
import { CompareWorkspace } from '#/pages/compare/components/CompareWorkspace'
import { compareStore } from '#/store/compare'

export function ComparePage() {
    return (
        <div class='flex min-h-0 flex-1 overflow-hidden'>
            <CompareWorkspace />
            <Show when={compareStore.visibleCompare().length > 0}>
                <CompareDetail />
            </Show>
        </div>
    )
}
