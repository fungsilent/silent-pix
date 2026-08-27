import { workflowKeys } from '#/features/workflow/workflow.key'

import type { WorkflowApi } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

/*
 * 存檔的 HTTP 回應就是最新真相，直接寫進 detail 快取。
 * 清單只帶 summary，兩個 scope 都可能受影響，交給 invalidate 重抓。
 */
export function cacheWorkflowSaved(
    queryClient: QueryClient,
    workflow: WorkflowApi.GetWorkflowResponse,
): void {
    queryClient.setQueryData<WorkflowApi.GetWorkflowResponse>(
        workflowKeys.detail({ workflowId: workflow.id }),
        workflow,
    )
    void queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
}
