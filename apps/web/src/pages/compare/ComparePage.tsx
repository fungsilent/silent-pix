import { Show } from 'solid-js'

import { CompareDetail } from '#/pages/compare/components/CompareDetail'
import { CompareWorkspace } from '#/pages/compare/components/CompareWorkspace'
import { useCompareSession } from '#/pages/compare/state/session'

export function ComparePage() {
    const compareSession = useCompareSession()

    return (
        <div class='flex min-h-0 flex-1 gap-1 overflow-hidden'>
            <CompareWorkspace />
            <Show when={compareSession.visibleCompare().length > 0}>
                <CompareDetail />
            </Show>
        </div>
    )
}
