import { workflowKeys } from '#/features/workflow/workflow.key'

import type { WorkflowApi } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

type WorkflowList = WorkflowApi.GetWorkflowsResponse
type WorkflowSummary = WorkflowApi.WorkflowSummary

export function cacheWorkflowSaved(
    queryClient: QueryClient,
    workflow: WorkflowApi.GetWorkflowResponse,
): void {
    queryClient.setQueryData<WorkflowApi.GetWorkflowResponse>(
        workflowKeys.detail({ workflowId: workflow.id }),
        workflow,
    )
    applyWorkflowSummary(queryClient, toSummary(workflow))
}

export function cacheWorkflowRemoved(
    queryClient: QueryClient,
    result: WorkflowApi.DeleteWorkflowResponse,
): void {
    if (result.disposition === 'deleted') {
        applyWorkflowRemoved(queryClient, result.id)

        return
    }

    const summary = result.workflow

    if (!summary) {
        return
    }

    queryClient.setQueryData<WorkflowApi.GetWorkflowResponse>(
        workflowKeys.detail({ workflowId: summary.id }),
        current => current
            ? { ...current, archivedAt: summary.archivedAt, revision: summary.revision }
            : current,
    )
    applyWorkflowSummary(queryClient, summary)
}

/* 一個結果一個 idempotent 函式，mutation 與 WebSocket 事件共用 */
export function applyWorkflowSummary(
    queryClient: QueryClient,
    summary: WorkflowSummary,
): void {
    queryClient.setQueryData<WorkflowList>(workflowKeys.list(), current => {
        if (!current) {
            return current
        }

        const rest = current.options.filter(option => option.id !== summary.id)
        const index = rest.findIndex(option => comesBefore(summary, option))
        const at = index < 0 ? rest.length : index

        return { options: [...rest.slice(0, at), summary, ...rest.slice(at)] }
    })
}

export function applyWorkflowRemoved(
    queryClient: QueryClient,
    workflowId: string,
): void {
    queryClient.removeQueries({ queryKey: workflowKeys.detail({ workflowId }) })
    queryClient.setQueryData<WorkflowList>(workflowKeys.list(), current => {
        if (!current) {
            return current
        }

        const options = current.options.filter(option => option.id !== workflowId)

        return options.length === current.options.length
            ? current
            : { options }
    })
}

export function isCachedWorkflowCurrent(
    queryClient: QueryClient,
    summary: WorkflowSummary,
): boolean {
    const current = queryClient.getQueryData<WorkflowApi.GetWorkflowResponse>(
        workflowKeys.detail({ workflowId: summary.id }),
    )

    if (!current) {
        return true
    }

    return current.name === summary.name
        && current.revision === summary.revision
        && current.archivedAt === summary.archivedAt
}

function toSummary(workflow: WorkflowApi.GetWorkflowResponse): WorkflowSummary {
    return {
        id: workflow.id,
        name: workflow.name,
        revision: workflow.revision,
        archivedAt: workflow.archivedAt,
    }
}

function comesBefore(summary: WorkflowSummary, other: WorkflowSummary): boolean {
    return summary.name === other.name
        ? summary.id < other.id
        : summary.name < other.name
}
