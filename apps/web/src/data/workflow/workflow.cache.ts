import { workflowKeys } from '#/data/workflow/workflow.key'

import type { WorkflowApi } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

type WorkflowList = WorkflowApi.GetWorkflowsResponse
type WorkflowSummary = WorkflowApi.WorkflowSummary

export function updateSavedWorkflowCache(
    queryClient: QueryClient,
    workflow: WorkflowApi.GetWorkflowResponse,
): WorkflowApi.GetWorkflowResponse | null {
    const queryKey = workflowKeys.detail({ workflowId: workflow.id })
    if (queryClient.getQueryData(queryKey) === null) return null

    queryClient.setQueryData(queryKey, workflow)
    updateWorkflowSummaryCache(queryClient, toSummary(workflow))

    return workflow
}

export function updateArchivedOrDeletedWorkflowCache(
    queryClient: QueryClient,
    result: WorkflowApi.DeleteWorkflowResponse,
): void {
    if (result.disposition === 'deleted') {
        removeWorkflowCache(queryClient, result.id)

        return
    }

    const summary = result.workflow

    const queryKey = workflowKeys.detail({ workflowId: summary.id })

    queryClient.setQueryData<WorkflowApi.GetWorkflowResponse>(
        queryKey,
        current => current
            ? { ...current, archivedAt: summary.archivedAt, revision: summary.revision }
            : current,
    )
    updateWorkflowSummaryCache(queryClient, summary)

    void queryClient.invalidateQueries({ queryKey })
}

export function updateWorkflowSummaryCache(
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

export function removeWorkflowCache(
    queryClient: QueryClient,
    workflowId: string,
): void {
    const queryKey = workflowKeys.detail({ workflowId })
    void queryClient.cancelQueries({ queryKey, exact: true })
    queryClient.setQueryData(queryKey, null)
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

export function isWorkflowDetailCacheCurrent(
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
