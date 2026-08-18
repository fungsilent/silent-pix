import { taskApi } from '@silent-pix/shared'

import type { ImageSelect, TaskImageSelect, TaskSelect } from '@silent-pix/db'
import type { GenerateConfig } from '#/lib/comfy/comfy.prompt'

// Types
export type TaskModel = Omit<TaskSelect, 'config' | 'createdAt' | 'updatedAt'> & {
    config: GenerateConfig
    createdAt: Date
    updatedAt: Date
}

export type TaskImageModel = TaskImageSelect & {
    image: ImageSelect
}

// Cast
export function castTaskModel(task: TaskSelect): TaskModel {
    return {
        ...task,
        config: taskApi.taskGenerateConfig.parse(task.config),
        createdAt: new Date(task.createdAt),
        updatedAt: new Date(task.updatedAt),
    }
}
