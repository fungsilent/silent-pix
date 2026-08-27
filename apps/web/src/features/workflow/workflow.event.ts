import { workflowKeys } from '#/features/workflow/workflow.key'

import type { Event } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

/*
 * 別人存了一份。清單一定要重抓，detail 只有正在看的那筆會真的重抓——
 * 其餘的 invalidate 到下次 mount 才生效。
 * 本地的存檔已經把回應寫進快取，這裡重抓拿到的是同一份。
 */
export function handleWorkflowChanged(
    queryClient: QueryClient,
    event: Event.Workflow.Changed,
): void {
    void queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
    void queryClient.invalidateQueries({
        queryKey: workflowKeys.detail({ workflowId: event.workflow.id }),
    })
}

export function handleWorkflowRemoved(
    queryClient: QueryClient,
    event: Event.Workflow.Removed,
): void {
    void queryClient.invalidateQueries({ queryKey: workflowKeys.lists() })
    queryClient.removeQueries({
        queryKey: workflowKeys.detail({ workflowId: event.workflowId }),
    })
}
