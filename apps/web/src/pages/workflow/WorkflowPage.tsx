import { WorkflowDetail } from '#/pages/workflow/components/config/WorkflowDetail'
import { GraphPanel } from '#/pages/workflow/components/graph/GraphPanel'
import { WorkflowList } from '#/pages/workflow/components/list/WorkflowList'
import { createWorkflowStore, WorkflowStoreProvider } from '#/pages/workflow/store'

export function WorkflowPage() {
    const store = createWorkflowStore()

    return (
        <WorkflowStoreProvider store={store}>
            <div class='flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden'>
                <div class='flex min-w-[1180px] flex-1'>
                    <WorkflowList />
                    <GraphPanel />
                    <WorkflowDetail />
                </div>
            </div>
        </WorkflowStoreProvider>
    )
}
