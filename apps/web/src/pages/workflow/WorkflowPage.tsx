import { WorkflowDetail } from '#/pages/workflow/components/config/WorkflowDetail'
import { GraphPanel } from '#/pages/workflow/components/graph/GraphPanel'
import { WorkflowList } from '#/pages/workflow/components/list/WorkflowList'
import { createWorkflowStore, WorkflowStoreProvider } from '#/pages/workflow/store'

export function WorkflowPage() {
    const store = createWorkflowStore()

    return (
        <WorkflowStoreProvider store={store}>
            {/* 低於 1180px 時整頁水平捲動，Detail 不被 App 的 overflow-hidden 裁掉 */}
            <div class='flex h-[calc(100dvh-48px)] min-h-0 overflow-x-auto overflow-y-hidden'>
                <div class='flex min-w-[1180px] flex-1'>
                    <WorkflowList />
                    <GraphPanel />
                    <WorkflowDetail />
                </div>
            </div>
        </WorkflowStoreProvider>
    )
}
