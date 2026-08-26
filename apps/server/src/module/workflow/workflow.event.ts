import type { Event } from '@silent-pix/shared'

export function workflowChanged(workflow: Event.Workflow.Changed['workflow']): Event.Workflow.Changed {
    return {
        type: 'workflow.changed',
        workflow,
    }
}

export function workflowRemoved(workflowId: string): Event.Workflow.Removed {
    return {
        type: 'workflow.removed',
        workflowId,
    }
}
