import {
    applyWorkflowRemoved,
    applyWorkflowSummary,
    isCachedWorkflowCurrent,
} from '#/features/workflow/workflow.cache'
import { workflowKeys } from '#/features/workflow/workflow.key'

import type { Event } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

/*
 * 別人存了一份，或某一筆被封存。summary 足以就地更新清單，不必重抓。
 * detail 需要 graph／configSchema，事件沒帶——只有本地那份確實落後時才
 * invalidate，自己剛存完收到的回音因此不會多打一次。
 */
export function handleWorkflowChanged(
    queryClient: QueryClient,
    event: Event.Workflow.Changed,
): void {
    applyWorkflowSummary(queryClient, event.workflow)

    if (isCachedWorkflowCurrent(queryClient, event.workflow)) {
        return
    }

    void queryClient.invalidateQueries({
        queryKey: workflowKeys.detail({ workflowId: event.workflow.id }),
    })
}

export function handleWorkflowRemoved(
    queryClient: QueryClient,
    event: Event.Workflow.Removed,
): void {
    applyWorkflowRemoved(queryClient, event.workflowId)
}
