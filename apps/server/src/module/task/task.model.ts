import { parseTaskConfig } from '#/module/task/task.util'

import type { TaskImageSelect, TaskSelect, WorkflowSelect } from '@silent-pix/db'
import type { GenerateConfig } from '#/lib/comfy/comfy.prompt'

// Types
export type TaskModel = Omit<TaskSelect, 'config' | 'createdAt' | 'updatedAt'> & {
    config: GenerateConfig
    createdAt: Date
    updatedAt: Date
}

export type TaskImageModel = TaskImageSelect

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

export function castTaskModel(task: TaskSelect): TaskModel {
    return {
        ...task,
        config: parseTaskConfig(task.config),
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
    }
}

export function castTaskImageModel(image: TaskImageSelect): TaskImageModel
export function castTaskImageModel(image: TaskImageSelect[]): TaskImageModel[]
export function castTaskImageModel(image: TaskImageSelect | TaskImageSelect[]): TaskImageModel | TaskImageModel[] {
    return image
}
