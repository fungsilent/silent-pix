import type { Event } from '@silent-pix/shared'
import type { WorkflowModel } from '#/module/workflow/workflow.model'

export function workflowChanged(workflow: WorkflowModel): Event.Workflow.Changed {
    return {
        type: 'workflow.changed',
        workflow: {
            id: workflow.id,
            name: workflow.name,
            revision: workflow.revision,
            archivedAt: workflow.archivedAt?.toISOString() ?? null,
        },
    }
}

export function workflowRemoved(workflowId: string): Event.Workflow.Removed {
    return {
        type: 'workflow.removed',
        workflowId,
    }
}
