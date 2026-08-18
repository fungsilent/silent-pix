import type { WorkflowSelect } from '@silent-pix/db'

export type WorkflowModel = Omit<WorkflowSelect, 'createdAt' | 'updatedAt'> & {
    createdAt: Date
    updatedAt: Date
}

// Cast
export function castWorkflowModel(workflow: WorkflowSelect): WorkflowModel {
    return {
        ...workflow,
        createdAt: new Date(workflow.createdAt),
        updatedAt: new Date(workflow.updatedAt),
    }
}
