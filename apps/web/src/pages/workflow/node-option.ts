import { comfy } from '@silent-pix/shared'

import type { Comfy } from '@silent-pix/shared'

export type WorkflowNodeOption = {
    nodeId: string
    label: string
    inputs: readonly string[]
}

export function toNodeOptions(graph: Comfy.Graph): WorkflowNodeOption[] {
    return Object.entries(graph).map(([nodeId, target]) => ({
        nodeId,
        label: target._meta?.title?.trim() || target.class_type,
        inputs: Object.entries(target.inputs)
            .filter(([, value]) => !comfy.isGraphLink(value))
            .map(([input]) => input),
    }))
}
