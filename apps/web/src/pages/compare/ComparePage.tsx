import { CompareDetail } from '#/pages/compare/components/CompareDetail'
import { CompareWorkspace } from '#/pages/compare/components/CompareWorkspace'

export function ComparePage() {
    return (
        <div class='flex min-h-0 flex-1 overflow-hidden'>
            <CompareWorkspace />
            <CompareDetail />
        </div>
    )
}
