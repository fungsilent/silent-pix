import { CompareDetail } from '#/pages/compare/components/CompareDetail'
import { CompareWorkspace } from '#/pages/compare/components/CompareWorkspace'

export function ComparePage() {
    return (
        <div class='flex h-[calc(100dvh-48px)] min-h-0 overflow-hidden'>
            <CompareWorkspace />
            <CompareDetail />
        </div>
    )
}
