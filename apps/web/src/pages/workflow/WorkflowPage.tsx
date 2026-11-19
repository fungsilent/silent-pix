import { WorkflowDetail } from '#/pages/workflow/components/config/WorkflowDetail'
import { GraphPanel } from '#/pages/workflow/components/graph/GraphPanel'
import { WorkflowList } from '#/pages/workflow/components/list/WorkflowList'
import { WorkflowPageStateProvider } from '#/pages/workflow/store'

export function WorkflowPage() {
    return (
        <WorkflowPageStateProvider>
            <div class='flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden'>
                <div class='flex min-w-[1180px] flex-1'>
                    <WorkflowList />
                    <GraphPanel />
                    <WorkflowDetail />
                </div>
            </div>
        </WorkflowPageStateProvider>
    )
}
