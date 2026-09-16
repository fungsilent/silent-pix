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

    const queryKey = workflowKeys.detail({ workflowId: summary.id })

    queryClient.setQueryData<WorkflowApi.GetWorkflowResponse>(
        queryKey,
        current => current
            ? { ...current, archivedAt: summary.archivedAt, revision: summary.revision }
            : current,
    )
    applyWorkflowSummary(queryClient, summary)

    void queryClient.invalidateQueries({ queryKey })
}

export function applyWorkflowSummary(
    queryClient: QueryClient,
    summary: WorkflowSummary,
): void {
    queryClient.setQueryData<WorkflowList>(workflowKeys.list(), current => {
        if (!current) {
            return current
        }

        const options = current.options
            .filter(option => option.id !== summary.id)
            .concat(summary)
            .sort(compareWorkflowSummary)

        return { options }
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

function compareWorkflowSummary(
    left: WorkflowSummary,
    right: WorkflowSummary,
): number {
    if (left.name !== right.name) {
        return left.name < right.name ? -1 : 1
    }

    if (left.id === right.id) {
        return 0
    }

    return left.id < right.id ? -1 : 1
}
