import type { WorkflowSelect } from '@silent-pix/db'
import type { WorkflowApi } from '@silent-pix/shared'

export type WorkflowModel = Omit<WorkflowSelect, 'createdAt' | 'updatedAt' | 'archivedAt'> & {
    createdAt: Date
    updatedAt: Date
    archivedAt: Date | null
}

// Cast
export function castWorkflowModel(workflow: WorkflowSelect): WorkflowModel {
    return {
        ...workflow,
        createdAt: new Date(workflow.createdAt),
        updatedAt: new Date(workflow.updatedAt),
        archivedAt: workflow.archivedAt === null ? null : new Date(workflow.archivedAt),
    }
}

export function toWorkflowSummary(workflow: WorkflowModel): WorkflowApi.WorkflowSummary {
    return {
        id: workflow.id,
        name: workflow.name,
        revision: workflow.revision,
        archivedAt: workflow.archivedAt?.toISOString() ?? null,
    }
}
